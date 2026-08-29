-- Phase A: persist allowlisted portfolio base currency from signup metadata.
-- Existing users keep EUR. Invalid trusts only EUR/USD/GBP; anything else → EUR.
-- Does not insert duplicate user_settings rows (ON CONFLICT DO NOTHING).

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_base_currency char(3);
  v_raw_currency text;
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email)
  )
  ON CONFLICT (id) DO NOTHING;

  v_raw_currency := upper(trim(COALESCE(NEW.raw_user_meta_data ->> 'base_currency', 'EUR')));
  IF v_raw_currency IN ('EUR', 'USD', 'GBP') THEN
    v_base_currency := v_raw_currency;
  ELSE
    v_base_currency := 'EUR';
  END IF;

  INSERT INTO public.user_settings (user_id, base_currency)
  VALUES (NEW.id, v_base_currency)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.portfolios (user_id, name, is_primary)
  SELECT NEW.id, 'Main portfolio', true
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.portfolios p
    WHERE p.user_id = NEW.id
      AND p.is_primary = true
  );

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
