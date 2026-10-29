// Server configuration from environment variables (see server/README.md).
'use strict';
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const env = process.env;
const DATA_DIR = path.resolve(env.DATA_DIR || path.join(__dirname, '..', 'data'));

// A stable signing secret is required so tokens survive restarts and work
// across every instance. In production set AUTH_SECRET; in development one is
// generated once and kept in the data directory.
function loadSecret() {
  if (env.AUTH_SECRET) return env.AUTH_SECRET;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const file = path.join(DATA_DIR, 'auth-secret');
  try {
    return fs.readFileSync(file, 'utf8').trim();
  } catch (e) {
    const s = crypto.randomBytes(48).toString('base64url');
    fs.writeFileSync(file, s, { mode: 0o600 });
    return s;
  }
}

module.exports = {
  port: parseInt(env.PORT || '8080', 10),
  host: env.HOST || '0.0.0.0',
  dataDir: DATA_DIR,
  staticDir: path.resolve(env.STATIC_DIR || path.join(__dirname, '..', '..')),
  databaseUrl: env.DATABASE_URL || '',
  redisUrl: env.REDIS_URL || '',
  authSecret: loadSecret(),
  workers: parseInt(env.WORKERS || '1', 10),
  // CORS: '*' allows the game to be opened from file:// or another host
  corsOrigins: (env.CORS_ORIGINS || '*').split(',').map((s) => s.trim()),
  // realtime
  tickHz: parseInt(env.TICK_HZ || '10', 10),
  cellSize: parseInt(env.CELL_SIZE || '120', 10),
  maxVisible: parseInt(env.MAX_VISIBLE || '60', 10),
  maxConnectionsPerInstance: parseInt(env.MAX_CONNECTIONS || '20000', 10),
  // password hashing cost (scrypt N); keep >= 16384 in production
  scryptN: parseInt(env.SCRYPT_N || '16384', 10),
  // only for load testing on a private network
  rateLimitsOff: env.RATE_LIMITS === 'off',
  tokenTtlShort: 12 * 3600, // seconds, "remember me" off
  tokenTtlLong: 30 * 24 * 3600 // seconds, "remember me" on
};
