// Real-time multiplayer over WebSockets with spatial interest management.
//
// The world is divided into square cells per map level. Every tick each
// instance publishes, per occupied cell, one compact binary packet with the
// states of the players it hosts there. Instances subscribe only to cells
// within view of their own players, and every client receives at most
// MAX_VISIBLE nearby players. Bandwidth and CPU per player are therefore
// constant regardless of how many lakhs of players are online in total;
// capacity grows by adding instances behind a load balancer.
'use strict';
const { WebSocketServer } = require('ws');
const P = require('./protocol');
const auth = require('./auth');

const LEVELS = 4; // 0 home map, 1 Kerala highway (room for more)

class Realtime {
  constructor({ store, bus, config, log }) {
    this.store = store;
    this.bus = bus;
    this.cfg = config;
    this.log = log || console;
    this.sessions = new Map(); // userId -> session
    this.cells = new Map(); // channel -> Set(session)
    this.cellCache = new Map(); // channel -> Map(instanceId -> {buf, t})
    this.subs = new Set(); // channels subscribed on the bus
    this.metaCache = new Map(); // userId -> {name, character}
    this.online = 0;
    this.stats = { ticks: 0, tickMs: 0, bytesOut: 0, msgsIn: 0 };
    this.wss = new WebSocketServer({ noServer: true, maxPayload: 4096, perMessageDeflate: false, clientTracking: false });
    bus.subscribe('kt:kick', (buf) => {
      const id = buf.readUInt32LE(0), inst = buf.readUInt32LE(4);
      const s = this.sessions.get(id);
      if (s && inst !== this.bus.instanceId) this.close(s, 4001, 'signed in elsewhere');
    });
  }

  channel(level, x, z) {
    const c = this.cfg.cellSize;
    return 'kt:c:' + level + ':' + Math.floor(x / c) + ':' + Math.floor(z / c);
  }

  neighbourhood(s) {
    const c = this.cfg.cellSize;
    const cx = Math.floor(s.x / c), cz = Math.floor(s.z / c);
    const out = [];
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) out.push('kt:c:' + s.level + ':' + (cx + dx) + ':' + (cz + dz));
    return out;
  }

  attach(server) {
    server.on('upgrade', (req, socket, head) => {
      if (!req.url.startsWith('/ws')) { socket.destroy(); return; }
      if (this.sessions.size >= this.cfg.maxConnectionsPerInstance) {
        socket.write('HTTP/1.1 503 Service Unavailable\r\n\r\n');
        socket.destroy();
        return;
      }
      this.wss.handleUpgrade(req, socket, head, (ws) => this.onConnection(ws, req));
    });
    this.timer = setInterval(() => this.tick(), 1000 / this.cfg.tickHz);
    this.presenceTimer = setInterval(() => this.presence(), 5000);
    this.pingTimer = setInterval(() => this.heartbeat(), 30000);
  }

  onConnection(ws) {
    const pending = { ws, authed: false, alive: true };
    const authTimeout = setTimeout(() => { if (!pending.authed) ws.close(4000, 'auth timeout'); }, 5000);
    ws.on('pong', () => { pending.alive = true; if (pending.session) pending.session.alive = true; });
    ws.on('message', async (data, isBinary) => {
      if (!pending.authed) {
        if (isBinary || data.length > 1024) return ws.close(4000, 'auth required');
        let msg;
        try { msg = JSON.parse(data.toString()); } catch (e) { return ws.close(4000, 'bad auth'); }
        const tok = msg && msg.t === 'auth' ? auth.verifyToken(msg.token) : null;
        if (!tok) return ws.close(4003, 'invalid token');
        pending.authed = true;
        clearTimeout(authTimeout);
        const user = await this.store.findById(tok.uid).catch(() => null);
        if (!user || ws.readyState !== 1) return ws.close(4003, 'unknown player');
        pending.session = this.addSession(ws, user);
        return;
      }
      const s = pending.session;
      if (!s) return;
      this.stats.msgsIn++;
      // flood protection: ~30 msgs/s allowed, sustained abuse disconnects
      const now = Date.now();
      if (now - s.rateT > 1000) { s.rateT = now; s.rateN = 0; }
      if (++s.rateN > 60) { if (s.rateN > 300) this.close(s, 4008, 'rate limit'); return; }
      if (isBinary) this.onState(s, data);
      else this.onJson(s, data);
    });
    ws.on('close', () => { clearTimeout(authTimeout); if (pending.session) this.removeSession(pending.session); });
    ws.on('error', () => {});
  }

  addSession(ws, user) {
    const old = this.sessions.get(user.id);
    if (old) this.close(old, 4001, 'signed in elsewhere');
    const kick = Buffer.alloc(8);
    kick.writeUInt32LE(user.id >>> 0, 0);
    kick.writeUInt32LE(this.bus.instanceId >>> 0, 4);
    this.bus.publish('kt:kick', kick);
    const s = {
      ws, id: user.id, name: user.name, character: user.character, alive: true,
      level: 0, x: 0, y: 0, z: 0, h: 0, sp: 0, anim: 0, flags: 0, placed: false, chan: null,
      rateT: Date.now(), rateN: 0
    };
    this.sessions.set(user.id, s);
    this.metaCache.set(user.id, { name: user.name, character: user.character });
    this.send(s, { t: 'hello', id: user.id, online: this.online || this.sessions.size, tickHz: this.cfg.tickHz });
    return s;
  }

  removeSession(s) {
    if (this.sessions.get(s.id) === s) this.sessions.delete(s.id);
    if (s.chan) {
      const set = this.cells.get(s.chan);
      if (set) { set.delete(s); if (!set.size) this.cells.delete(s.chan); }
    }
    s.chan = null;
  }

  close(s, code, reason) {
    try { s.ws.close(code, reason); } catch (e) { /* already closed */ }
    this.removeSession(s);
  }

  onState(s, data) {
    const st = P.readState(data);
    if (!st || st.level >= LEVELS) return;
    Object.assign(s, st);
    s.placed = true;
    const chan = this.channel(s.level, s.x, s.z);
    if (chan !== s.chan) {
      if (s.chan) {
        const set = this.cells.get(s.chan);
        if (set) { set.delete(s); if (!set.size) this.cells.delete(s.chan); }
      }
      s.chan = chan;
      if (!this.cells.has(chan)) this.cells.set(chan, new Set());
      this.cells.get(chan).add(s);
    }
  }

  async onJson(s, data) {
    let msg;
    try { msg = JSON.parse(data.toString()); } catch (e) { return; }
    if (!msg || typeof msg.t !== 'string') return;
    if (msg.t === 'who' && Array.isArray(msg.ids)) {
      const ids = msg.ids.slice(0, 80).map(Number).filter((n) => Number.isInteger(n) && n > 0);
      this.send(s, { t: 'who', list: await this.lookup(ids) });
    } else if (msg.t === 'profile' && (msg.name || msg.character)) {
      // the player changed their look or name: refresh cached metadata
      const u = await this.store.findById(s.id).catch(() => null);
      if (u) { s.name = u.name; s.character = u.character; this.metaCache.set(s.id, { name: u.name, character: u.character }); }
    }
  }

  async lookup(ids) {
    const out = [], missing = [];
    ids.forEach((id) => {
      const m = this.metaCache.get(id);
      if (m) out.push({ id, name: m.name, character: m.character });
      else missing.push(id);
    });
    if (missing.length) {
      const users = await this.store.findManyByIds(missing).catch(() => []);
      users.forEach((u) => {
        if (this.metaCache.size > 50000) this.metaCache.delete(this.metaCache.keys().next().value);
        this.metaCache.set(u.id, { name: u.name, character: u.character });
        out.push({ id: u.id, name: u.name, character: u.character });
      });
    }
    return out;
  }

  send(s, obj) {
    if (s.ws.readyState === 1) s.ws.send(JSON.stringify(obj));
  }

  tick() {
    const t0 = process.hrtime.bigint();
    const now = Date.now();
    const inst = this.bus.instanceId;
    // 1. publish one packet per occupied cell
    this.cells.forEach((set, chan) => {
      const n = set.size;
      const buf = Buffer.allocUnsafe(6 + n * P.REC);
      buf.writeUInt32LE(inst >>> 0, 0);
      buf.writeUInt16LE(n, 4);
      let off = 6;
      set.forEach((s) => { P.writeRecord(buf, off, s); off += P.REC; });
      this.bus.publish(chan, buf);
    });
    // 2. keep bus subscriptions in line with what local players can see
    const wanted = new Set();
    this.sessions.forEach((s) => { if (s.placed) this.neighbourhood(s).forEach((c) => wanted.add(c)); });
    wanted.forEach((c) => {
      if (this.subs.has(c)) return;
      this.subs.add(c);
      this.bus.subscribe(c, (buf) => this.onCell(c, buf));
    });
    this.subs.forEach((c) => {
      if (wanted.has(c)) return;
      this.subs.delete(c);
      this.bus.unsubscribe(c);
      this.cellCache.delete(c);
    });
    // 3. send each player the nearby players. Everyone in the same cell shares
    //    one neighbourhood, so the packet is built once per cell and reused.
    const perCell = new Map();
    this.sessions.forEach((s) => {
      if (!s.placed || s.ws.readyState !== 1 || s.ws.bufferedAmount > 256 * 1024) return;
      let msg = perCell.get(s.chan);
      if (!msg) { msg = this.viewFor(s, now); perCell.set(s.chan, msg); }
      this.stats.bytesOut += msg.length;
      s.ws.send(msg, { binary: true });
    });
    this.stats.ticks++;
    this.stats.tickMs = this.stats.tickMs * 0.9 + Number(process.hrtime.bigint() - t0) / 1e6 * 0.1;
  }

  viewFor(s, now) {
    const parts = [];
    let count = 0;
    this.neighbourhood(s).forEach((c) => {
      const m = this.cellCache.get(c);
      if (!m) return;
      m.forEach((e, k) => {
        if (now - e.t > 1500) { m.delete(k); return; }
        parts.push(e.buf);
        count += e.buf.readUInt16LE(4);
      });
    });
    if (count <= this.cfg.maxVisible) return this.concat(parts, count);
    // crowded: keep the players closest to the centre of this cell
    const c = this.cfg.cellSize;
    return this.nearest({ x: (Math.floor(s.x / c) + 0.5) * c, z: (Math.floor(s.z / c) + 0.5) * c }, parts);
  }

  onCell(chan, buf) {
    if (buf.length < 6) return;
    const inst = buf.readUInt32LE(0);
    if (!this.cellCache.has(chan)) this.cellCache.set(chan, new Map());
    this.cellCache.get(chan).set(inst, { buf, t: Date.now() });
  }

  concat(parts, count) {
    const out = Buffer.allocUnsafe(4 + count * P.REC);
    out[0] = P.MSG_SNAPSHOT; out[1] = 0;
    out.writeUInt16LE(count, 2);
    let off = 4;
    parts.forEach((b) => { const n = b.readUInt16LE(4) * P.REC; b.copy(out, off, 6, 6 + n); off += n; });
    return out;
  }

  // Crowded area: keep only the closest MAX_VISIBLE players.
  nearest(s, parts) {
    const recs = [];
    parts.forEach((b) => {
      const n = b.readUInt16LE(4);
      for (let i = 0; i < n; i++) {
        const off = 6 + i * P.REC;
        const dx = b.readFloatLE(off + 6) - s.x, dz = b.readFloatLE(off + 14) - s.z;
        recs.push({ b, off, d: dx * dx + dz * dz });
      }
    });
    const n = Math.min(recs.length, this.cfg.maxVisible);
    // quickselect the n closest (O(k) instead of sorting everything)
    let lo = 0, hi = recs.length - 1;
    while (lo < hi) {
      const pivot = recs[(lo + hi) >> 1].d;
      let i = lo, j = hi;
      while (i <= j) {
        while (recs[i].d < pivot) i++;
        while (recs[j].d > pivot) j--;
        if (i <= j) { const t = recs[i]; recs[i] = recs[j]; recs[j] = t; i++; j--; }
      }
      if (n - 1 <= j) hi = j; else if (n - 1 >= i) lo = i; else break;
    }
    const out = Buffer.allocUnsafe(4 + n * P.REC);
    out[0] = P.MSG_SNAPSHOT; out[1] = 0;
    out.writeUInt16LE(n, 2);
    for (let i = 0; i < n; i++) recs[i].b.copy(out, 4 + i * P.REC, recs[i].off, recs[i].off + P.REC);
    return out;
  }

  async presence() {
    const local = this.sessions.size;
    try {
      await this.bus.reportPresence(local);
      this.online = await this.bus.totalOnline(local);
    } catch (e) {
      this.online = local;
    }
    const msg = JSON.stringify({ t: 'online', n: this.online });
    this.sessions.forEach((s) => { if (s.ws.readyState === 1) s.ws.send(msg); });
  }

  heartbeat() {
    this.sessions.forEach((s) => {
      if (!s.alive) { this.close(s, 4002, 'timeout'); return; }
      s.alive = false;
      try { s.ws.ping(); } catch (e) { /* ignore */ }
    });
  }

  // Called when a player's profile changes through the HTTP API.
  updateMeta(user) {
    this.metaCache.set(user.id, { name: user.name, character: user.character });
    const s = this.sessions.get(user.id);
    if (s) { s.name = user.name; s.character = user.character; }
  }

  async shutdown() {
    clearInterval(this.timer); clearInterval(this.presenceTimer); clearInterval(this.pingTimer);
    this.sessions.forEach((s) => this.close(s, 1001, 'server restarting'));
  }
}

module.exports = Realtime;
