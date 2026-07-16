-- Unified accounts table (merges profiles + student_accounts for app runtime)
CREATE TABLE IF NOT EXISTS public.accounts (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id char(5) UNIQUE,
  email text NOT NULL DEFAULT '',
  display_name text NOT NULL DEFAULT '',
  photo_url text,
  role public.user_role NOT NULL DEFAULT 'user',
  first_name text,
  last_name text,
  nickname text,
  shown_name text,
  is_student_verified boolean NOT NULL DEFAULT false,
  auth_methods text[] DEFAULT '{}',
  must_change_password boolean NOT NULL DEFAULT false,
  has_seen_tutorial boolean NOT NULL DEFAULT false,
  ban_status public.ban_status NOT NULL DEFAULT 'none',
  ban_reason text,
  banned_at timestamptz,
  banned_by uuid,
  timeout_until timestamptz,
  school_password_hash text,
  current_password_hash text,
  has_logged_in_once boolean NOT NULL DEFAULT false,
  linked_uid uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  pin_hash text,
  passkey_credentials jsonb NOT NULL DEFAULT '[]'::jsonb,
  status public.student_account_status NOT NULL DEFAULT 'active',
  import_batch_id text,
  grade_level text,
  room_number text,
  is_registered boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_accounts_student_id ON public.accounts(student_id);
CREATE INDEX IF NOT EXISTS idx_accounts_linked_uid ON public.accounts(linked_uid) WHERE linked_uid IS NOT NULL;

DROP TRIGGER IF EXISTS accounts_updated_at ON public.accounts;
CREATE TRIGGER accounts_updated_at
  BEFORE UPDATE ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Migrate legacy rows when upgrading from profiles + student_accounts
INSERT INTO public.accounts (
  id,
  student_id,
  email,
  display_name,
  photo_url,
  role,
  first_name,
  last_name,
  nickname,
  shown_name,
  is_student_verified,
  auth_methods,
  must_change_password,
  has_seen_tutorial,
  ban_status,
  ban_reason,
  banned_at,
  banned_by,
  timeout_until,
  school_password_hash,
  current_password_hash,
  has_logged_in_once,
  linked_uid,
  pin_hash,
  passkey_credentials,
  status,
  import_batch_id,
  is_registered,
  created_at,
  updated_at
)
SELECT
  p.id,
  COALESCE(p.student_id, sa.student_id),
  p.email,
  p.display_name,
  p.photo_url,
  p.role,
  COALESCE(p.first_name, sa.first_name),
  COALESCE(p.last_name, sa.last_name),
  COALESCE(p.nickname, sa.nickname),
  p.shown_name,
  p.is_student_verified,
  p.auth_methods,
  COALESCE(p.must_change_password, sa.must_change_password),
  p.has_seen_tutorial,
  p.ban_status,
  p.ban_reason,
  p.banned_at,
  p.banned_by,
  p.timeout_until,
  sa.school_password_hash,
  sa.current_password_hash,
  COALESCE(sa.has_logged_in_once, false),
  COALESCE(sa.linked_uid, p.id),
  sa.pin_hash,
  COALESCE(sa.passkey_credentials, '[]'::jsonb),
  COALESCE(sa.status, 'active'::public.student_account_status),
  sa.import_batch_id,
  COALESCE(sa.has_logged_in_once, false) OR sa.current_password_hash IS NOT NULL,
  LEAST(p.created_at, COALESCE(sa.created_at, p.created_at)),
  GREATEST(p.updated_at, COALESCE(sa.updated_at, p.updated_at))
FROM public.profiles p
LEFT JOIN public.student_accounts sa
  ON sa.student_id = p.student_id OR sa.linked_uid = p.id
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.accounts (
  id,
  student_id,
  email,
  display_name,
  first_name,
  last_name,
  nickname,
  school_password_hash,
  current_password_hash,
  must_change_password,
  has_logged_in_once,
  linked_uid,
  pin_hash,
  passkey_credentials,
  status,
  import_batch_id,
  is_registered,
  created_at,
  updated_at
)
SELECT
  sa.linked_uid,
  sa.student_id,
  COALESCE(sa.linked_uid::text, sa.student_id) || '@students.local',
  TRIM(sa.first_name || ' ' || sa.last_name),
  sa.first_name,
  sa.last_name,
  sa.nickname,
  sa.school_password_hash,
  sa.current_password_hash,
  sa.must_change_password,
  sa.has_logged_in_once,
  sa.linked_uid,
  sa.pin_hash,
  sa.passkey_credentials,
  sa.status,
  sa.import_batch_id,
  sa.has_logged_in_once OR sa.current_password_hash IS NOT NULL,
  sa.created_at,
  sa.updated_at
FROM public.student_accounts sa
WHERE sa.linked_uid IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.accounts a
    WHERE a.student_id = sa.student_id OR a.id = sa.linked_uid
  )
ON CONFLICT (id) DO NOTHING;
