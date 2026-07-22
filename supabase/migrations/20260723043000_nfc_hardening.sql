-- NFC hardening: unique hardware UID, NDEF write audit, FK for last report

CREATE UNIQUE INDEX IF NOT EXISTS idx_nfc_tags_tag_uid_unique
  ON public.nfc_tags (tag_uid)
  WHERE tag_uid IS NOT NULL AND tag_uid <> '';

ALTER TABLE public.nfc_tags
  ADD COLUMN IF NOT EXISTS ndef_written_at timestamptz;

-- last_found_report_id → nfc_found_reports (nullable; SET NULL on delete)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'nfc_tags_last_found_report_id_fkey'
  ) THEN
    ALTER TABLE public.nfc_tags
      ADD CONSTRAINT nfc_tags_last_found_report_id_fkey
      FOREIGN KEY (last_found_report_id)
      REFERENCES public.nfc_found_reports(id)
      ON DELETE SET NULL;
  END IF;
EXCEPTION
  WHEN others THEN
    -- Skip if existing orphan rows block FK; index uniqueness still applies
    RAISE NOTICE 'Skipping last_found_report_id FK: %', SQLERRM;
END $$;
