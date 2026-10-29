// HTTP API (JSON) and static file server for the game client.
//
//   POST /api/register   {name, username, phone, password, remember} -> {token, user}
//   POST /api/login      {phone, password, remember}        -> {token, user}
//   GET  /api/me                                            -> {user}
//   PUT  /api/me         {name?, username?, character?}     -> {user}
//   GET  /api/players/search?q=                             -> {players}
//   groups, invitations and chat: see groups.js
//   PUT  /api/progress   {progress}                         -> {ok}
//   POST /api/ping                                          -> {online}
//   GET  /api/profile/:id                                   -> {profile}
//   GET  /api/health                                        -> {ok, online, ...}
'use strict';
const fs = require('fs');
const path = require('path');
const auth = require('./auth');
const { createGroupRoutes } = require('./groups');

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.webp': 'image/webp', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8', '.md': 'text/markdown; charset=utf-8'
};
const BLOCKED = ['/server', '/.git', '/tools', '/node_modules'];

const DISTRICT_IDS = ['tvm', 'klm', 'pta', 'alp', 'ktm', 'idk', 'ekm', 'tsr', 'pkd', 'mlp', 'kkd', 'wyd', 'knr', 'ksd'];
const VEHICLE_IDS = ['bicycle', 'auto', 'scooter', 'car'];

// progress is written by the client, so profile stats are sanitised here
const num = (v, max) => { const n = Number(v); return Number.isFinite(n) ? Math.max(0, Math.min(max, Math.floor(n))) : 0; };

function publicUser(u, self) {
  const p = u.progress || {};
  const out = {
    id: u.id,
    name: u.name,
    username: u.username || null,
    memberSince: u.createdAt,
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
    out.phone = auth.maskPhone(u.phone);
    out.lastLogin = u.lastLogin;
    out.progress = u.progress || null;
  }
  return out;
}

// Keep stored blobs small and well-formed.
function cleanCharacter(c) {
  if (!c || typeof c !== 'object') return null;
  const pick = (v, ok) => (typeof v === 'string' && v.length < 24 && ok.test(v) ? v : undefined);
  const out = {
    gender: c.gender === 'female' ? 'female' : 'male',
    outfit: pick(c.outfit, /^[a-z]+$/),
    hair: pick(c.hair, /^[a-z]+$/),
    acc: {}
  };
  if (c.acc && typeof c.acc === 'object') ['backpack', 'camera', 'hat', 'sunglasses'].forEach((k) => { out.acc[k] = !!c.acc[k]; });
  return out;
}

function createHttpHandler({ store, realtime, bus, config, log }) {
  const json = (res, status, obj, cors) => {
    const body = JSON.stringify(obj);
    res.writeHead(status, Object.assign({ 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, cors));
    res.end(body);
  };

  const readBody = (req) => new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > 64 * 1024) { reject(new auth.AppError(413, 'TOO_LARGE', 'Request too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch (e) { reject(new auth.AppError(400, 'BAD_JSON', 'Invalid JSON')); }
    });
    req.on('error', reject);
  });

  const ipOf = (req) => (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || '';

  async function limit(key, max, windowSec) {
    if (config.rateLimitsOff) return;
    const n = await bus.incrWindow('kt:rl:' + key, windowSec);
    if (n > max) throw new auth.AppError(429, 'RATE_LIMIT', 'Too many attempts. Please wait a few minutes and try again.');
  }

  async function requireUser(req) {
    const h = req.headers.authorization || '';
    const tok = auth.verifyToken(h.startsWith('Bearer ') ? h.slice(7) : '');
    if (!tok) throw new auth.AppError(401, 'UNAUTHORIZED', 'Please sign in again.');
    const user = await store.findById(tok.uid);
    if (!user) throw new auth.AppError(401, 'UNAUTHORIZED', 'Account not found.');
    return user;
  }

  const routes = {
    'POST /api/register': async (req) => {
      const b = await readBody(req);
      await limit('reg:' + ipOf(req), 20, 3600);
      const name = auth.validateName(b.name);
      const phone = auth.normalizePhone(b.phone);
      if (!name) throw new auth.AppError(400, 'BAD_NAME', 'Name must be 2–24 letters or numbers.');
      if (!phone) throw new auth.AppError(400, 'BAD_PHONE', 'Enter a valid mobile number (e.g. 98765 43210).');
      if (!auth.validatePassword(b.password)) throw new auth.AppError(400, 'BAD_PASSWORD', 'Password must be at least 6 characters.');
      const username = auth.validateUsername(b.username);
      if (!username) throw new auth.AppError(400, 'BAD_USERNAME', auth.USERNAME_RULES);
      let user;
      try {
        user = await store.createUser({ name, username, phone, passHash: await auth.hashPassword(b.password) });
      } catch (e) {
        throw takenError(e);
      }
      log.info('register', user.id);
      return [201, { token: auth.issueToken(user.id, !!b.remember), user: publicUser(user, true) }];
    },
    'POST /api/login': async (req) => {
      const b = await readBody(req);
      const phone = auth.normalizePhone(b.phone);
      await limit('login:' + ipOf(req), 60, 900);
      if (!phone || typeof b.password !== 'string') throw new auth.AppError(400, 'BAD_LOGIN', 'Enter your phone number and password.');
      await limit('login:' + phone, 10, 900);
      const user = await store.findByPhone(phone);
      if (!user || !(await auth.verifyPassword(b.password, user.passHash))) {
        throw new auth.AppError(401, 'BAD_LOGIN', 'Phone number or password is incorrect.');
      }
      const updated = await store.updateUser(user.id, { lastLogin: new Date().toISOString() });
      return [200, { token: auth.issueToken(user.id, !!b.remember), user: publicUser(updated, true) }];
    },
    'GET /api/me': async (req) => [200, { user: publicUser(await requireUser(req), true) }],
    'PUT /api/me': async (req) => {
      const user = await requireUser(req);
      const b = await readBody(req);
      const patch = {};
      if (b.name !== undefined) {
        const name = auth.validateName(b.name);
        if (!name) throw new auth.AppError(400, 'BAD_NAME', 'Name must be 2–24 letters or numbers.');
        patch.name = name;
      }
      if (b.username !== undefined && b.username !== user.username) {
        const username = auth.validateUsername(b.username);
        if (!username) throw new auth.AppError(400, 'BAD_USERNAME', auth.USERNAME_RULES);
        patch.username = username;
      }
      if (b.character !== undefined) patch.character = cleanCharacter(b.character);
      let updated;
      try { updated = await store.updateUser(user.id, patch); } catch (e) { throw takenError(e); }
      realtime.updateMeta(updated);
      return [200, { user: publicUser(updated, true) }];
    },
    'GET /api/players/search': async (req, url) => {
      const user = await requireUser(req);
      const q = (url.searchParams.get('q') || '').trim().replace(/^@/, '').toLowerCase();
      if (q.length < 2) return [200, { players: [] }];
      return [200, { players: await store.searchPlayers(q.slice(0, 24), user.id) }];
    },
    'PUT /api/progress': async (req) => {
      const user = await requireUser(req);
      const b = await readBody(req);
      if (!b.progress || typeof b.progress !== 'object') throw new auth.AppError(400, 'BAD_PROGRESS', 'Missing progress');
      await store.updateUser(user.id, { progress: b.progress });
      return [200, { ok: true }];
    },
    'POST /api/ping': async (req) => {
      await requireUser(req);
      return [200, { online: realtime.online || realtime.sessions.size }];
    },
    'GET /api/health': async () => [200, { ok: true, online: realtime.online || realtime.sessions.size, players: await store.count(), store: store.kind, bus: bus.kind, uptime: Math.round(process.uptime()) }]
  };

  const groupRoutes = createGroupRoutes({ store, readBody, requireUser, limit });
  function takenError(e) {
    if (e.code === 'USERNAME_TAKEN') return new auth.AppError(409, 'USERNAME_TAKEN', 'That username is taken. Please choose another.');
    if (e.code === 'PHONE_TAKEN') return new auth.AppError(409, 'PHONE_TAKEN', 'This phone number is already registered. Please log in.');
    return e;
  }

  function corsHeaders(req) {
    const origin = req.headers.origin;
    if (!origin) return {};
    const ok = config.corsOrigins.includes('*') || config.corsOrigins.includes(origin);
    return ok ? { 'Access-Control-Allow-Origin': origin === 'null' ? '*' : origin, 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS', 'Access-Control-Max-Age': '86400', Vary: 'Origin' } : {};
  }

  function serveStatic(req, res) {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p === '/') p = '/index.html';
    if (p === '/js/config.js') return serveConfig(req, res);
    if (BLOCKED.some((b) => p.startsWith(b))) { res.writeHead(404); return res.end('Not found'); }
    const file = path.normalize(path.join(config.staticDir, p));
    if (!file.startsWith(config.staticDir)) { res.writeHead(403); return res.end(); }
    fs.stat(file, (err, st) => {
      if (err || !st.isFile()) { res.writeHead(404); return res.end('Not found'); }
      const ext = path.extname(file).toLowerCase();
      res.writeHead(200, {
        'Content-Type': MIME[ext] || 'application/octet-stream',
        'Content-Length': st.size,
        'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600'
      });
      if (req.method === 'HEAD') return res.end();
      fs.createReadStream(file).pipe(res);
    });
  }

  // The client config tells the game to use this server rather than the
  // hosted Supabase backend.
  const CONFIG_JS = path.join(config.staticDir, 'js', 'config.js');
  function serveConfig(req, res) {
    fs.readFile(CONFIG_JS, 'utf8', (err, text) => {
      const body = (err ? 'KT.CONFIG = {};\n' : text) + 'KT.CONFIG.node = true;\n';
      res.writeHead(200, { 'Content-Type': MIME['.js'], 'Content-Length': Buffer.byteLength(body), 'Cache-Control': 'no-cache' });
      res.end(req.method === 'HEAD' ? undefined : body);
    });
  }

  return async function handler(req, res) {
    const cors = corsHeaders(req);
    if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }
    const url = req.url.split('?')[0];
    try {
      if (url.startsWith('/api/')) {
        const m = url.match(/^\/api\/profile\/(\d{1,15})$/);
        if (m && req.method === 'GET') {
          await limit('prof:' + ipOf(req), 300, 60);
          const u = await store.findById(Number(m[1]));
          if (!u) throw new auth.AppError(404, 'NOT_FOUND', 'Player not found');
          return json(res, 200, { profile: publicUser(u, false) }, cors);
        }
        const full = new URL(req.url, 'http://local');
        const grouped = await groupRoutes(req, full);
        if (grouped) return json(res, grouped[0], grouped[1], cors);
        const route = routes[req.method + ' ' + url];
        if (!route) throw new auth.AppError(404, 'NOT_FOUND', 'Unknown endpoint');
        const [status, body] = await route(req, full);
        return json(res, status, body, cors);
      }
      if (req.method === 'GET' || req.method === 'HEAD') return serveStatic(req, res);
      throw new auth.AppError(405, 'METHOD', 'Method not allowed');
    } catch (e) {
      if (e instanceof auth.AppError) return json(res, e.status, { error: e.code, message: e.message }, cors);
      log.error(e);
      return json(res, 500, { error: 'SERVER', message: 'Something went wrong. Please try again.' }, cors);
    }
  };
}

module.exports = { createHttpHandler, publicUser };
