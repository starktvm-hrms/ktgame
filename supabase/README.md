# Kerala Explorer on Supabase

The hosted game (GitHub Pages) uses the Supabase project **KT Browser Game**
(`dtfwqzrzwevzjpanxwxo`) for its online services:

| Part | Where |
| --- | --- |
| Accounts, profiles, saved progress | Edge Function `api` (`functions/api/index.ts`), same routes as the Node server: register, login, me, progress, ping, profile, health |
| Player data | table `public.players` (`migrations/`). RLS is on with no policies, so only the function (service role) can read it, and phone numbers and password hashes never reach browsers |
| Passwords | PBKDF2-SHA256 (150,000 iterations, random salt) |
| Sessions | HMAC-signed tokens: 30 days with *Remember me*, 12 hours without |
| Rate limits | `kt_rate_hit()` on table `rate_hits`: sign-ups per IP, log-ins per IP and per number |
| Multiplayer | Supabase Realtime broadcast. The map is split into 120 m cells (`kt-<map>-<x>-<z>`). Players publish to their cell about 5 times a second while moving and listen to the 3×3 cells around them |
| Online count | players who pinged in the last 2 minutes (`kt_online()`) |
| Usernames, groups, chat | tables `groups`, `group_members`, `group_invites`, `group_messages` and `players.username`; same routes as the Node server (`/api/groups…`, `/api/invites…`, `/api/players/search`) |
| Group realtime | each group has a secret channel key that only members receive (`kt-grp-<key>`): new chat messages, members' positions for the map, and WebRTC voice signalling. `kt-usr-<id>` nudges a player when they are invited |

The browser only holds the project's publishable key (`js/config.js`),
which is meant to be public.

## Deploying changes

With the [Supabase CLI](https://supabase.com/docs/guides/cli):

```bash
supabase link --project-ref dtfwqzrzwevzjpanxwxo
supabase db push                          # migrations
supabase functions deploy api --no-verify-jwt
```

`--no-verify-jwt` is required: the function checks the game's own session
tokens. To sign tokens with your own key instead of one derived from the
service-role key, set a secret: `supabase secrets set KT_AUTH_SECRET=...`.
Changing it signs everyone out.

## Limits

Supabase's free plan allows about 200 simultaneous Realtime connections
and 2 million Realtime messages a month. That is enough for testing and a
small launch. For lakhs of players, move to a paid Supabase plan with
raised Realtime limits, or run the Node/Redis game server in `server/`,
which was built and load-tested for that.
