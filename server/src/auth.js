// Validation, password hashing (scrypt) and signed session tokens.
'use strict';
const crypto = require('crypto');
const config = require('./config');

class AppError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

// Accepts Indian mobile numbers in common formats (+91 98765 43210,
// 09876543210, 9876543210) and international numbers in +CC form.
function normalizePhone(input) {
  if (typeof input !== 'string') return null;
  const raw = input.replace(/[\s\-().]/g, '');
  let m = raw.match(/^(?:\+?91|0)?([6-9]\d{9})$/);
  if (m) return '+91' + m[1];
  m = raw.match(/^\+([1-9]\d{7,14})$/);
  if (m) return '+' + m[1];
  return null;
}

function validateName(input) {
  if (typeof input !== 'string') return null;
  const name = input.trim().replace(/\s+/g, ' ');
  if (!/^[\p{L}\p{M}\p{N} .'_-]{2,24}$/u.test(name)) return null;
  return name;
}

// usernames: 3-20 characters, a letter first, then letters, digits, _ or .
const USERNAME_RULES = 'Usernames are 3–20 characters: a letter first, then letters, numbers, _ or .';
function validateUsername(input) {
  if (typeof input !== 'string') return null;
  const u = input.trim().replace(/^@/, '').toLowerCase();
  return /^[a-z][a-z0-9_.]{2,19}$/.test(u) ? u : null;
}

function validateGroupName(input) {
  if (typeof input !== 'string') return null;
  const n = input.trim().replace(/\s+/g, ' ');
  return /^[\p{L}\p{M}\p{N} .'&!_-]{3,30}$/u.test(n) ? n : null;
}

function validatePassword(pw) {
  return typeof pw === 'string' && pw.length >= 6 && pw.length <= 128;
}

function maskPhone(phone) {
  if (!phone) return '';
  const tail = phone.slice(-3);
  const head = phone.startsWith('+91') ? '+91 ' + phone.slice(3, 5) : phone.slice(0, 4);
  return head + '•••••' + tail;
}

function scrypt(password, salt, N) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, { N, r: 8, p: 1, maxmem: 256 * N * 8 * 2 }, (err, key) => (err ? reject(err) : resolve(key)));
  });
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const N = config.scryptN;
  const key = await scrypt(password, salt, N);
  return ['scrypt', N, salt.toString('base64'), key.toString('base64')].join('$');
}

async function verifyPassword(password, stored) {
  if (typeof stored !== 'string') return false;
  const [kind, n, saltB64, keyB64] = stored.split('$');
  if (kind !== 'scrypt') return false;
  const expected = Buffer.from(keyB64, 'base64');
  const key = await scrypt(password, Buffer.from(saltB64, 'base64'), parseInt(n, 10));
  return key.length === expected.length && crypto.timingSafeEqual(key, expected);
}

// Compact HMAC-signed token: base64url(payload).base64url(sig)
function sign(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', config.authSecret).update(body).digest('base64url');
  return body + '.' + sig;
}

function issueToken(userId, remember) {
  const ttl = remember ? config.tokenTtlLong : config.tokenTtlShort;
  return sign({ uid: userId, exp: Math.floor(Date.now() / 1000) + ttl, rm: remember ? 1 : 0 });
}

function verifyToken(token) {
  if (typeof token !== 'string' || token.length > 512) return null;
  const dot = token.indexOf('.');
  if (dot < 1) return null;
  const body = token.slice(0, dot), sig = token.slice(dot + 1);
  const expect = crypto.createHmac('sha256', config.authSecret).update(body).digest('base64url');
  const a = Buffer.from(sig), b = Buffer.from(expect);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!p.uid || !p.exp || p.exp < Date.now() / 1000) return null;
    return p;
  } catch (e) {
    return null;
  }
}

module.exports = { AppError, normalizePhone, validateName, validateUsername, validateGroupName, USERNAME_RULES, validatePassword, maskPhone, hashPassword, verifyPassword, issueToken, verifyToken };
