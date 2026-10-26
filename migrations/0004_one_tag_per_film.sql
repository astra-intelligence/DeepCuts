-- Migration number: 0004 	 One tag per film; "Seen it" retired (ADR-0050).
--
-- A film now carries at most one tag: Want to see, Like or Dislike. This brings saved lists in
-- line, the same way the app cleans lists kept in the browser (createTagRepository.ts):
-- 1. Every "Seen it" row is deleted.
-- 2. Where a film still has two tags (Like and Want to see could overlap before), only the one
--    added most recently stays; for equal times, the row inserted later.
-- 3. Saved watchlist places of films no longer on the watchlist are dropped (ADR-0041).
-- The CHECK on tags.tag still allows 'seen': SQLite can't change a CHECK without rebuilding the
-- table, and the API's Zod schema already refuses it (server/accounts/tags.ts).

DELETE FROM tags WHERE tag = 'seen';

DELETE FROM tags
WHERE EXISTS (
  SELECT 1 FROM tags AS newer
  WHERE newer.user_id = tags.user_id
    AND newer.tmdb_id = tags.tmdb_id
    AND (newer.created_at > tags.created_at
      OR (newer.created_at = tags.created_at AND newer.rowid > tags.rowid))
);

DELETE FROM watchlist_order
WHERE NOT EXISTS (
  SELECT 1 FROM tags
  WHERE tags.user_id = watchlist_order.user_id
    AND tags.tmdb_id = watchlist_order.tmdb_id
    AND tags.tag = 'watchlist'
);
