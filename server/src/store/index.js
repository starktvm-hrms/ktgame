// Account storage. PostgreSQL in production (DATABASE_URL), a JSON file
// for local development. Both expose the same async interface:
//   createUser({name, phone, passHash}) -> user   (throws code PHONE_TAKEN)
//   findByPhone(phone) -> user | null
//   findById(id) -> user | null
//   findManyByIds(ids) -> [user]
//   updateUser(id, patch) -> user   (patch: name, character, progress, lastLogin)
//   count() -> number
//   close()
'use strict';
const config = require('../config');

async function createStore() {
  if (config.databaseUrl) {
    const PgStore = require('./pg');
    const s = new PgStore(config.databaseUrl);
    await s.init();
    return s;
  }
  const FileStore = require('./file');
  const s = new FileStore(config.dataDir);
  await s.init();
  return s;
}

module.exports = { createStore };
