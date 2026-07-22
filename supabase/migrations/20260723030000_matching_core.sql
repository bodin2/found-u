-- Matching core: dismissals, indexes, atomic confirm/unmatch RPCs

CREATE TABLE IF NOT EXISTS public.match_dismissals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lost_id uuid NOT NULL REFERENCES public.lost_items(id) ON DELETE CASCADE,
  found_id uuid NOT NULL REFERENCES public.found_items(id) ON DELETE CASCADE,
  dismissed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lost_id, found_id)
);

CREATE INDEX IF NOT EXISTS idx_lost_items_status_date
  ON public.lost_items (status, date_lost);

CREATE INDEX IF NOT EXISTS idx_found_items_status_date
  ON public.found_items (status, date_found);

CREATE INDEX IF NOT EXISTS idx_lost_items_matched_found
  ON public.lost_items (matched_found_id)
  WHERE matched_found_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_found_items_matched_lost
  ON public.found_items (matched_lost_id)
  WHERE matched_lost_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_match_dismissals_pair
  ON public.match_dismissals (lost_id, found_id);

ALTER TABLE public.match_dismissals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS match_dismissals_admin_all ON public.match_dismissals;
CREATE POLICY match_dismissals_admin_all ON public.match_dismissals
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

GRANT SELECT, INSERT, DELETE ON public.match_dismissals TO authenticated;
GRANT ALL ON public.match_dismissals TO service_role;

-- Atomic confirm: link pair, lost→found, found→found (never claimed)
CREATE OR REPLACE FUNCTION public.confirm_item_match(
  p_lost_id uuid,
  p_found_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lost public.lost_items%ROWTYPE;
  v_found public.found_items%ROWTYPE;
BEGIN
  SELECT * INTO v_lost
  FROM public.lost_items
  WHERE id = p_lost_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'lost_not_found');
  END IF;

  SELECT * INTO v_found
  FROM public.found_items
  WHERE id = p_found_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'found_not_found');
  END IF;

  IF v_lost.status IS DISTINCT FROM 'searching' OR v_lost.matched_found_id IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'lost_not_matchable');
  END IF;

  IF v_found.status NOT IN ('pending_room_confirm', 'found')
     OR v_found.matched_lost_id IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'found_not_matchable');
  END IF;

  UPDATE public.lost_items
  SET
    matched_found_id = p_found_id,
    status = 'found',
    updated_at = now()
  WHERE id = p_lost_id;

  UPDATE public.found_items
  SET
    matched_lost_id = p_lost_id,
    status = 'found',
    updated_at = now()
  WHERE id = p_found_id;

  RETURN jsonb_build_object(
    'ok', true,
    'lost_id', p_lost_id,
    'found_id', p_found_id
  );
END;
$$;

-- Atomic unmatch: clear links, lost→searching, found stays ready (found)
CREATE OR REPLACE FUNCTION public.unmatch_item_match(
  p_lost_id uuid,
  p_found_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lost public.lost_items%ROWTYPE;
  v_found public.found_items%ROWTYPE;
BEGIN
  SELECT * INTO v_lost
  FROM public.lost_items
  WHERE id = p_lost_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'lost_not_found');
  END IF;

  SELECT * INTO v_found
  FROM public.found_items
  WHERE id = p_found_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'found_not_found');
  END IF;

  IF v_lost.matched_found_id IS DISTINCT FROM p_found_id
     OR v_found.matched_lost_id IS DISTINCT FROM p_lost_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_linked');
  END IF;

  UPDATE public.lost_items
  SET
    matched_found_id = NULL,
    status = 'searching',
    updated_at = now()
  WHERE id = p_lost_id;

  UPDATE public.found_items
  SET
    matched_lost_id = NULL,
    status = 'found',
    updated_at = now()
  WHERE id = p_found_id;

  RETURN jsonb_build_object(
    'ok', true,
    'lost_id', p_lost_id,
    'found_id', p_found_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirm_item_match(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.unmatch_item_match(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.confirm_item_match(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unmatch_item_match(uuid, uuid) TO authenticated;
