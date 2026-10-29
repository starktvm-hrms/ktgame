// Load test: simulated players that register, connect and wander around.
//
//   node bench/bots.js --servers http://localhost:8080,http://localhost:8081 \
//        --bots 2000 --groups 40 --seconds 60
//
// Bots are spread over several servers (as a load balancer would) and
// gathered in groups, so the test also checks that players on different
// instances see each other. Tokens are cached in bench/.tokens.json so
// repeated runs skip registration.
'use strict';
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const args = Object.fromEntries(process.argv.slice(2).map((a, i, all) => (a.startsWith('--') ? [a.slice(2), all[i + 1]] : null)).filter(Boolean));
const servers = (args.servers || 'http://127.0.0.1:8080').split(',');
const N = parseInt(args.bots || '200', 10);
const GROUPS = parseInt(args.groups || '10', 10);
const SECONDS = parseInt(args.seconds || '30', 10);
const HZ = parseInt(args.hz || '10', 10);
const tokenFile = path.join(__dirname, '.tokens.json');

async function register(i) {
  const phone = '+9190' + String(10000000 + i).slice(-8);
  const base = servers[i % servers.length];
  let r = await fetch(base + '/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone, password: 'botpass1', remember: true }) });
  if (r.status === 401) r = await fetch(base + '/api/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Bot ' + i, phone, password: 'botpass1', remember: true }) });
  const b = await r.json();
  if (!b.token) throw new Error('auth failed for bot ' + i + ': ' + JSON.stringify(b));
  return b.token;
}

async function tokens() {
  let cache = {};
  try { cache = JSON.parse(fs.readFileSync(tokenFile, 'utf8')); } catch (e) { /* none */ }
  const out = [];
  const queue = [];
  for (let i = 0; i < N; i++) {
    if (cache[i]) out[i] = cache[i];
    else queue.push(i);
  }
  let done = 0;
  const workers = Array.from({ length: 8 }, async () => {
    while (queue.length) {
      const i = queue.shift();
      out[i] = cache[i] = await register(i);
      if (++done % 200 === 0) console.log('registered', done);
    }
  });
  await Promise.all(workers);
  fs.writeFileSync(tokenFile, JSON.stringify(cache));
  return out;
}

(async () => {
  const toks = await tokens();
  const stats = { bytes: 0, msgs: 0, seenOther: 0, open: 0, closed: 0 };
  const instanceOf = new Map();
  const bots = [];
  for (let i = 0; i < N; i++) {
    const server = servers[Math.floor(i / GROUPS) % servers.length];
    const ws = new WebSocket(server.replace('http', 'ws') + '/ws');
    const g = i % GROUPS;
    const bot = { ws, i, server, cx: (g % 10) * 400, cz: Math.floor(g / 10) * 400, a: Math.random() * 6.28, seen: new Set() };
    bot.x = bot.cx + Math.random() * 60; bot.z = bot.cz + Math.random() * 60;
    ws.on('open', () => { stats.open++; ws.send(JSON.stringify({ t: 'auth', token: toks[i] })); });
    ws.on('message', (data, bin) => {
      stats.msgs++; stats.bytes += data.length;
      if (!bin) { const m = JSON.parse(data); if (m.t === 'hello') { bot.id = m.id; instanceOf.set(m.id, server); } return; }
      const n = data.readUInt16LE(2);
      for (let k = 0; k < n; k++) bot.seen.add(data.readUInt32LE(4 + k * 22));
    });
    ws.on('close', () => { stats.closed++; });
    ws.on('error', () => {});
    bots.push(bot);
    if (i % 200 === 199) await new Promise((r) => setTimeout(r, 50));
  }
  const buf = Buffer.alloc(20);
  const timer = setInterval(() => {
    bots.forEach((b) => {
      if (b.ws.readyState !== 1 || !b.id) return;
      b.a += (Math.random() - 0.5) * 0.4;
      b.x += Math.cos(b.a) * 0.3; b.z += Math.sin(b.a) * 0.3;
      if (Math.hypot(b.x - b.cx, b.z - b.cz) > 80) b.a += Math.PI;
      buf[0] = 1; buf[1] = 0; buf[2] = 1; buf[3] = 0;
      buf.writeFloatLE(b.x, 4); buf.writeFloatLE(1, 8); buf.writeFloatLE(b.z, 12);
      buf.writeInt16LE(Math.round(Math.atan2(Math.sin(b.a), Math.cos(b.a)) * 10000), 16); buf.writeInt16LE(140, 18);
      b.ws.send(buf);
    });
  }, 1000 / HZ);
  const start = Date.now();
  const report = setInterval(() => {
    const secs = (Date.now() - start) / 1000;
    console.log(`t=${secs.toFixed(0)}s open=${stats.open - stats.closed} msgs/s/bot=${(stats.msgs / secs / N).toFixed(1)} KB/s/bot=${(stats.bytes / secs / N / 1024).toFixed(2)}`);
  }, 5000);
  setTimeout(() => {
    clearInterval(timer); clearInterval(report);
    let cross = 0, avgSeen = 0;
    bots.forEach((b) => {
      avgSeen += b.seen.size;
      for (const id of b.seen) if (instanceOf.get(id) && instanceOf.get(id) !== b.server) { cross++; break; }
    });
    console.log(`done: avg players seen per bot=${(avgSeen / N).toFixed(1)}, bots that saw players on another server=${cross}/${N}`);
    bots.forEach((b) => b.ws.close());
    setTimeout(() => process.exit(0), 500);
  }, SECONDS * 1000);
})();
