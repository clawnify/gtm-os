-- Baseline DDL applied by the build pipeline. Kept in step with schema.ts,
-- which is the source the query builder is typed from.
--
-- Replayed on every deploy, so every statement is idempotent.

CREATE TABLE IF NOT EXISTS drafts (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  org_id text NOT NULL,
  kind text NOT NULL,
  title text,
  body text NOT NULL,
  status text DEFAULT 'pending' NOT NULL,
  author text,
  rationale text,
  open_question text,
  sources text,
  meta text,
  review_note text,
  reviewed_at text,
  reviewed_by text,
  destination text,
  destination_app_id text,
  destination_ref text,
  delivery text,
  delivery_error text,
  created_at text NOT NULL,
  updated_at text NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_drafts_org_status ON drafts (org_id, status, created_at);
