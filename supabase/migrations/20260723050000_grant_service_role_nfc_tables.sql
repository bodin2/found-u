-- NFC APIs use createAdminClient (service_role); grants were missing from core tables migration
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nfc_tags TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nfc_found_reports TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_logs TO service_role;

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['nfc_tags', 'nfc_found_reports', 'activity_logs']
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = tbl
        AND policyname = 'service_role_all_' || tbl
    ) THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',
        'service_role_all_' || tbl,
        tbl
      );
    END IF;
  END LOOP;
END $$;
