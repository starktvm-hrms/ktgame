// Production store backed by PostgreSQL. The schema is created on start
// (see server/sql/schema.sql). Phone numbers are unique and indexed.
'use strict';
const fs = require('fs');
const path = require('path');

function rowToUser(r) {
  if (!r) return null;
  return {
    id: Number(r.id), name: r.name, phone: r.phone, passHash: r.pass_hash,
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
    lastLogin: r.last_login instanceof Date ? r.last_login.toISOString() : r.last_login,
    character: r.character, progress: r.progress
  };
}

class PgStore {
  constructor(url) {
    const { Pool } = require('pg');
    this.pool = new Pool({ connectionString: url, max: parseInt(process.env.PG_POOL || '10', 10) });
    this.kind = 'postgres';
  }

  async init() {
    const sql = fs.readFileSync(path.join(__dirname, '..', '..', 'sql', 'schema.sql'), 'utf8');
    await this.pool.query(sql);
  }

  async createUser({ name, phone, passHash }) {
    try {
      const r = await this.pool.query(
        'INSERT INTO players (name, phone, pass_hash) VALUES ($1, $2, $3) RETURNING *', [name, phone, passHash]);
      return rowToUser(r.rows[0]);
    } catch (e) {
      if (e.code === '23505') { const err = new Error('phone taken'); err.code = 'PHONE_TAKEN'; throw err; }
      throw e;
    }
  }

  async findByPhone(phone) {
    const r = await this.pool.query('SELECT * FROM players WHERE phone = $1', [phone]);
    return rowToUser(r.rows[0]);
  }

  async findById(id) {
    const r = await this.pool.query('SELECT * FROM players WHERE id = $1', [id]);
    return rowToUser(r.rows[0]);
  }

  async findManyByIds(ids) {
    if (!ids.length) return [];
    const r = await this.pool.query('SELECT * FROM players WHERE id = ANY($1::bigint[])', [ids]);
    return r.rows.map(rowToUser);
  }

  async updateUser(id, patch) {
    const sets = [], vals = [];
    const map = { name: 'name', character: 'character', progress: 'progress', lastLogin: 'last_login' };
    Object.keys(map).forEach((k) => {
      if (patch[k] === undefined) return;
      vals.push(k === 'character' || k === 'progress' ? JSON.stringify(patch[k]) : patch[k]);
      sets.push(map[k] + ' = $' + vals.length);
    });
    if (!sets.length) return this.findById(id);
    vals.push(id);
    const r = await this.pool.query('UPDATE players SET ' + sets.join(', ') + ' WHERE id = $' + vals.length + ' RETURNING *', vals);
    return rowToUser(r.rows[0]);
  }

  async count() {
    const r = await this.pool.query('SELECT count(*)::bigint AS n FROM players');
    return Number(r.rows[0].n);
  }

  async close() { await this.pool.end(); }
}

module.exports = PgStore;
