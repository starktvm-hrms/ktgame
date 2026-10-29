// Production store backed by PostgreSQL. The schema is created on start
// (see server/sql/schema.sql). Phone numbers are unique and indexed.
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const iso = (d) => (d instanceof Date ? d.toISOString() : d);
// match LIKE wildcards literally (backslash is the default escape)
const escapeLike = (s) => s.replace(/[%_\\]/g, '\\$&');
function uniqueError(e) {
  if (e.code !== '23505') return e;
  const err = new Error('taken');
  err.code = /username/.test(e.constraint || e.detail || '') ? 'USERNAME_TAKEN' : 'PHONE_TAKEN';
  return err;
}
function rowToGroup(r) {
  if (!r) return null;
  return { id: Number(r.id), name: r.name, description: r.description, visibility: r.visibility, ownerId: Number(r.owner_id), channelKey: r.channel_key, createdAt: iso(r.created_at) };
}
function rowToInvite(r) {
  if (!r) return null;
  return { id: Number(r.id), groupId: Number(r.group_id), fromId: Number(r.from_id), toId: Number(r.to_id), createdAt: iso(r.created_at) };
}
function rowToMessage(r) {
  return { id: Number(r.id), userId: Number(r.player_id), name: r.name, username: r.username, text: r.text, at: iso(r.created_at) };
}

function rowToUser(r) {
  if (!r) return null;
  return {
    id: Number(r.id), name: r.name, username: r.username || null, phone: r.phone, passHash: r.pass_hash,
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

  async createUser({ name, username, phone, passHash }) {
    try {
      const r = await this.pool.query(
        'INSERT INTO players (name, username, phone, pass_hash) VALUES ($1, $2, $3, $4) RETURNING *', [name, username || null, phone, passHash]);
      return rowToUser(r.rows[0]);
    } catch (e) {
      throw uniqueError(e);
    }
  }

  async findByUsername(username) {
    const r = await this.pool.query('SELECT * FROM players WHERE username = $1', [username]);
    return rowToUser(r.rows[0]);
  }

  async searchPlayers(q, excludeId) {
    const like = escapeLike(q);
    const r = await this.pool.query(
      "SELECT id, name, username FROM players WHERE (username LIKE $1 || '%' OR name ILIKE '%' || $1 || '%') AND id <> $2 LIMIT 10", [like, excludeId]);
    return r.rows.map((p) => ({ id: Number(p.id), name: p.name, username: p.username }));
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
    const map = { name: 'name', username: 'username', character: 'character', progress: 'progress', lastLogin: 'last_login' };
    Object.keys(map).forEach((k) => {
      if (patch[k] === undefined) return;
      vals.push(k === 'character' || k === 'progress' ? JSON.stringify(patch[k]) : patch[k]);
      sets.push(map[k] + ' = $' + vals.length);
    });
    if (!sets.length) return this.findById(id);
    vals.push(id);
    try {
      const r = await this.pool.query('UPDATE players SET ' + sets.join(', ') + ' WHERE id = $' + vals.length + ' RETURNING *', vals);
      return rowToUser(r.rows[0]);
    } catch (e) {
      throw uniqueError(e);
    }
  }

  // --------------------------------------------------------------- groups
  async createGroup({ name, visibility, description, ownerId }) {
    const c = await this.pool.connect();
    try {
      await c.query('BEGIN');
      const r = await c.query('INSERT INTO groups (name, visibility, description, owner_id, channel_key) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [name, visibility, description, ownerId, crypto.randomBytes(16).toString('hex')]);
      await c.query("INSERT INTO group_members (group_id, player_id, role) VALUES ($1, $2, 'owner')", [r.rows[0].id, ownerId]);
      await c.query('COMMIT');
      return rowToGroup(r.rows[0]);
    } catch (e) {
      await c.query('ROLLBACK');
      throw e;
    } finally {
      c.release();
    }
  }
  async getGroup(id) {
    const r = await this.pool.query('SELECT * FROM groups WHERE id = $1', [id]);
    return rowToGroup(r.rows[0]);
  }
  async deleteGroup(id) { await this.pool.query('DELETE FROM groups WHERE id = $1', [id]); }
  async setGroupOwner(gid, uid) {
    await this.pool.query('UPDATE groups SET owner_id = $2 WHERE id = $1', [gid, uid]);
    await this.pool.query("UPDATE group_members SET role = 'owner' WHERE group_id = $1 AND player_id = $2", [gid, uid]);
  }
  async myGroups(uid) {
    const r = await this.pool.query(
      `SELECT g.*, m.role,
         (SELECT count(*) FROM group_members mm WHERE mm.group_id = g.id) AS member_count,
         (SELECT max(id) FROM group_messages gm WHERE gm.group_id = g.id) AS last_message_id
       FROM group_members m JOIN groups g ON g.id = m.group_id WHERE m.player_id = $1 ORDER BY g.name`, [uid]);
    return r.rows.map((row) => ({ ...rowToGroup(row), role: row.role, memberCount: Number(row.member_count), lastMessageId: Number(row.last_message_id || 0) }));
  }
  async publicGroups(q, uid) {
    const r = await this.pool.query(
      `SELECT g.*, (SELECT count(*) FROM group_members mm WHERE mm.group_id = g.id) AS member_count,
         EXISTS (SELECT 1 FROM group_members me WHERE me.group_id = g.id AND me.player_id = $2) AS joined
       FROM groups g WHERE g.visibility = 'public' AND ($1 = '' OR g.name ILIKE '%' || $1 || '%')
       ORDER BY member_count DESC, g.created_at DESC LIMIT 30`, [escapeLike(q || ''), uid]);
    return r.rows.map((row) => ({ ...rowToGroup(row), memberCount: Number(row.member_count), joined: row.joined }));
  }
  async members(gid) {
    const r = await this.pool.query(
      'SELECT p.id, p.name, p.username, p.character, m.role, m.joined_at FROM group_members m JOIN players p ON p.id = m.player_id WHERE m.group_id = $1 ORDER BY m.joined_at', [gid]);
    return r.rows.map((m) => ({ id: Number(m.id), name: m.name, username: m.username, character: m.character, role: m.role }));
  }
  async role(gid, uid) {
    const r = await this.pool.query('SELECT role FROM group_members WHERE group_id = $1 AND player_id = $2', [gid, uid]);
    return r.rows[0] ? r.rows[0].role : null;
  }
  async addMember(gid, uid, role) {
    await this.pool.query('INSERT INTO group_members (group_id, player_id, role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING', [gid, uid, role || 'member']);
  }
  async removeMember(gid, uid) { await this.pool.query('DELETE FROM group_members WHERE group_id = $1 AND player_id = $2', [gid, uid]); }
  async memberCount(gid) {
    const r = await this.pool.query('SELECT count(*) AS n FROM group_members WHERE group_id = $1', [gid]);
    return Number(r.rows[0].n);
  }
  async countMemberships(uid) {
    const r = await this.pool.query('SELECT count(*) AS n FROM group_members WHERE player_id = $1', [uid]);
    return Number(r.rows[0].n);
  }

  // -------------------------------------------------------------- invites
  async addInvite(gid, fromId, toId) {
    await this.pool.query('INSERT INTO group_invites (group_id, from_id, to_id) VALUES ($1, $2, $3) ON CONFLICT (group_id, to_id) DO NOTHING', [gid, fromId, toId]);
  }
  async findInvite(gid, toId) {
    const r = await this.pool.query('SELECT * FROM group_invites WHERE group_id = $1 AND to_id = $2', [gid, toId]);
    return rowToInvite(r.rows[0]);
  }
  async getInvite(id) {
    const r = await this.pool.query('SELECT * FROM group_invites WHERE id = $1', [id]);
    return rowToInvite(r.rows[0]);
  }
  async deleteInvite(id) { await this.pool.query('DELETE FROM group_invites WHERE id = $1', [id]); }
  async invitesFor(uid) {
    const r = await this.pool.query(
      `SELECT i.id, i.created_at, g.id AS gid, g.name, g.visibility, g.description, p.name AS from_name, p.username AS from_username
       FROM group_invites i JOIN groups g ON g.id = i.group_id JOIN players p ON p.id = i.from_id
       WHERE i.to_id = $1 ORDER BY i.id DESC LIMIT 30`, [uid]);
    return r.rows.map((i) => ({ id: Number(i.id), createdAt: iso(i.created_at), group: { id: Number(i.gid), name: i.name, visibility: i.visibility, description: i.description }, from: { name: i.from_name, username: i.from_username } }));
  }

  // ------------------------------------------------------------- messages
  async addMessage(gid, uid, text) {
    const r = await this.pool.query(
      `WITH m AS (INSERT INTO group_messages (group_id, player_id, text) VALUES ($1, $2, $3) RETURNING *)
       SELECT m.*, p.name, p.username FROM m JOIN players p ON p.id = m.player_id`, [gid, uid, text]);
    return rowToMessage(r.rows[0]);
  }
  async messagesOf(gid, after) {
    const r = await this.pool.query(
      `SELECT m.*, p.name, p.username FROM group_messages m JOIN players p ON p.id = m.player_id
       WHERE m.group_id = $1 AND m.id > $2 ORDER BY m.id DESC LIMIT 50`, [gid, after || 0]);
    return r.rows.reverse().map(rowToMessage);
  }

  async count() {
    const r = await this.pool.query('SELECT count(*)::bigint AS n FROM players');
    return Number(r.rows[0].n);
  }

  async close() { await this.pool.end(); }
}

module.exports = PgStore;
