# Phase 1 database migrations

These SQL migrations define the Investment OS cloud data foundation. They are **not wired to the Next.js app yet** and do not change current localStorage behaviour.

## Before applying remotely

1. Confirm the target Supabase project is a **separate staging/development** instance — not production.
2. Confirm the project region is **EU**.
3. Take a backup or use a disposable staging project for the first apply.
4. Apply in filename order using the Supabase CLI or SQL editor:

   ```bash
   supabase db push
   ```

   Or paste each file into the Supabase SQL editor on staging.

## Do not apply to production

Until Phase 2+ application integration is complete and tested on staging, do **not** run these migrations against the production project referenced by the app's `.env.local`.

## Verification

After applying to a **local or staging** database:

```bash
npm run test:db
npm test
npx tsc --noEmit
```

For executable PostgreSQL checks (local Supabase or staging only):

```bash
npx supabase db reset
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -v ON_ERROR_STOP=1 -f supabase/tests/database/phase1_verification.sql
```

Never commit database URLs, service-role keys, or `.env.local` contents.
