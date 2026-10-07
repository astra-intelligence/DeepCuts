-- Migration number: 0001 	 Accounts schema (ADR-0031, Stage 6 A1).
--
-- Accounts sign in with passkeys and sign up with single-use invites. Rules that hold everywhere:
-- - Every id is random (never sequential), so ids can't be guessed or counted.
-- - Session ids and invite codes are stored only as SHA-256 hashes (hex), so a database leak
--   hands out no live session and no usable invite.
-- - Times are Unix milliseconds (INTEGER), except tags.created_at, which is the ISO string the
--   app's tag records already use (src/adapters/TagRepository.ts).
-- D1 enforces foreign keys. Deleting a user cascades to everything they own; the delete-account
-- Function also deletes each table explicitly, so it never depends on the cascade alone.

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
  created_at INTEGER NOT NULL
);

-- One row per passkey. A user can have several (a recovery invite adds one).
CREATE TABLE passkeys (
  -- WebAuthn credential id, base64url.
  credential_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  -- COSE public key bytes, from the authenticator at registration.
  public_key BLOB NOT NULL,
  -- Signature counter (0 for most synced passkeys); a decrease signals a cloned authenticator.
  counter INTEGER NOT NULL DEFAULT 0,
  -- JSON array of transport hints ("internal", "hybrid", …), or NULL.
  transports TEXT,
  created_at INTEGER NOT NULL,
  last_used_at INTEGER
);
CREATE INDEX passkeys_user ON passkeys (user_id);

CREATE TABLE sessions (
  -- SHA-256 (hex) of the 32 random bytes in the cookie. The raw id is never stored.
  id_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX sessions_user ON sessions (user_id);

CREATE TABLE invites (
  -- SHA-256 (hex) of the invite code. The raw code exists only in the printed link.
  code_hash TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  used_at INTEGER,
  -- Set for a recovery invite: it adds a passkey to this existing user instead of a new account.
  user_id TEXT REFERENCES users (id) ON DELETE CASCADE
);

-- WebAuthn challenges: single-use, 5-minute lifetime. Deleted when used.
CREATE TABLE challenges (
  id TEXT PRIMARY KEY,
  challenge TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('register', 'authenticate')),
  -- Registration only: the invite, name and (new or recovered) user id the challenge was issued
  -- for, so the verify step can't swap them.
  invite_code_hash TEXT,
  name TEXT,
  user_id TEXT,
  expires_at INTEGER NOT NULL
);

-- One row per tag on a film, per user (the same shape as the app's tag records).
CREATE TABLE tags (
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  tmdb_id INTEGER NOT NULL CHECK (tmdb_id > 0),
  tag TEXT NOT NULL CHECK (tag IN ('seen', 'watchlist', 'liked', 'disliked')),
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, tmdb_id, tag)
);
