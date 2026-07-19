-- Phase 1: enums and shared types
-- Investment OS cloud foundation (UTC timestamptz + user IANA timezone in settings)

BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'asset_type') THEN
    CREATE TYPE public.asset_type AS ENUM ('investment', 'cash');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_type') THEN
    CREATE TYPE public.transaction_type AS ENUM (
      'buy',
      'sell',
      'deposit',
      'withdrawal',
      'adjustment',
      'split',
      'fee'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'import_source_type') THEN
    CREATE TYPE public.import_source_type AS ENUM (
      'screenshot',
      'csv',
      'xlsx',
      'manual'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'import_job_status') THEN
    CREATE TYPE public.import_job_status AS ENUM (
      'uploaded',
      'processing',
      'review',
      'committing',
      'committed',
      'failed',
      'cancelled'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'import_row_status') THEN
    CREATE TYPE public.import_row_status AS ENUM (
      'parsed',
      'matched',
      'pending_confirmation',
      'confirmed',
      'rejected',
      'committed'
    );
  END IF;
END $$;

COMMIT;
