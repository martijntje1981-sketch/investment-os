-- Shared persistent daily EODHD API usage (one API key, all endpoints)

BEGIN;

CREATE TABLE IF NOT EXISTS public.eodhd_daily_usage (
  usage_date date PRIMARY KEY,
  calls_used integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT eodhd_daily_usage_calls_non_negative CHECK (calls_used >= 0)
);

ALTER TABLE public.eodhd_daily_usage ENABLE ROW LEVEL SECURITY;

COMMIT;
