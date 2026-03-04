begin;

-- No-op migration: documents that staff_invites policies were removed
-- when the table was dropped in 20260304120000 (via DROP TABLE CASCADE).
-- The explicit DROP POLICY statements are skipped since the table no longer exists.

commit;
