-- ============================================================
-- 016. 관리자 사용자 대시보드 — 집계 함수 + 감사로그 + 수동 티어 인프라
-- ============================================================

-- ① 수동 티어 부여 인프라: 관리자 부여 구독은 토스 키가 없으므로 NOT NULL 완화
ALTER TABLE public.subscriptions ALTER COLUMN billing_key  DROP NOT NULL;
ALTER TABLE public.subscriptions ALTER COLUMN customer_key DROP NOT NULL;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS granted_by_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- ② 감사 로그 (service_role 전용)
CREATE TABLE IF NOT EXISTS public.admin_actions (
  id          BIGSERIAL PRIMARY KEY,
  action      TEXT NOT NULL,
  target_type TEXT,
  target_id   TEXT,
  meta        JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_admin_actions_time ON public.admin_actions(created_at DESC);

-- ③ subscription_charges 합산 가속
CREATE INDEX IF NOT EXISTS idx_subscription_charges_status ON public.subscription_charges(subscription_id, status);

-- ④ 사용자별 집계 — auth.users + pages + subscriptions + 매출을 한 번에
CREATE OR REPLACE FUNCTION public.admin_user_overview(
  p_search text DEFAULT '',
  p_tier   text DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_sort   text DEFAULT 'created',
  p_limit  int  DEFAULT 20,
  p_offset int  DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  email text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  banned_until timestamptz,
  tier text,
  sub_status text,
  next_charge_at timestamptz,
  failed_charge_count int,
  cancel_at_period_end boolean,
  granted_by_admin boolean,
  revenue_total bigint,
  page_count bigint,
  text_bytes bigint,
  attachment_bytes bigint,
  report_total bigint,
  locked_count bigint,
  listed_count bigint,
  last_page_at timestamptz,
  total_count bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth, storage
AS $$
WITH pg AS (
  SELECT user_id,
    count(*) FILTER (WHERE deleted_at IS NULL) AS page_count,
    coalesce(sum(size_bytes) FILTER (WHERE deleted_at IS NULL), 0) AS text_bytes,
    coalesce(sum(report_count) FILTER (WHERE deleted_at IS NULL), 0) AS report_total,
    count(*) FILTER (WHERE deleted_at IS NULL AND locked) AS locked_count,
    count(*) FILTER (WHERE deleted_at IS NULL AND listed) AS listed_count,
    max(created_at) AS last_page_at
  FROM public.pages WHERE user_id IS NOT NULL GROUP BY user_id
),
sub AS (
  SELECT DISTINCT ON (user_id)
    user_id, tier, status, next_charge_at, failed_charge_count, cancel_at_period_end, granted_by_admin
  FROM public.subscriptions
  ORDER BY user_id, (status IN ('active','past_due')) DESC, created_at DESC
),
rev AS (
  SELECT s.user_id, coalesce(sum(c.amount) FILTER (WHERE c.status='success'), 0) AS revenue_total
  FROM public.subscriptions s
  JOIN public.subscription_charges c ON c.subscription_id = s.id
  GROUP BY s.user_id
),
base AS (
  SELECT
    u.id,
    u.email::text AS email,
    u.created_at,
    u.last_sign_in_at,
    u.banned_until,
    CASE WHEN sub.status IN ('active','past_due') THEN sub.tier ELSE 'free' END AS tier,
    sub.status AS sub_status,
    sub.next_charge_at,
    coalesce(sub.failed_charge_count, 0) AS failed_charge_count,
    coalesce(sub.cancel_at_period_end, false) AS cancel_at_period_end,
    coalesce(sub.granted_by_admin, false) AS granted_by_admin,
    coalesce(rev.revenue_total, 0) AS revenue_total,
    coalesce(pg.page_count, 0) AS page_count,
    coalesce(pg.text_bytes, 0) AS text_bytes,
    coalesce(pg.report_total, 0) AS report_total,
    coalesce(pg.locked_count, 0) AS locked_count,
    coalesce(pg.listed_count, 0) AS listed_count,
    pg.last_page_at
  FROM auth.users u
  LEFT JOIN sub ON sub.user_id = u.id
  LEFT JOIN rev ON rev.user_id = u.id
  LEFT JOIN pg  ON pg.user_id  = u.id
  WHERE (p_search = '' OR u.email ILIKE '%' || p_search || '%')
    AND (p_tier IS NULL OR (CASE WHEN sub.status IN ('active','past_due') THEN sub.tier ELSE 'free' END) = p_tier)
    AND (p_status IS NULL OR coalesce(sub.status, 'none') = p_status)
),
counted AS (
  SELECT *, count(*) OVER() AS total_count FROM base
),
paged AS (
  SELECT * FROM counted
  ORDER BY
    CASE WHEN p_sort='pages'   THEN page_count    END DESC NULLS LAST,
    CASE WHEN p_sort='storage' THEN text_bytes    END DESC NULLS LAST,
    CASE WHEN p_sort='revenue' THEN revenue_total END DESC NULLS LAST,
    CASE WHEN p_sort='active'  THEN last_page_at  END DESC NULLS LAST,
    created_at DESC
  LIMIT p_limit OFFSET p_offset
)
SELECT
  paged.id, paged.email, paged.created_at, paged.last_sign_in_at, paged.banned_until,
  paged.tier, paged.sub_status, paged.next_charge_at, paged.failed_charge_count,
  paged.cancel_at_period_end, paged.granted_by_admin, paged.revenue_total,
  paged.page_count, paged.text_bytes,
  public.get_user_storage_bytes(paged.id) AS attachment_bytes,
  paged.report_total, paged.locked_count, paged.listed_count, paged.last_page_at,
  paged.total_count
FROM paged
ORDER BY
  CASE WHEN p_sort='pages'   THEN page_count    END DESC NULLS LAST,
  CASE WHEN p_sort='storage' THEN text_bytes    END DESC NULLS LAST,
  CASE WHEN p_sort='revenue' THEN revenue_total END DESC NULLS LAST,
  CASE WHEN p_sort='active'  THEN last_page_at  END DESC NULLS LAST,
  created_at DESC;
$$;
