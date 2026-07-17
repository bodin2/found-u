-- Coming soon is off by default (admins can enable from Settings)
UPDATE public.app_settings
SET settings = COALESCE(settings, '{}'::jsonb) || jsonb_build_object(
  'comingSoonEnabled', false,
  'comingSoonMessage', 'พบกันเร็วๆนี้'
),
updated_at = now()
WHERE id = 'default';

-- Ensure default row exists if missing
INSERT INTO public.app_settings (id, settings, updated_at)
SELECT 'default', jsonb_build_object(
  'comingSoonEnabled', false,
  'comingSoonMessage', 'พบกันเร็วๆนี้'
), now()
WHERE NOT EXISTS (SELECT 1 FROM public.app_settings WHERE id = 'default');;
