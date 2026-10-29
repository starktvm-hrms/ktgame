// Kerala Explorer accounts API on Supabase Edge Functions. Same routes and
// responses as the Node server (server/src/http.js), so the game client
// works with either backend:
//
//   POST /api/register  {name, username, phone, password, remember} -> {token, user}
//   POST /api/login     {phone, password, remember}       -> {token, user}
//   GET  /api/me                                           -> {user}
//   PUT  /api/me        {name?, username?, character?}     -> {user}
//   PUT  /api/progress  {progress}                         -> {ok}
//   POST /api/ping                                         -> {online}
//   GET  /api/profile/:id                                  -> {profile}
//   GET  /api/players/search?q=                            -> {players}
//   GET  /api/health                                       -> {ok, online, players}
// Groups (public / private), invitations and chat:
//   GET  /api/groups                      my groups      POST /api/groups {name, visibility, description}
//   GET  /api/groups/public?q=            browse         GET  /api/groups/:id  details + members
//   POST /api/groups/:id/join | leave     POST /api/groups/:id/invite {username}
//   POST /api/groups/:id/kick {userId}    (owner)
//   GET  /api/groups/:id/messages?after=  POST /api/groups/:id/messages {text}
//   GET  /api/invites                     POST /api/invites/:id/accept | decline
//
// Deployed with verify_jwt = false: requests carry the game's own signed
// session token, checked below.
import { createClient } from 'npm:@supabase/supabase-js@2.117.3';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

const TTL_LONG = 30 * 24 * 3600; // "remember me"
const TTL_SHORT = 12 * 3600;
const PBKDF2_ITER = 150000;
const ONLINE_WINDOW = 120; // seconds since the last ping
const DISTRICT_IDS = ['tvm', 'klm', 'pta', 'alp', 'ktm', 'idk', 'ekm', 'tsr', 'pkd', 'mlp', 'kkd', 'wyd', 'knr', 'ksd'];
const VEHICLE_IDS = ['bicycle', 'auto', 'scooter', 'car'];
const MAX_GROUPS = 20; // memberships per player

class AppError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}

// ------------------------------------------------------------- helpers
const enc = new TextEncoder();
const b64url = (buf: ArrayBuffer | Uint8Array) => {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  bytes.forEach((b) => { s += String.fromCharCode(b); });
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const fromB64url = (s: string) => {
  const b = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
};
function safeEqual(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a[i] ^ b[i];
  return d === 0;
}

// token signing key: KT_AUTH_SECRET if set, else derived from the service key
let hmacKey: CryptoKey | null = null;
async function getHmacKey() {
  if (hmacKey) return hmacKey;
  const secret = Deno.env.get('KT_AUTH_SECRET') || 'kt-session-v1|' + SERVICE_KEY;
  const raw = await crypto.subtle.digest('SHA-256', enc.encode(secret));
  hmacKey = await crypto.subtle.importKey('raw', raw, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
  return hmacKey;
}
async function issueToken(uid: number, remember: boolean) {
  const body = b64url(enc.encode(JSON.stringify({ uid, exp: Math.floor(Date.now() / 1000) + (remember ? TTL_LONG : TTL_SHORT), rm: remember ? 1 : 0 })));
  const sig = await crypto.subtle.sign('HMAC', await getHmacKey(), enc.encode(body));
  return body + '.' + b64url(sig);
}
async function verifyToken(token: string) {
  if (!token || token.length > 512) return null;
  const dot = token.indexOf('.');
  if (dot < 1) return null;
  const body = token.slice(0, dot);
  try {
    const ok = await crypto.subtle.verify('HMAC', await getHmacKey(), fromB64url(token.slice(dot + 1)), enc.encode(body));
    if (!ok) return null;
    const p = JSON.parse(new TextDecoder().decode(fromB64url(body)));
    if (!p.uid || !p.exp || p.exp < Date.now() / 1000) return null;
    return p as { uid: number };
  } catch (_e) {
    return null;
  }
}

async function pbkdf2(password: string, salt: Uint8Array, iter: number) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iter }, key, 256));
}
async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return ['pbkdf2', PBKDF2_ITER, b64url(salt), b64url(await pbkdf2(password, salt, PBKDF2_ITER))].join('$');
}
async function verifyPassword(password: string, stored: string) {
  const [kind, iter, salt, key] = (stored || '').split('$');
  if (kind !== 'pbkdf2') return false;
  return safeEqual(await pbkdf2(password, fromB64url(salt), parseInt(iter, 10)), fromB64url(key));
}

function normalizePhone(input: unknown) {
  if (typeof input !== 'string') return null;
  const raw = input.replace(/[\s\-().]/g, '');
  let m = raw.match(/^(?:\+?91|0)?([6-9]\d{9})$/);
  if (m) return '+91' + m[1];
  m = raw.match(/^\+([1-9]\d{7,14})$/);
  return m ? '+' + m[1] : null;
}
function validateName(input: unknown) {
  if (typeof input !== 'string') return null;
  const name = input.trim().replace(/\s+/g, ' ');
  return /^[\p{L}\p{M}\p{N} .'_-]{2,24}$/u.test(name) ? name : null;
}
// usernames: 3-20 characters, a letter first, then letters, digits, _ or .
function validateUsername(input: unknown) {
  if (typeof input !== 'string') return null;
  const u = input.trim().replace(/^@/, '').toLowerCase();
  return /^[a-z][a-z0-9_.]{2,19}$/.test(u) ? u : null;
}
function validateGroupName(input: unknown) {
  if (typeof input !== 'string') return null;
  const n = input.trim().replace(/\s+/g, ' ');
  return /^[\p{L}\p{M}\p{N} .'&!_-]{3,30}$/u.test(n) ? n : null;
}
const validPassword = (pw: unknown) => typeof pw === 'string' && pw.length >= 6 && pw.length <= 128;
function maskPhone(phone: string) {
  if (!phone) return '';
  const head = phone.startsWith('+91') ? '+91 ' + phone.slice(3, 5) : phone.slice(0, 4);
  return head + '•••••' + phone.slice(-3);
}
function cleanCharacter(c: any) {
  if (!c || typeof c !== 'object') return null;
  const pick = (v: unknown, ok: RegExp) => (typeof v === 'string' && v.length < 24 && ok.test(v) ? v : undefined);
  const out: any = { gender: c.gender === 'female' ? 'female' : 'male', outfit: pick(c.outfit, /^[a-z]+$/), hair: pick(c.hair, /^[a-z]+$/), acc: {} };
  if (c.acc && typeof c.acc === 'object') ['backpack', 'camera', 'hat', 'sunglasses'].forEach((k) => { out.acc[k] = !!c.acc[k]; });
  return out;
}
const num = (v: unknown, max: number) => { const n = Number(v); return Number.isFinite(n) ? Math.max(0, Math.min(max, Math.floor(n))) : 0; };

function publicUser(u: any, self: boolean) {
  const p = u.progress || {};
  const out: any = {
    id: u.id,
    name: u.name,
    username: u.username || null,
    memberSince: u.created_at,
    character: u.character || null,
    stats: {
      level: num(p.level, 999) || 1,
      xp: num(p.xp, 1e9),
      coins: num(p.coins, 1e9),
      stars: Array.isArray(p.stars) ? p.stars.length : 0,
      leaves: num(p.leaves, 1e6),
      districts: Array.isArray(p.districts) ? DISTRICT_IDS.filter((d) => p.districts.includes(d)) : [],
      distanceKm: num(Math.round(p.distanceKm), 1e7),
      playTime: num(Math.round(p.playTime), 1e9),
      photos: Array.isArray(p.photos) ? p.photos.length : 0,
      missions: num(p.mission, 100),
      fish: num(p.fish && p.fish.total, 1e7),
      vehicles: Array.isArray(p.vehicles) ? VEHICLE_IDS.filter((v) => p.vehicles.includes(v)).length : 0
    }
  };
  if (self) {
    out.phone = maskPhone(u.phone);
    out.lastLogin = u.last_login;
    out.progress = u.progress || null;
  }
  return out;
}

// ------------------------------------------------------------- database
const COLS = 'id, name, username, phone, pass_hash, created_at, last_login, character, progress';
async function findBy(col: string, val: unknown) {
  const { data, error } = await db.from('players').select(COLS).eq(col, val).maybeSingle();
  if (error) throw error;
  return data;
}
async function update(id: number, patch: Record<string, unknown>) {
  const { data, error } = await db.from('players').update(patch).eq('id', id).select(COLS).single();
  if (error) throw error;
  return data;
}
async function limit(key: string, max: number, windowSec: number) {
  const { data, error } = await db.rpc('kt_rate_hit', { p_key: key, p_window: windowSec });
  if (error) throw error;
  if (data > max) throw new AppError(429, 'RATE_LIMIT', 'Too many attempts. Please wait a few minutes and try again.');
}
async function online() {
  const { data } = await db.rpc('kt_online', { p_secs: ONLINE_WINDOW });
  return data || 0;
}
async function requireUser(req: Request) {
  const h = req.headers.get('authorization') || '';
  const tok = await verifyToken(h.startsWith('Bearer ') ? h.slice(7) : '');
  if (!tok) throw new AppError(401, 'UNAUTHORIZED', 'Please sign in again.');
  const user = await findBy('id', tok.uid);
  if (!user) throw new AppError(401, 'UNAUTHORIZED', 'Account not found.');
  return user;
}
async function readBody(req: Request) {
  const text = await req.text();
  if (text.length > 64 * 1024) throw new AppError(413, 'TOO_LARGE', 'Request too large');
  if (!text) return {};
  try { return JSON.parse(text); } catch (_e) { throw new AppError(400, 'BAD_JSON', 'Invalid JSON'); }
}
const ipOf = (req: Request) => (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';

// ---------------------------------------------------------------- routes
type Route = (req: Request) => Promise<[number, unknown]>;
const routes: Record<string, Route> = {
  'POST /api/register': async (req) => {
    const b = await readBody(req);
    await limit('reg:' + ipOf(req), 20, 3600);
    const name = validateName(b.name);
    const phone = normalizePhone(b.phone);
    const username = validateUsername(b.username);
    if (!name) throw new AppError(400, 'BAD_NAME', 'Name must be 2–24 letters or numbers.');
    if (!username) throw new AppError(400, 'BAD_USERNAME', USERNAME_RULES);
    if (!phone) throw new AppError(400, 'BAD_PHONE', 'Enter a valid mobile number (e.g. 98765 43210).');
    if (!validPassword(b.password)) throw new AppError(400, 'BAD_PASSWORD', 'Password must be at least 6 characters.');
    const { data, error } = await db.from('players').insert({ name, username, phone, pass_hash: await hashPassword(b.password) }).select(COLS).single();
    if (error) {
      if (error.code === '23505') throw uniqueError(error);
      throw error;
    }
    return [201, { token: await issueToken(data.id, !!b.remember), user: publicUser(data, true) }];
  },
  'POST /api/login': async (req) => {
    const b = await readBody(req);
    const phone = normalizePhone(b.phone);
    await limit('login:' + ipOf(req), 60, 900);
    if (!phone || typeof b.password !== 'string') throw new AppError(400, 'BAD_LOGIN', 'Enter your phone number and password.');
    await limit('login:' + phone, 10, 900);
    const user = await findBy('phone', phone);
    if (!user || !(await verifyPassword(b.password, user.pass_hash))) throw new AppError(401, 'BAD_LOGIN', 'Phone number or password is incorrect.');
    const updated = await update(user.id, { last_login: new Date().toISOString() });
    return [200, { token: await issueToken(user.id, !!b.remember), user: publicUser(updated, true) }];
  },
  'GET /api/me': async (req) => [200, { user: publicUser(await requireUser(req), true) }],
  'PUT /api/me': async (req) => {
    const user = await requireUser(req);
    const b = await readBody(req);
    const patch: Record<string, unknown> = {};
    if (b.name !== undefined) {
      const name = validateName(b.name);
      if (!name) throw new AppError(400, 'BAD_NAME', 'Name must be 2–24 letters or numbers.');
      patch.name = name;
    }
    if (b.username !== undefined && b.username !== user.username) {
      const username = validateUsername(b.username);
      if (!username) throw new AppError(400, 'BAD_USERNAME', USERNAME_RULES);
      patch.username = username;
    }
    if (b.character !== undefined) patch.character = cleanCharacter(b.character);
    if (!Object.keys(patch).length) return [200, { user: publicUser(user, true) }];
    const { data, error } = await db.from('players').update(patch).eq('id', user.id).select(COLS).single();
    if (error) { if (error.code === '23505') throw uniqueError(error); throw error; }
    return [200, { user: publicUser(data, true) }];
  },
  'GET /api/players/search': async (req) => {
    const user = await requireUser(req);
    const q = (new URL(req.url).searchParams.get('q') || '').trim().replace(/^@/, '').toLowerCase().replace(/[%_,()]/g, '');
    if (q.length < 2) return [200, { players: [] }];
    const { data, error } = await db.from('players').select('id, name, username').or('username.ilike.' + q + '%,name.ilike.%' + q + '%').neq('id', user.id).limit(10);
    if (error) throw error;
    return [200, { players: data.map((p) => ({ id: p.id, name: p.name, username: p.username })) }];
  },

  // ------------------------------------------------------------ groups
  'GET /api/groups': async (req) => {
    const user = await requireUser(req);
    const { data, error } = await db.rpc('kt_my_groups', { p_uid: user.id });
    if (error) throw error;
    return [200, { groups: data.map((g: any) => groupOut(g, true)) }];
  },
  'POST /api/groups': async (req) => {
    const user = await requireUser(req);
    const b = await readBody(req);
    const name = validateGroupName(b.name);
    if (!name) throw new AppError(400, 'BAD_GROUP_NAME', 'Group names are 3–30 letters, numbers or spaces.');
    const visibility = b.visibility === 'private' ? 'private' : 'public';
    const description = typeof b.description === 'string' ? b.description.trim().slice(0, 140) : '';
    await limit('grp:' + user.id, 10, 3600);
    await checkGroupLimit(user.id);
    const { data: g, error } = await db.from('groups').insert({ name, visibility, description, owner_id: user.id }).select('*').single();
    if (error) throw error;
    await must(db.from('group_members').insert({ group_id: g.id, player_id: user.id, role: 'owner' }));
    return [201, { group: groupOut({ ...g, role: 'owner', member_count: 1 }, true) }];
  },
  'GET /api/groups/public': async (req) => {
    const user = await requireUser(req);
    const q = (new URL(req.url).searchParams.get('q') || '').trim().slice(0, 30);
    const { data, error } = await db.rpc('kt_public_groups', { p_q: q, p_uid: user.id });
    if (error) throw error;
    return [200, { groups: data.map((g: any) => ({ ...groupOut(g, false), joined: g.joined })) }];
  },
  'GET /api/invites': async (req) => {
    const user = await requireUser(req);
    const { data, error } = await db.from('group_invites')
      .select('id, created_at, group:groups(id, name, visibility, description), from:players!group_invites_from_id_fkey(name, username)')
      .eq('to_id', user.id).order('id', { ascending: false }).limit(30);
    if (error) throw error;
    return [200, { invites: data.map((i: any) => ({ id: i.id, createdAt: i.created_at, group: i.group, from: i.from })) }];
  },
  'PUT /api/progress': async (req) => {
    const user = await requireUser(req);
    const b = await readBody(req);
    if (!b.progress || typeof b.progress !== 'object') throw new AppError(400, 'BAD_PROGRESS', 'Missing progress');
    await update(user.id, { progress: b.progress, last_seen: new Date().toISOString() });
    return [200, { ok: true }];
  },
  'POST /api/ping': async (req) => {
    const user = await requireUser(req);
    await db.from('players').update({ last_seen: new Date().toISOString() }).eq('id', user.id);
    return [200, { online: await online() }];
  },
  'GET /api/health': async () => {
    const { count } = await db.from('players').select('id', { count: 'estimated', head: true });
    return [200, { ok: true, online: await online(), players: count || 0, store: 'supabase', bus: 'supabase-realtime' }];
  }
};

const USERNAME_RULES = 'Usernames are 3–20 characters: a letter first, then letters, numbers, _ or .';
function uniqueError(error: any) {
  const text = (error.message || '') + ' ' + (error.details || '');
  if (/username/.test(text)) return new AppError(409, 'USERNAME_TAKEN', 'That username is taken. Please choose another.');
  return new AppError(409, 'PHONE_TAKEN', 'This phone number is already registered. Please log in.');
}
async function must(q: any) {
  const { data, error } = await q;
  if (error) throw error;
  return data;
}
function groupOut(g: any, member: boolean) {
  return {
    id: Number(g.id), name: g.name, description: g.description || '', visibility: g.visibility,
    ownerId: Number(g.owner_id), memberCount: Number(g.member_count || 0), role: g.role || null,
    channel: member ? g.channel_key : undefined, lastMessageId: Number(g.last_message_id || 0), createdAt: g.created_at
  };
}
async function roleIn(gid: number, uid: number) {
  const { data, error } = await db.from('group_members').select('role').eq('group_id', gid).eq('player_id', uid).maybeSingle();
  if (error) throw error;
  return data ? data.role : null;
}
async function loadGroup(gid: number) {
  const { data, error } = await db.from('groups').select('*').eq('id', gid).maybeSingle();
  if (error) throw error;
  if (!data) throw new AppError(404, 'NOT_FOUND', 'That group no longer exists.');
  return data;
}
async function checkGroupLimit(uid: number) {
  const { count } = await db.from('group_members').select('group_id', { count: 'exact', head: true }).eq('player_id', uid);
  if ((count || 0) >= MAX_GROUPS) throw new AppError(400, 'TOO_MANY_GROUPS', 'You can be in at most ' + MAX_GROUPS + ' groups.');
}
async function memberCount(gid: number) {
  const { count } = await db.from('group_members').select('player_id', { count: 'exact', head: true }).eq('group_id', gid);
  return count || 0;
}
const MSG_COLS = 'id, text, created_at, player_id, players(name, username)';
const msgOut = (m: any) => ({ id: Number(m.id), userId: Number(m.player_id), name: m.players ? m.players.name : '', username: m.players ? m.players.username : '', text: m.text, at: m.created_at });

// /api/groups/:id/... and /api/invites/:id/...
async function groupRoute(req: Request, gid: number, action: string): Promise<[number, unknown]> {
  const user = await requireUser(req);
  const g = await loadGroup(gid);
  const role = await roleIn(gid, user.id);
  const method = req.method;
  if (method === 'GET' && action === '') {
    let invited = false;
    if (!role && g.visibility === 'private') {
      const { data } = await db.from('group_invites').select('id').eq('group_id', gid).eq('to_id', user.id).maybeSingle();
      invited = !!data;
      if (!invited) throw new AppError(404, 'NOT_FOUND', 'That group is private.');
    }
    const { data: mem, error } = await db.from('group_members').select('role, joined_at, players(id, name, username, character)').eq('group_id', gid).order('joined_at');
    if (error) throw error;
    const members = mem.map((m: any) => ({ id: m.players.id, name: m.players.name, username: m.players.username, character: m.players.character, role: m.role }));
    return [200, { group: { ...groupOut({ ...g, role, member_count: members.length }, !!role) }, members }];
  }
  if (method === 'POST' && action === 'join') {
    if (role) return [200, { group: groupOut({ ...g, role, member_count: await memberCount(gid) }, true) }];
    if (g.visibility === 'private') {
      const { data } = await db.from('group_invites').select('id').eq('group_id', gid).eq('to_id', user.id).maybeSingle();
      if (!data) throw new AppError(403, 'INVITE_ONLY', 'This is a private group. Ask a member to invite you.');
    }
    await checkGroupLimit(user.id);
    await must(db.from('group_members').insert({ group_id: gid, player_id: user.id, role: 'member' }));
    await db.from('group_invites').delete().eq('group_id', gid).eq('to_id', user.id);
    return [200, { group: groupOut({ ...g, role: 'member', member_count: await memberCount(gid) }, true) }];
  }
  if (!role) throw new AppError(403, 'NOT_MEMBER', 'You are not a member of this group.');
  if (method === 'POST' && action === 'leave') {
    await must(db.from('group_members').delete().eq('group_id', gid).eq('player_id', user.id));
    if (role === 'owner') {
      // hand the group to the longest-standing member, or close it
      const { data: next } = await db.from('group_members').select('player_id').eq('group_id', gid).order('joined_at').limit(1).maybeSingle();
      if (next) {
        await must(db.from('group_members').update({ role: 'owner' }).eq('group_id', gid).eq('player_id', next.player_id));
        await must(db.from('groups').update({ owner_id: next.player_id }).eq('id', gid));
      } else await must(db.from('groups').delete().eq('id', gid));
    }
    return [200, { ok: true }];
  }
  if (method === 'POST' && action === 'invite') {
    const b = await readBody(req);
    const username = validateUsername(b.username);
    if (!username) throw new AppError(400, 'BAD_USERNAME', USERNAME_RULES);
    await limit('inv:' + user.id, 40, 3600);
    const { data: to } = await db.from('players').select('id, name, username').eq('username', username).maybeSingle();
    if (!to) throw new AppError(404, 'NO_PLAYER', 'No traveller has the username @' + username + '.');
    if (await roleIn(gid, to.id)) throw new AppError(409, 'ALREADY_MEMBER', '@' + username + ' is already in this group.');
    const { error } = await db.from('group_invites').upsert({ group_id: gid, from_id: user.id, to_id: to.id }, { onConflict: 'group_id,to_id', ignoreDuplicates: true });
    if (error) throw error;
    return [200, { ok: true, player: to }];
  }
  if (method === 'POST' && action === 'kick') {
    const b = await readBody(req);
    if (role !== 'owner') throw new AppError(403, 'NOT_OWNER', 'Only the group owner can remove members.');
    const target = Number(b.userId);
    if (!target || target === user.id) throw new AppError(400, 'BAD_USER', 'Choose a member to remove.');
    await must(db.from('group_members').delete().eq('group_id', gid).eq('player_id', target));
    return [200, { ok: true }];
  }
  if (method === 'GET' && action === 'messages') {
    const after = Number(new URL(req.url).searchParams.get('after') || 0);
    let q = db.from('group_messages').select(MSG_COLS).eq('group_id', gid).order('id', { ascending: false }).limit(50);
    if (after > 0) q = q.gt('id', after);
    const { data, error } = await q;
    if (error) throw error;
    return [200, { messages: data.reverse().map(msgOut) }];
  }
  if (method === 'POST' && action === 'messages') {
    const b = await readBody(req);
    const text = typeof b.text === 'string' ? b.text.trim().slice(0, 300) : '';
    if (!text) throw new AppError(400, 'EMPTY', 'Type a message first.');
    await limit('msg:' + user.id, 30, 60);
    const { data, error } = await db.from('group_messages').insert({ group_id: gid, player_id: user.id, text }).select(MSG_COLS).single();
    if (error) throw error;
    return [201, { message: msgOut(data) }];
  }
  throw new AppError(404, 'NOT_FOUND', 'Unknown endpoint');
}
async function inviteRoute(req: Request, id: number, action: string): Promise<[number, unknown]> {
  const user = await requireUser(req);
  const { data: inv } = await db.from('group_invites').select('id, group_id, to_id').eq('id', id).maybeSingle();
  if (!inv || inv.to_id !== user.id) throw new AppError(404, 'NOT_FOUND', 'That invitation is no longer available.');
  if (action === 'decline') {
    await must(db.from('group_invites').delete().eq('id', id));
    return [200, { ok: true }];
  }
  if (action === 'accept') {
    const g = await loadGroup(inv.group_id);
    if (!(await roleIn(g.id, user.id))) {
      await checkGroupLimit(user.id);
      await must(db.from('group_members').insert({ group_id: g.id, player_id: user.id, role: 'member' }));
    }
    await must(db.from('group_invites').delete().eq('id', id));
    return [200, { group: groupOut({ ...g, role: 'member', member_count: await memberCount(g.id) }, true) }];
  }
  throw new AppError(404, 'NOT_FOUND', 'Unknown endpoint');
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  'Access-Control-Max-Age': '86400'
};
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  // the function is mounted at /api, so paths arrive as /api/...
  const path = new URL(req.url).pathname.replace(/^\/functions\/v1/, '').replace(/\/+$/, '');
  try {
    const m = path.match(/^\/api\/profile\/(\d{1,15})$/);
    if (m && req.method === 'GET') {
      await limit('prof:' + ipOf(req), 300, 60);
      const u = await findBy('id', Number(m[1]));
      if (!u) throw new AppError(404, 'NOT_FOUND', 'Player not found');
      return json(200, { profile: publicUser(u, false) });
    }
    const gm = path.match(/^\/api\/groups\/(\d{1,15})(?:\/(join|leave|invite|kick|messages))?$/);
    if (gm) {
      const [status, body] = await groupRoute(req, Number(gm[1]), gm[2] || '');
      return json(status, body);
    }
    const im = path.match(/^\/api\/invites\/(\d{1,15})\/(accept|decline)$/);
    if (im && req.method === 'POST') {
      const [status, body] = await inviteRoute(req, Number(im[1]), im[2]);
      return json(status, body);
    }
    const route = routes[req.method + ' ' + path];
    if (!route) throw new AppError(404, 'NOT_FOUND', 'Unknown endpoint');
    const [status, body] = await route(req);
    return json(status, body);
  } catch (e) {
    if (e instanceof AppError) return json(e.status, { error: e.code, message: e.message });
    console.error(e);
    return json(500, { error: 'SERVER', message: 'Something went wrong. Please try again.' });
  }
});
