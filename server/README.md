# Kerala Explorer — game server

Accounts, saved progress, player profiles and the real-time multiplayer
service. It is plain Node.js (18+). For local development it needs no
database: everything is kept in JSON files under `server/data/`.

```bash
cd server
npm install
npm start            # http://localhost:8080 — serves the game and the API
```

Open http://localhost:8080 to play. The server also serves the game
files, so the client and API share one origin. If the game is opened from
somewhere else (another host, or `file://`), the client talks to
`http://localhost:8080` by default. Players can change the address under
**Server settings** on the sign-in screen.

## What it does

| Feature | Details |
| --- | --- |
| Register | name, username, mobile number, password. Numbers are normalised to `+91…` (E.164), one account per number. Usernames are unique: 3–20 characters, lowercase letters, digits, `_` and `.`, starting with a letter |
| Groups | public or private groups (up to 20 per player), invitations by username, group chat (checked by the game every few seconds). Owners can remove members; if the owner leaves, the longest-standing member takes over |
| Log in / Remember me | 30-day token with *Remember me* (kept in `localStorage`), 12-hour session token without it (`sessionStorage`) |
| Passwords | scrypt with a per-user salt. Plain passwords are never stored or logged |
| Profiles | `GET /api/profile/:id`: name, portrait character, level, coins, places, districts visited, km travelled by KSRTC bus, play time. Phone numbers are only shown, masked, to their owner |
| Progress | saved to the server every few seconds while playing, and on tab close |
| Multiplayer | WebSocket `/ws`: binary 20-byte state updates at 10 Hz, interest management by map cell, other players' name tags and buses |
| One session per account | logging in on a second device takes over and disconnects the first |
| Abuse limits | per-IP and per-number rate limits on register/login, 64 KB request cap, input validation |

### HTTP API

```
POST /api/register  {name, username, phone, password, remember} -> {token, user}
POST /api/login     {phone, password, remember}        -> {token, user}
GET  /api/me                                            -> {user}
PUT  /api/me        {name?, username?, character?}      -> {user}
GET  /api/players/search?q=                             -> {players}
GET  /api/groups                                        -> {groups}   (mine)
POST /api/groups    {name, description?, visibility}    -> {group}
GET  /api/groups/public?q=                              -> {groups}
GET  /api/groups/:id                                    -> {group, members}
POST /api/groups/:id/join | /leave                      -> {group} | {ok}
POST /api/groups/:id/invite {username}                  -> {ok, player}
POST /api/groups/:id/kick   {userId}  (owner only)      -> {ok}
GET  /api/groups/:id/messages?after=                    -> {messages}
POST /api/groups/:id/messages {text}                    -> {message}
GET  /api/invites                                       -> {invites}
POST /api/invites/:id/accept | /decline                 -> {group} | {ok}
PUT  /api/progress  {progress}                          -> {ok}
GET  /api/profile/:id                                   -> {profile}
GET  /api/health                                        -> {online, players, ...}
```

Authenticated calls send `Authorization: Bearer <token>`.

## Configuration

| Variable | Default | Meaning |
| --- | --- | --- |
| `PORT`, `HOST` | `8080`, `0.0.0.0` | listen address |
| `DATABASE_URL` | – | PostgreSQL connection string. Without it, JSON files in `DATA_DIR` |
| `REDIS_URL` | – | Redis for multi-instance play. Without it, single-instance in-memory bus |
| `AUTH_SECRET` | generated into `data/auth-secret` | token signing key. **Set the same value on every instance** |
| `WORKERS` | `1` | worker processes per instance (needs `REDIS_URL` when > 1) |
| `CORS_ORIGINS` | `*` | allowed origins for the API |
| `STATIC_DIR` | repo root | folder of game files to serve |
| `TICK_HZ`, `CELL_SIZE`, `MAX_VISIBLE` | `10`, `120`, `60` | real-time tuning |
| `MAX_CONNECTIONS` | `20000` | per-instance connection cap |
| `RATE_LIMITS` | on | `off` disables the auth rate limits (load tests only) |

## Scaling to lakhs of players

The server is stateless apart from live WebSocket sessions, so capacity
grows by adding instances:

```
            ┌────────── nginx / cloud load balancer (WebSocket aware) ──────────┐
            │                         │                         │                │
       game instance            game instance             game instance   …  N instances
            │ \_____________________ │ ______________________/ │
            │        Redis pub/sub: one channel per map cell     │
            └──────────── PostgreSQL (accounts, progress) ───────┘
```

* **Interest management.** The map is split into 120 m cells. Each
  instance publishes its players' states per cell and subscribes only to
  the 3×3 cells around its own players. A player gets updates for at most
  60 nearby travellers (the closest ones when it is crowded). Traffic per
  player stays flat however many people are online.
* **Load measured on this code** (`bench/bots.js`, one CPU core per
  instance): 1,000 bots per instance in groups use about 12% of a core and
  about 12 KB/s of downstream traffic per player. A 2,000-bot run split across two
  instances confirmed that every bot saw the players connected to the
  other instance. A worst-case crowd, with everyone in one cell, runs a tick in about 11 ms.
* **Sizing.** At a conservative 5,000 players per instance (one vCPU,
  about 1 GB RAM), 1 lakh concurrent players needs about 20 instances. 5 lakh
  needs about 100, spread over several machines or a Kubernetes deployment
  with a WebSocket-capable load balancer. Bandwidth is the main cost: plan
  for about 5–12 KB/s per active player.
* **Redis** carries only small binary cell packets and presence counters.
  For very large deployments use a Redis Cluster, or several Redis nodes sharded by
  map region. Cell channels are independent, so they shard cleanly.
* **PostgreSQL** is touched at login and on progress saves, which are
  debounced to one write per player every few seconds. Use a managed instance with a
  read replica for profile lookups, and PgBouncer when there are many instances.
  The schema is in `sql/schema.sql` and is created automatically on start.

### Docker

```bash
cd server
printf 'AUTH_SECRET=%s\nPOSTGRES_PASSWORD=%s\n' "$(openssl rand -hex 32)" "$(openssl rand -hex 16)" > .env
docker compose up -d --build
docker compose up -d --scale game=8      # more instances
```

nginx (`nginx.conf`) serves the game on port 80 and balances `/api` and
`/ws` across the game containers. Put TLS in front of it, for example with a cloud
load balancer or certbot, so that browsers connect over `wss://`.

## Tests

```bash
npm test                                   # API + realtime, file store
DATABASE_URL=postgres://… REDIS_URL=redis://… npm test   # production stack
node bench/bots.js --servers http://localhost:8080 --bots 1000 --groups 25 --seconds 60
```

Run load tests with `RATE_LIMITS=off` on the servers, because the bots register
thousands of accounts from one IP.
