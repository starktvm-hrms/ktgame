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
