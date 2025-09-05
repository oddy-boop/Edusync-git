-- Migration: create assistant_logs table
-- Columns: id, user_id (uuid), prompt (text), response (text), created_at
CREATE TABLE IF NOT EXISTS assistant_logs (
  id bigserial primary key,
  user_id uuid NULL,
  prompt text NOT NULL,
  response text NOT NULL,
  created_at timestamptz DEFAULT now()
);
