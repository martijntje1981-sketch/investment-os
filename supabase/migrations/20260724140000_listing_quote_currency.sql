ALTER TABLE public.holding_instrument_mappings
  ADD COLUMN IF NOT EXISTS quote_currency char(3);

ALTER TABLE public.saved_import_mappings
  ADD COLUMN IF NOT EXISTS quote_currency char(3);

ALTER TABLE public.holding_instrument_mappings
  DROP CONSTRAINT IF EXISTS holding_instrument_mappings_quote_currency_check;

ALTER TABLE public.holding_instrument_mappings
  ADD CONSTRAINT holding_instrument_mappings_quote_currency_check CHECK (
    quote_currency IS NULL OR quote_currency IN ('EUR', 'USD', 'GBP', 'CHF')
  );

ALTER TABLE public.saved_import_mappings
  DROP CONSTRAINT IF EXISTS saved_import_mappings_quote_currency_check;

ALTER TABLE public.saved_import_mappings
  ADD CONSTRAINT saved_import_mappings_quote_currency_check CHECK (
    quote_currency IS NULL OR quote_currency IN ('EUR', 'USD', 'GBP', 'CHF')
  );
