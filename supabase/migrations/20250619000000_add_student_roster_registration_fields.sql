ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS grade_level text,
  ADD COLUMN IF NOT EXISTS room_number text,
  ADD COLUMN IF NOT EXISTS is_registered boolean NOT NULL DEFAULT false;

UPDATE accounts
SET is_registered = true
WHERE has_logged_in_once = true OR current_password_hash IS NOT NULL;
