// Development store: keeps users, groups and chat in memory and persists
// them to a JSON file with atomic, debounced writes. Not meant for
// multiple instances.
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const MAX_MESSAGES = 500; // kept per group

class FileStore {
  constructor(dir) {
    this.file = path.join(dir, 'users.json');
    this.users = new Map();
    this.byPhone = new Map();
    this.byUsername = new Map();
    this.groups = new Map();      // id -> group
    this.memberships = new Map();     // groupId -> Map(playerId -> {role, joinedAt})
    this.invites = new Map();     // id -> invite
    this.messages = new Map();    // groupId -> [message]
    this.nextId = 1;
    this.next = { group: 1, invite: 1, message: 1 };
    this.timer = null;
  }

  async init() {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    try {
      const data = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      data.users.forEach((u) => this.index(u));
      this.nextId = data.nextId || this.users.size + 1;
      (data.groups || []).forEach((g) => this.groups.set(g.id, g));
      (data.members || []).forEach((m) => this.memberMap(m.groupId).set(m.playerId, { role: m.role, joinedAt: m.joinedAt }));
      (data.invites || []).forEach((i) => this.invites.set(i.id, i));
      (data.messages || []).forEach((m) => this.messageList(m.groupId).push(m));
      Object.assign(this.next, data.next || {});
    } catch (e) {
      if (e.code !== 'ENOENT') throw e;
    }
    this.kind = 'file';
  }

  index(u) {
    this.users.set(u.id, u);
    this.byPhone.set(u.phone, u);
    if (u.username) this.byUsername.set(u.username, u);
  }
  memberMap(gid) {
    if (!this.memberships.has(gid)) this.memberships.set(gid, new Map());
    return this.memberships.get(gid);
  }
  messageList(gid) {
    if (!this.messages.has(gid)) this.messages.set(gid, []);
    return this.messages.get(gid);
  }

  snapshot() {
    const members = [];
    this.memberships.forEach((m, groupId) => m.forEach((v, playerId) => members.push({ groupId, playerId, role: v.role, joinedAt: v.joinedAt })));
    const messages = [];
    this.messages.forEach((list) => list.forEach((m) => messages.push(m)));
    return JSON.stringify({
      nextId: this.nextId, next: this.next, users: [...this.users.values()],
      groups: [...this.groups.values()], members, invites: [...this.invites.values()], messages
    });
  }
  persist() {
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      const tmp = this.file + '.tmp';
      fs.writeFileSync(tmp, this.snapshot());
      fs.renameSync(tmp, this.file);
    }, 500);
  }
  flush() {
    if (!this.timer) return;
    clearTimeout(this.timer);
    this.timer = null;
    fs.writeFileSync(this.file, this.snapshot());
  }

  // -------------------------------------------------------------- players
  async createUser({ name, username, phone, passHash }) {
    if (this.byPhone.has(phone)) { const e = new Error('phone taken'); e.code = 'PHONE_TAKEN'; throw e; }
    if (username && this.byUsername.has(username)) { const e = new Error('username taken'); e.code = 'USERNAME_TAKEN'; throw e; }
    const now = new Date().toISOString();
    const u = { id: this.nextId++, name, username: username || null, phone, passHash, createdAt: now, lastLogin: now, character: null, progress: null };
    this.index(u);
    this.persist();
    return { ...u };
  }

  async findByPhone(phone) { const u = this.byPhone.get(phone); return u ? { ...u } : null; }
  async findByUsername(username) { const u = this.byUsername.get(username); return u ? { ...u } : null; }
  async findById(id) { const u = this.users.get(Number(id)); return u ? { ...u } : null; }
  async findManyByIds(ids) { return ids.map((id) => this.users.get(Number(id))).filter(Boolean).map((u) => ({ ...u })); }

  async updateUser(id, patch) {
    const u = this.users.get(Number(id));
    if (!u) return null;
    if (patch.username !== undefined && patch.username !== u.username) {
      if (this.byUsername.has(patch.username)) { const e = new Error('username taken'); e.code = 'USERNAME_TAKEN'; throw e; }
      if (u.username) this.byUsername.delete(u.username);
      u.username = patch.username;
      this.byUsername.set(u.username, u);
    }
    ['name', 'character', 'progress', 'lastLogin'].forEach((k) => { if (patch[k] !== undefined) u[k] = patch[k]; });
    this.persist();
    return { ...u };
  }

  async searchPlayers(q, excludeId) {
    const out = [];
    for (const u of this.users.values()) {
      if (u.id === excludeId) continue;
      if ((u.username && u.username.startsWith(q)) || u.name.toLowerCase().includes(q)) out.push({ id: u.id, name: u.name, username: u.username });
      if (out.length >= 10) break;
    }
    return out;
  }

  async count() { return this.users.size; }

  // --------------------------------------------------------------- groups
  async createGroup({ name, visibility, description, ownerId }) {
    const g = { id: this.next.group++, name, visibility, description, ownerId, channelKey: crypto.randomBytes(16).toString('hex'), createdAt: new Date().toISOString() };
    this.groups.set(g.id, g);
    this.memberMap(g.id).set(ownerId, { role: 'owner', joinedAt: g.createdAt });
    this.persist();
    return { ...g };
  }
  async getGroup(id) { const g = this.groups.get(Number(id)); return g ? { ...g } : null; }
  async deleteGroup(id) {
    id = Number(id);
    this.groups.delete(id); this.memberships.delete(id); this.messages.delete(id);
    this.invites.forEach((i, k) => { if (i.groupId === id) this.invites.delete(k); });
    this.persist();
  }
  async setGroupOwner(gid, uid) {
    const g = this.groups.get(Number(gid));
    if (g) g.ownerId = uid;
    const m = this.memberMap(Number(gid)).get(uid);
    if (m) m.role = 'owner';
    this.persist();
  }
  lastMessageId(gid) { const l = this.messages.get(gid); return l && l.length ? l[l.length - 1].id : 0; }
  async myGroups(uid) {
    const out = [];
    this.memberships.forEach((m, gid) => {
      const me = m.get(uid);
      const g = this.groups.get(gid);
      if (me && g) out.push({ ...g, role: me.role, memberCount: m.size, lastMessageId: this.lastMessageId(gid) });
    });
    return out.sort((a, b) => a.name.localeCompare(b.name));
  }
  async publicGroups(q, uid) {
    const ql = (q || '').toLowerCase();
    return [...this.groups.values()]
      .filter((g) => g.visibility === 'public' && (!ql || g.name.toLowerCase().includes(ql)))
      .map((g) => ({ ...g, memberCount: this.memberMap(g.id).size, joined: this.memberMap(g.id).has(uid) }))
      .sort((a, b) => b.memberCount - a.memberCount || b.createdAt.localeCompare(a.createdAt))
      .slice(0, 30);
  }
  async members(gid) {
    const out = [];
    this.memberMap(Number(gid)).forEach((v, pid) => {
      const u = this.users.get(pid);
      if (u) out.push({ id: u.id, name: u.name, username: u.username, character: u.character, role: v.role, joinedAt: v.joinedAt });
    });
    return out.sort((a, b) => a.joinedAt.localeCompare(b.joinedAt));
  }
  async role(gid, uid) { const m = this.memberMap(Number(gid)).get(uid); return m ? m.role : null; }
  async addMember(gid, uid, role) {
    this.memberMap(Number(gid)).set(uid, { role: role || 'member', joinedAt: new Date().toISOString() });
    this.persist();
  }
  async removeMember(gid, uid) { this.memberMap(Number(gid)).delete(uid); this.persist(); }
  async memberCount(gid) { return this.memberMap(Number(gid)).size; }
  async countMemberships(uid) { let n = 0; this.memberships.forEach((m) => { if (m.has(uid)) n++; }); return n; }

  // -------------------------------------------------------------- invites
  async addInvite(gid, fromId, toId) {
    for (const i of this.invites.values()) if (i.groupId === gid && i.toId === toId) return { ...i };
    const inv = { id: this.next.invite++, groupId: gid, fromId, toId, createdAt: new Date().toISOString() };
    this.invites.set(inv.id, inv);
    this.persist();
    return { ...inv };
  }
  async findInvite(gid, toId) {
    for (const i of this.invites.values()) if (i.groupId === Number(gid) && i.toId === toId) return { ...i };
    return null;
  }
  async getInvite(id) { const i = this.invites.get(Number(id)); return i ? { ...i } : null; }
  async deleteInvite(id) { this.invites.delete(Number(id)); this.persist(); }
  async invitesFor(uid) {
    return [...this.invites.values()].filter((i) => i.toId === uid).sort((a, b) => b.id - a.id).slice(0, 30).map((i) => {
      const g = this.groups.get(i.groupId), f = this.users.get(i.fromId);
      return { id: i.id, createdAt: i.createdAt, group: g ? { id: g.id, name: g.name, visibility: g.visibility, description: g.description } : null, from: f ? { name: f.name, username: f.username } : null };
    }).filter((i) => i.group);
  }

  // ------------------------------------------------------------- messages
  async addMessage(gid, uid, text) {
    const u = this.users.get(uid);
    const m = { id: this.next.message++, groupId: Number(gid), userId: uid, name: u ? u.name : '', username: u ? u.username : '', text, at: new Date().toISOString() };
    const list = this.messageList(m.groupId);
    list.push(m);
    if (list.length > MAX_MESSAGES) list.splice(0, list.length - MAX_MESSAGES);
    this.persist();
    return { ...m };
  }
  async messagesOf(gid, after) {
    const list = this.messageList(Number(gid));
    const sel = after > 0 ? list.filter((m) => m.id > after) : list;
    return sel.slice(-50).map((m) => ({ ...m }));
  }

  async close() { this.flush(); }
}

module.exports = FileStore;
