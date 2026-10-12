-- Migration number: 0002 	 Top Ten (ADR-0036).
--
-- One row per film in a user's Top Ten: their ten favourite films in their own order (ADR-0033).
-- It's separate from `tags`: adding a film here never changes its tags.
-- - `position` is the film's rank, 1 to 10, unique per user, so a list can never hold more than
--   ten films or two films in one place, even if the API had a bug.
-- - A film appears at most once per user (the primary key).
-- - The server rewrites a user's whole list in one D1 batch on every change (delete, then insert),
--   which keeps positions gapless and lets the later reorder feature reuse the same write.
-- Deleting a user cascades here too; the delete-account Function also deletes these rows itself.

CREATE TABLE top_ten (
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  tmdb_id INTEGER NOT NULL CHECK (tmdb_id > 0),
  position INTEGER NOT NULL CHECK (position BETWEEN 1 AND 10),
  PRIMARY KEY (user_id, tmdb_id),
  UNIQUE (user_id, position)
);
