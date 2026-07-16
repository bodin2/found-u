-- Setup wizard storage buckets (Module 4)
-- school-branding: wizard logo uploads
-- item-uploads: lost/found images when R2 is not configured

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'school-branding',
    'school-branding',
    true,
    5242880,
    ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
  ),
  (
    'item-uploads',
    'item-uploads',
    true,
    10485760,
    ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
  )
ON CONFLICT (id) DO NOTHING;

-- Public read for branding assets
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'school_branding_public_read'
  ) THEN
    CREATE POLICY school_branding_public_read
      ON storage.objects FOR SELECT
      TO public
      USING (bucket_id = 'school-branding');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'school_branding_service_write'
  ) THEN
    CREATE POLICY school_branding_service_write
      ON storage.objects FOR ALL
      TO service_role
      USING (bucket_id = 'school-branding')
      WITH CHECK (bucket_id = 'school-branding');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'item_uploads_public_read'
  ) THEN
    CREATE POLICY item_uploads_public_read
      ON storage.objects FOR SELECT
      TO public
      USING (bucket_id = 'item-uploads');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'item_uploads_service_write'
  ) THEN
    CREATE POLICY item_uploads_service_write
      ON storage.objects FOR ALL
      TO service_role
      USING (bucket_id = 'item-uploads')
      WITH CHECK (bucket_id = 'item-uploads');
  END IF;
END $$;
