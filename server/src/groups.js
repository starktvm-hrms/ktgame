// Groups (public / private), invitations and group chat. Same routes and
// responses as the Supabase `api` function:
//   GET  /api/groups                      POST /api/groups {name, visibility, description}
//   GET  /api/groups/public?q=            GET  /api/groups/:id   (details + members)
//   POST /api/groups/:id/join | leave     POST /api/groups/:id/invite {username}
//   POST /api/groups/:id/kick {userId}    (owner only)
//   GET  /api/groups/:id/messages?after=  POST /api/groups/:id/messages {text}
//   GET  /api/invites                     POST /api/invites/:id/accept | decline
// Chat messages are fetched by polling on this server; live voice and
// group presence need the Supabase Realtime backend.
'use strict';
const auth = require('./auth');

const MAX_GROUPS = 20; // memberships per player
const E = auth.AppError;

function groupOut(g, member, extra) {
  return Object.assign({
    id: g.id, name: g.name, description: g.description || '', visibility: g.visibility, ownerId: g.ownerId,
    memberCount: g.memberCount || 0, role: g.role || null, channel: member ? g.channelKey : undefined,
    lastMessageId: g.lastMessageId || 0, createdAt: g.createdAt
  }, extra || {});
}

function createGroupRoutes({ store, readBody, requireUser, limit }) {
  const checkLimit = async (uid) => {
    if ((await store.countMemberships(uid)) >= MAX_GROUPS) throw new E(400, 'TOO_MANY_GROUPS', 'You can be in at most ' + MAX_GROUPS + ' groups.');
  };
  const loadGroup = async (gid) => {
    const g = await store.getGroup(gid);
    if (!g) throw new E(404, 'NOT_FOUND', 'That group no longer exists.');
    return g;
  };

  const routes = {
    'GET /api/groups': async (req) => {
      const user = await requireUser(req);
      return [200, { groups: (await store.myGroups(user.id)).map((g) => groupOut(g, true)) }];
    },
    'POST /api/groups': async (req) => {
      const user = await requireUser(req);
      const b = await readBody(req);
      const name = auth.validateGroupName(b.name);
      if (!name) throw new E(400, 'BAD_GROUP_NAME', 'Group names are 3–30 letters, numbers or spaces.');
      const visibility = b.visibility === 'private' ? 'private' : 'public';
      const description = typeof b.description === 'string' ? b.description.trim().slice(0, 140) : '';
      await limit('grp:' + user.id, 10, 3600);
      await checkLimit(user.id);
      const g = await store.createGroup({ name, visibility, description, ownerId: user.id });
      return [201, { group: groupOut(Object.assign(g, { role: 'owner', memberCount: 1 }), true) }];
    },
    'GET /api/groups/public': async (req, url) => {
      const user = await requireUser(req);
      const q = (url.searchParams.get('q') || '').trim().slice(0, 30);
      return [200, { groups: (await store.publicGroups(q, user.id)).map((g) => groupOut(g, false, { joined: g.joined })) }];
    },
    'GET /api/invites': async (req) => {
      const user = await requireUser(req);
      return [200, { invites: await store.invitesFor(user.id) }];
    }
  };

  async function groupRoute(req, url, gid, action) {
    const user = await requireUser(req);
    const g = await loadGroup(gid);
    const role = await store.role(gid, user.id);
    const m = req.method;
    if (m === 'GET' && action === '') {
      if (!role && g.visibility === 'private' && !(await store.findInvite(gid, user.id))) throw new E(404, 'NOT_FOUND', 'That group is private.');
      const members = await store.members(gid);
      return [200, { group: groupOut(Object.assign(g, { role, memberCount: members.length }), !!role), members }];
    }
    if (m === 'POST' && action === 'join') {
      if (!role) {
        if (g.visibility === 'private' && !(await store.findInvite(gid, user.id))) throw new E(403, 'INVITE_ONLY', 'This is a private group. Ask a member to invite you.');
        await checkLimit(user.id);
        await store.addMember(gid, user.id, 'member');
        const inv = await store.findInvite(gid, user.id);
        if (inv) await store.deleteInvite(inv.id);
      }
      return [200, { group: groupOut(Object.assign(g, { role: role || 'member', memberCount: await store.memberCount(gid) }), true) }];
    }
    if (!role) throw new E(403, 'NOT_MEMBER', 'You are not a member of this group.');
    if (m === 'POST' && action === 'leave') {
      await store.removeMember(gid, user.id);
      if (role === 'owner') {
        // hand the group to the longest-standing member, or close it
        const rest = await store.members(gid);
        if (rest.length) await store.setGroupOwner(gid, rest[0].id);
        else await store.deleteGroup(gid);
      }
      return [200, { ok: true }];
    }
    if (m === 'POST' && action === 'invite') {
      const b = await readBody(req);
      const username = auth.validateUsername(b.username);
      if (!username) throw new E(400, 'BAD_USERNAME', auth.USERNAME_RULES);
      await limit('inv:' + user.id, 40, 3600);
      const to = await store.findByUsername(username);
      if (!to) throw new E(404, 'NO_PLAYER', 'No traveller has the username @' + username + '.');
      if (await store.role(gid, to.id)) throw new E(409, 'ALREADY_MEMBER', '@' + username + ' is already in this group.');
      await store.addInvite(gid, user.id, to.id);
      return [200, { ok: true, player: { id: to.id, name: to.name, username: to.username } }];
    }
    if (m === 'POST' && action === 'kick') {
      const b = await readBody(req);
      if (role !== 'owner') throw new E(403, 'NOT_OWNER', 'Only the group owner can remove members.');
      const target = Number(b.userId);
      if (!target || target === user.id) throw new E(400, 'BAD_USER', 'Choose a member to remove.');
      await store.removeMember(gid, target);
      return [200, { ok: true }];
    }
    if (m === 'GET' && action === 'messages') {
      return [200, { messages: await store.messagesOf(gid, Number(url.searchParams.get('after') || 0)) }];
    }
    if (m === 'POST' && action === 'messages') {
      const b = await readBody(req);
      const text = typeof b.text === 'string' ? b.text.trim().slice(0, 300) : '';
      if (!text) throw new E(400, 'EMPTY', 'Type a message first.');
      await limit('msg:' + user.id, 30, 60);
      return [201, { message: await store.addMessage(gid, user.id, text) }];
    }
    throw new E(404, 'NOT_FOUND', 'Unknown endpoint');
  }

  async function inviteRoute(req, id, action) {
    const user = await requireUser(req);
    const inv = await store.getInvite(id);
    if (!inv || inv.toId !== user.id) throw new E(404, 'NOT_FOUND', 'That invitation is no longer available.');
    if (action === 'decline') {
      await store.deleteInvite(id);
      return [200, { ok: true }];
    }
    const g = await loadGroup(inv.groupId);
    if (!(await store.role(g.id, user.id))) {
      await checkLimit(user.id);
      await store.addMember(g.id, user.id, 'member');
    }
    await store.deleteInvite(id);
    return [200, { group: groupOut(Object.assign(g, { role: 'member', memberCount: await store.memberCount(g.id) }), true) }];
  }

  // Returns [status, body] for group / invite URLs, or null for other paths.
  return async function handle(req, url) {
    const p = url.pathname;
    const gm = p.match(/^\/api\/groups\/(\d{1,15})(?:\/(join|leave|invite|kick|messages))?$/);
    if (gm) return groupRoute(req, url, Number(gm[1]), gm[2] || '');
    const im = p.match(/^\/api\/invites\/(\d{1,15})\/(accept|decline)$/);
    if (im && req.method === 'POST') return inviteRoute(req, Number(im[1]), im[2]);
    const route = routes[req.method + ' ' + p];
    return route ? route(req, url) : null;
  };
}

module.exports = { createGroupRoutes };
