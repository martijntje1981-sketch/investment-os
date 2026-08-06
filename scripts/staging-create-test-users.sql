-- Creates disposable staging auth users for portfolio sync integration testing.

DO $$
DECLARE
  v_user_a uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'::uuid;
  v_user_b uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'::uuid;
BEGIN
  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  )
  VALUES (
    v_user_a,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'portfolio-sync-a@example.com',
    extensions.crypt('PortfolioSyncStaging!A1', extensions.gen_salt('bf')),
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Portfolio Sync Test A"}'::jsonb,
    timezone('utc', now()),
    timezone('utc', now())
  )
  ON CONFLICT (id) DO UPDATE
    SET encrypted_password = EXCLUDED.encrypted_password,
        email_confirmed_at = EXCLUDED.email_confirmed_at,
        updated_at = timezone('utc', now());

  INSERT INTO auth.identities (
    id,
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  )
  VALUES (
    v_user_a,
    v_user_a::text,
    v_user_a,
    jsonb_build_object('sub', v_user_a::text, 'email', 'portfolio-sync-a@example.com'),
    'email',
    timezone('utc', now()),
    timezone('utc', now()),
    timezone('utc', now())
  )
  ON CONFLICT (provider_id, provider) DO UPDATE
    SET identity_data = EXCLUDED.identity_data,
        updated_at = timezone('utc', now());

  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  )
  VALUES (
    v_user_b,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'portfolio-sync-b@example.com',
    extensions.crypt('PortfolioSyncStaging!B2', extensions.gen_salt('bf')),
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Portfolio Sync Test B"}'::jsonb,
    timezone('utc', now()),
    timezone('utc', now())
  )
  ON CONFLICT (id) DO UPDATE
    SET encrypted_password = EXCLUDED.encrypted_password,
        email_confirmed_at = EXCLUDED.email_confirmed_at,
        updated_at = timezone('utc', now());

  INSERT INTO auth.identities (
    id,
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  )
  VALUES (
    v_user_b,
    v_user_b::text,
    v_user_b,
    jsonb_build_object('sub', v_user_b::text, 'email', 'portfolio-sync-b@example.com'),
    'email',
    timezone('utc', now()),
    timezone('utc', now()),
    timezone('utc', now())
  )
  ON CONFLICT (provider_id, provider) DO UPDATE
    SET identity_data = EXCLUDED.identity_data,
        updated_at = timezone('utc', now());
END $$;

SELECT 'staging_sync_users_ready' AS result;
