// Development store: keeps users in memory and persists them to a JSON
// file with atomic, debounced writes. Not meant for multiple instances.
'use strict';
const fs = require('fs');
const path = require('path');

class FileStore {
  constructor(dir) {
    this.file = path.join(dir, 'users.json');
    this.users = new Map();
    this.byPhone = new Map();
    this.nextId = 1;
    this.timer = null;
  }

  async init() {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    try {
      const data = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      data.users.forEach((u) => { this.users.set(u.id, u); this.byPhone.set(u.phone, u); });
      this.nextId = data.nextId || this.users.size + 1;
    } catch (e) {
      if (e.code !== 'ENOENT') throw e;
    }
    this.kind = 'file';
  }

  persist() {
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      const tmp = this.file + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify({ nextId: this.nextId, users: [...this.users.values()] }));
      fs.renameSync(tmp, this.file);
    }, 500);
  }

  flush() {
    if (!this.timer) return;
    clearTimeout(this.timer);
    this.timer = null;
    fs.writeFileSync(this.file, JSON.stringify({ nextId: this.nextId, users: [...this.users.values()] }));
  }

  async createUser({ name, phone, passHash }) {
    if (this.byPhone.has(phone)) { const e = new Error('phone taken'); e.code = 'PHONE_TAKEN'; throw e; }
    const now = new Date().toISOString();
    const u = { id: this.nextId++, name, phone, passHash, createdAt: now, lastLogin: now, character: null, progress: null };
    this.users.set(u.id, u);
    this.byPhone.set(phone, u);
    this.persist();
    return { ...u };
  }

  async findByPhone(phone) { const u = this.byPhone.get(phone); return u ? { ...u } : null; }
  async findById(id) { const u = this.users.get(Number(id)); return u ? { ...u } : null; }
  async findManyByIds(ids) { return ids.map((id) => this.users.get(Number(id))).filter(Boolean).map((u) => ({ ...u })); }

  async updateUser(id, patch) {
    const u = this.users.get(Number(id));
    if (!u) return null;
    ['name', 'character', 'progress', 'lastLogin'].forEach((k) => { if (patch[k] !== undefined) u[k] = patch[k]; });
    this.persist();
    return { ...u };
  }

  async count() { return this.users.size; }
  async close() { this.flush(); }
}

module.exports = FileStore;
