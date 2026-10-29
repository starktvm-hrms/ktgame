-- Kerala Explorer player accounts. Applied automatically on server start.
CREATE TABLE IF NOT EXISTS players (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT        NOT NULL,
  phone       TEXT        NOT NULL UNIQUE,      -- E.164, e.g. +919876543210
  pass_hash   TEXT        NOT NULL,             -- scrypt$N$salt$key
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login  TIMESTAMPTZ NOT NULL DEFAULT now(),
  character   JSONB,                            -- avatar look (gender, outfit, hair ...)
  progress    JSONB                             -- saved game: coins, xp, districts ...
);

-- Leaderboards / profile listings by progress.
CREATE INDEX IF NOT EXISTS players_level_idx ON players (((progress->>'level')::int) DESC NULLS LAST);

-- Unique @usernames (lower case).
ALTER TABLE players ADD COLUMN IF NOT EXISTS username TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS players_username_key ON players (username);

-- Groups (public / private), members, invitations and chat.
CREATE TABLE IF NOT EXISTS groups (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT        NOT NULL,
  description TEXT        NOT NULL DEFAULT '',
  visibility  TEXT        NOT NULL CHECK (visibility IN ('public', 'private')),
  owner_id    BIGINT      NOT NULL REFERENCES players (id) ON DELETE CASCADE,
  channel_key TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS groups_public_idx ON groups (visibility, created_at DESC);

CREATE TABLE IF NOT EXISTS group_members (
  group_id  BIGINT      NOT NULL REFERENCES groups (id) ON DELETE CASCADE,
  player_id BIGINT      NOT NULL REFERENCES players (id) ON DELETE CASCADE,
  role      TEXT        NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, player_id)
);
CREATE INDEX IF NOT EXISTS group_members_player_idx ON group_members (player_id);

CREATE TABLE IF NOT EXISTS group_invites (
  id         BIGSERIAL PRIMARY KEY,
  group_id   BIGINT      NOT NULL REFERENCES groups (id) ON DELETE CASCADE,
  from_id    BIGINT      NOT NULL REFERENCES players (id) ON DELETE CASCADE,
  to_id      BIGINT      NOT NULL REFERENCES players (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (group_id, to_id)
);
CREATE INDEX IF NOT EXISTS group_invites_to_idx ON group_invites (to_id);

CREATE TABLE IF NOT EXISTS group_messages (
  id         BIGSERIAL PRIMARY KEY,
  group_id   BIGINT      NOT NULL REFERENCES groups (id) ON DELETE CASCADE,
  player_id  BIGINT      NOT NULL REFERENCES players (id) ON DELETE CASCADE,
  text       TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS group_messages_group_idx ON group_messages (group_id, id DESC);
