-- Migration number: 0003 	 Watchlist order (ADR-0041).
--
-- The order a person chose for their watchlist: one row per film, `position` 1 first. Being on
-- the watchlist is still the `watchlist` tag (tags table); this table only says where each film
-- sits. Films added since the last reorder have no row and are listed first, newest first.
-- - The server rewrites a user's whole order in one D1 batch on every reorder (delete, then
--   insert), and drops the row of any film that leaves the watchlist after every tag change, so a
--   film added again later starts at the top.
-- - A film appears at most once per user (the primary key), and positions are unique per user.
-- Deleting a user cascades here too; the delete-account Function also deletes these rows itself.

CREATE TABLE watchlist_order (
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  tmdb_id INTEGER NOT NULL CHECK (tmdb_id > 0),
  position INTEGER NOT NULL CHECK (position >= 1),
  PRIMARY KEY (user_id, tmdb_id),
  UNIQUE (user_id, position)
);
