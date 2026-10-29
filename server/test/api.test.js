// End-to-end test: accounts API + realtime visibility between two players.
// Usage: node test/api.test.js   (honours DATABASE_URL / REDIS_URL)
'use strict';
const assert = require('assert');
const os = require('os');
const path = require('path');
const fs = require('fs');

process.env.PORT = process.env.PORT || String(18000 + Math.floor(Math.random() * 1000));
if (!process.env.DATABASE_URL) process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'kt-test-'));
process.env.SCRYPT_N = '1024';

const { startInstance } = require('../src/index');
const WebSocket = require('ws');
const base = 'http://127.0.0.1:' + process.env.PORT;

async function api(method, url, body, token) {
  const r = await fetch(base + url, {
    method, headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: 'Bearer ' + token } : {}),
    body: body ? JSON.stringify(body) : undefined
  });
  return { status: r.status, body: await r.json() };
}

function stateMsg(level, x, y, z) {
  const b = Buffer.alloc(20);
  b[0] = 1; b[1] = level; b[2] = 1; b[3] = 0;
  b.writeFloatLE(x, 4); b.writeFloatLE(y, 8); b.writeFloatLE(z, 12);
  b.writeInt16LE(1000, 16); b.writeInt16LE(250, 18);
  return b;
}

function connect(token) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(base.replace('http', 'ws') + '/ws');
    ws.seen = new Map();
    ws.on('open', () => ws.send(JSON.stringify({ t: 'auth', token })));
    ws.on('message', (data, bin) => {
      if (!bin) { const m = JSON.parse(data); if (m.t === 'hello') { ws.id = m.id; resolve(ws); } if (m.t === 'who') ws.who = m.list; return; }
      const n = data.readUInt16LE(2);
      for (let i = 0; i < n; i++) { const off = 4 + i * 22; ws.seen.set(data.readUInt32LE(off), { x: data.readFloatLE(off + 6), z: data.readFloatLE(off + 14) }); }
    });
    ws.on('error', reject);
    ws.on('close', (c, r) => { ws.closedWith = c; });
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const inst = await startInstance();
  const phoneA = '98' + String(Date.now()).slice(-8);
  const phoneB = '97' + String(Date.now()).slice(-8);
  try {
    // validation
    let r = await api('POST', '/api/register', { name: 'A', phone: '123', password: 'x' });
    assert.strictEqual(r.status, 400);
    // register
    r = await api('POST', '/api/register', { name: 'Anjali Nair', phone: '+91 ' + phoneA, password: 'secret123', remember: true });
    assert.strictEqual(r.status, 201, JSON.stringify(r.body));
    const tokA = r.body.token;
    assert.ok(r.body.user.phone.includes('•'), 'phone is masked');
    // duplicate phone
    r = await api('POST', '/api/register', { name: 'Someone', phone: '0' + phoneA, password: 'secret123' });
    assert.strictEqual(r.status, 409);
    // login wrong / right
    r = await api('POST', '/api/login', { phone: phoneA, password: 'nope' });
    assert.strictEqual(r.status, 401);
    r = await api('POST', '/api/login', { phone: phoneA, password: 'secret123', remember: false });
    assert.strictEqual(r.status, 200);
    // me, update, progress, public profile
    r = await api('GET', '/api/me', null, tokA);
    assert.strictEqual(r.body.user.name, 'Anjali Nair');
    r = await api('PUT', '/api/me', { name: 'Anjali', character: { gender: 'female', outfit: 'saree', hair: 'braid', acc: { hat: true } } }, tokA);
    assert.strictEqual(r.body.user.character.outfit, 'saree');
    r = await api('PUT', '/api/progress', { progress: { level: 3, coins: 120, stars: ['a', 'b'], districts: ['tvm', 'alp', 'xxx'], distanceKm: 61 } }, tokA);
    assert.strictEqual(r.status, 200);
    const idA = (await api('GET', '/api/me', null, tokA)).body.user.id;
    r = await api('GET', '/api/profile/' + idA);
    assert.strictEqual(r.body.profile.stats.level, 3);
    assert.deepStrictEqual(r.body.profile.stats.districts, ['tvm', 'alp']);
    assert.strictEqual(r.body.profile.phone, undefined, 'public profile hides phone');
    r = await api('GET', '/api/me', null, 'forged.token');
    assert.strictEqual(r.status, 401);
    // realtime: two players near each other see each other, a far one does not
    const tokB = (await api('POST', '/api/register', { name: 'Biju', phone: phoneB, password: 'secret123' })).body.token;
    const phoneC = '96' + String(Date.now()).slice(-8);
    const tokC = (await api('POST', '/api/register', { name: 'Chinnu', phone: phoneC, password: 'secret123' })).body.token;
    const a = await connect(tokA), b = await connect(tokB), c = await connect(tokC);
    for (let i = 0; i < 8; i++) {
      a.send(stateMsg(0, 10, 1, 20)); b.send(stateMsg(0, 15, 1, 25)); c.send(stateMsg(0, 2000, 1, 2000));
      await sleep(100);
    }
    assert.ok(a.seen.has(b.id), 'A sees B');
    assert.ok(b.seen.has(a.id), 'B sees A');
    assert.ok(!a.seen.has(c.id), 'A does not see far-away C');
    assert.ok(Math.abs(a.seen.get(b.id).x - 15) < 1e-3);
    a.send(JSON.stringify({ t: 'who', ids: [b.id] }));
    await sleep(300);
    assert.strictEqual(a.who[0].name, 'Biju');
    // same account signing in twice kicks the older connection
    const a2 = await connect(tokA);
    await sleep(300);
    assert.strictEqual(a.closedWith, 4001);
    a2.close(); b.close(); c.close();
    console.log('ALL TESTS PASSED (store=' + inst.store.kind + ', bus=' + inst.bus.kind + ')');
  } catch (e) {
    console.error('TEST FAILED', e);
    process.exitCode = 1;
  }
  await inst.realtime.shutdown();
  inst.server.close();
  await inst.store.close();
  await inst.bus.close();
  process.exit();
})();
