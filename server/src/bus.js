// Message bus between server instances. With REDIS_URL every instance
// publishes the players it hosts per map cell and subscribes only to the
// cells its own players can see, so the work per instance stays bounded as
// more instances are added. Without Redis an in-process bus is used.
'use strict';
const crypto = require('crypto');

class LocalBus {
  constructor() {
    this.kind = 'local';
    this.handlers = new Map(); // channel -> fn
    this.instanceId = crypto.randomBytes(4).readUInt32LE(0);
  }
  async init() {}
  subscribe(channel, fn) { this.handlers.set(channel, fn); }
  unsubscribe(channel) { this.handlers.delete(channel); }
  publish(channel, buf) {
    const fn = this.handlers.get(channel);
    if (fn) fn(buf);
  }
  // simple key/value helpers used for presence & rate limiting
  async incrWindow(key, windowSec) {
    const now = Date.now();
    let e = this.kv && this.kv.get(key);
    if (!this.kv) this.kv = new Map();
    if (!e || e.reset < now) { e = { n: 0, reset: now + windowSec * 1000 }; this.kv.set(key, e); }
    e.n++;
    if (this.kv.size > 100000) for (const [k, v] of this.kv) if (v.reset < now) this.kv.delete(k);
    return e.n;
  }
  async reportPresence() {}
  async totalOnline(local) { return local; }
  async close() {}
}

class RedisBus {
  constructor(url) {
    const Redis = require('ioredis');
    this.kind = 'redis';
    this.pub = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 2 });
    this.sub = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 2 });
    this.handlers = new Map();
    this.instanceId = crypto.randomBytes(4).readUInt32LE(0);
  }
  async init() {
    await this.pub.connect();
    await this.sub.connect();
    this.sub.on('messageBuffer', (channel, buf) => {
      const fn = this.handlers.get(channel.toString());
      if (fn) fn(buf);
    });
  }
  subscribe(channel, fn) {
    if (!this.handlers.has(channel)) this.sub.subscribe(channel).catch(() => {});
    this.handlers.set(channel, fn);
  }
  unsubscribe(channel) {
    if (this.handlers.delete(channel)) this.sub.unsubscribe(channel).catch(() => {});
  }
  publish(channel, buf) { this.pub.publish(channel, buf).catch(() => {}); }
  async incrWindow(key, windowSec) {
    const r = await this.pub.multi().incr(key).expire(key, windowSec, 'NX').exec();
    return r[0][1];
  }
  async reportPresence(count) {
    await this.pub.set('kt:inst:' + this.instanceId, String(count), 'EX', 15);
  }
  async totalOnline() {
    let total = 0, cursor = '0';
    do {
      const [next, keys] = await this.pub.scan(cursor, 'MATCH', 'kt:inst:*', 'COUNT', 200);
      cursor = next;
      if (keys.length) (await this.pub.mget(keys)).forEach((v) => { total += parseInt(v || '0', 10); });
    } while (cursor !== '0');
    return total;
  }
  async close() { this.pub.disconnect(); this.sub.disconnect(); }
}

async function createBus(url) {
  const bus = url ? new RedisBus(url) : new LocalBus();
  await bus.init();
  return bus;
}

module.exports = { createBus };
