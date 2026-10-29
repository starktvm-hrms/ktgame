// Kerala Explorer game server: static client, accounts API and realtime.
// Run several instances (or WORKERS > 1) with REDIS_URL + DATABASE_URL to
// scale out; see server/README.md for the deployment guide.
'use strict';
const cluster = require('cluster');
const http = require('http');
const config = require('./config');

const log = {
  info: (...a) => console.log(new Date().toISOString(), '[info]', ...a),
  error: (...a) => console.error(new Date().toISOString(), '[error]', ...a)
};

async function startInstance() {
  const { createStore } = require('./store');
  const { createBus } = require('./bus');
  const Realtime = require('./realtime');
  const { createHttpHandler } = require('./http');

  const store = await createStore();
  const bus = await createBus(config.redisUrl);
  const realtime = new Realtime({ store, bus, config, log });
  const server = http.createServer(createHttpHandler({ store, realtime, bus, config, log }));
  server.keepAliveTimeout = 65000;
  realtime.attach(server);
  await new Promise((r) => server.listen(config.port, config.host, r));
  log.info(`listening on http://${config.host}:${config.port} (store=${store.kind}, bus=${bus.kind}, pid=${process.pid})`);

  if (process.env.STATS) {
    setInterval(() => {
      const s = realtime.stats;
      log.info(`players=${realtime.sessions.size} cells=${realtime.cells.size} tick=${s.tickMs.toFixed(2)}ms out=${(s.bytesOut / 1024).toFixed(0)}KB in=${s.msgsIn} rss=${(process.memoryUsage().rss / 1048576).toFixed(0)}MB`);
      s.bytesOut = 0; s.msgsIn = 0;
    }, 5000);
  }

  const shutdown = async () => {
    log.info('shutting down');
    await realtime.shutdown();
    server.close();
    await store.close();
    await bus.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  return { server, store, bus, realtime };
}

if (require.main === module) {
  if (config.workers > 1 && cluster.isPrimary) {
    if (!config.redisUrl) log.error('WORKERS > 1 needs REDIS_URL so workers can see each other’s players');
    for (let i = 0; i < config.workers; i++) cluster.fork();
    cluster.on('exit', (w) => { log.error('worker died', w.process.pid); cluster.fork(); });
  } else {
    startInstance().catch((e) => { log.error(e); process.exit(1); });
  }
}

module.exports = { startInstance };
