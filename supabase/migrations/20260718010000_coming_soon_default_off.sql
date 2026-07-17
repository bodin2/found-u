-- Flip coming-soon off for existing installs (was seeded true).
-- Admins can re-enable from /admin/settings.
UPDATE public.app_settings
SET settings = COALESCE(settings, '{}'::jsonb) || jsonb_build_object(
  'comingSoonEnabled', false
),
updated_at = now()
WHERE id = 'default';
