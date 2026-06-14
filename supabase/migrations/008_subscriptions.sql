-- ============================================================
-- 008_subscriptions.sql — 월 구독 모델 v1
--
-- 도입 배경: 페이지 단위 일회성 결제 → 사용자 단위 월 구독 추가 (혼합 모델)
-- - subscriptions: Google 로그인 사용자의 정기결제 상태
-- - pages.size_bytes: 페이지별 데이터 크기 (티어별 용량 한도 적용용)
-- - user_storage_usage: 사용자별 보유 페이지 수·총 용량 집계 뷰
-- ============================================================

-- ── 1. subscriptions 테이블 ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier                   TEXT NOT NULL CHECK (tier IN ('lite', 'pro')),
  billing_cycle          TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),
  status                 TEXT NOT NULL CHECK (status IN ('active', 'past_due', 'canceled', 'paused')),

  -- 토스 자동결제 키 (Toss issues `billingKey` per `customerKey`)
  -- customerKey는 사용자별 고정 (auth.users.id 기반으로 발급)
  billing_key            TEXT NOT NULL,
  customer_key           TEXT NOT NULL,
  card_company           TEXT,
  card_number_masked     TEXT,

  -- 결제 주기 추적
  current_period_start   TIMESTAMPTZ NOT NULL,
  current_period_end     TIMESTAMPTZ NOT NULL,
  next_charge_at         TIMESTAMPTZ NOT NULL,  -- 다음 청구 예정 시각 (cron이 이 컬럼 기반으로 청구)

  -- 해지
  cancel_at_period_end   BOOLEAN NOT NULL DEFAULT FALSE,
  canceled_at            TIMESTAMPTZ,

  -- 실패 재시도
  failed_charge_count    INTEGER NOT NULL DEFAULT 0,

  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 한 사용자는 active 구독을 동시에 하나만 보유
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_one_active_per_user
  ON public.subscriptions (user_id) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_subscriptions_next_charge
  ON public.subscriptions (next_charge_at)
  WHERE status = 'active' AND cancel_at_period_end = FALSE;

CREATE INDEX IF NOT EXISTS idx_subscriptions_user
  ON public.subscriptions (user_id);

-- RLS — service_role만 직접 접근. 클라이언트는 API 라우트 통해서만.
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY subscriptions_select_own ON public.subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- INSERT/UPDATE/DELETE는 service_role만 (API 라우트가 admin client로 처리)


-- ── 2. subscription_charges 로그 (각 청구 시도 기록) ──────────
CREATE TABLE IF NOT EXISTS public.subscription_charges (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id     UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  order_id            TEXT NOT NULL UNIQUE,
  amount              INTEGER NOT NULL,
  status              TEXT NOT NULL CHECK (status IN ('success', 'failed')),
  payment_key         TEXT,
  error_code          TEXT,
  error_message       TEXT,
  attempted_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_charges_sub
  ON public.subscription_charges (subscription_id, attempted_at DESC);

ALTER TABLE public.subscription_charges ENABLE ROW LEVEL SECURITY;

CREATE POLICY subscription_charges_select_own ON public.subscription_charges
  FOR SELECT
  TO authenticated
  USING (
    subscription_id IN (
      SELECT id FROM public.subscriptions WHERE user_id = auth.uid()
    )
  );


-- ── 3. pages.size_bytes 컬럼 + 자동 계산 트리거 ───────────────
ALTER TABLE public.pages
  ADD COLUMN IF NOT EXISTS size_bytes BIGINT NOT NULL DEFAULT 0;

-- 함수: pages 행의 크기 계산 (html_content + blocks JSON)
-- 첨부된 이미지/PDF는 Supabase Storage에 있으므로 별도 집계 필요 (이번 마이그레이션 범위 외)
CREATE OR REPLACE FUNCTION public.compute_page_size_bytes(html TEXT, blocks JSONB)
RETURNS BIGINT
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT COALESCE(OCTET_LENGTH(html), 0)
       + COALESCE(OCTET_LENGTH(blocks::TEXT), 0);
$$;

CREATE OR REPLACE FUNCTION public.set_page_size_bytes()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.size_bytes := public.compute_page_size_bytes(NEW.html_content, NEW.blocks);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pages_size_bytes ON public.pages;
CREATE TRIGGER trg_pages_size_bytes
  BEFORE INSERT OR UPDATE OF html_content, blocks ON public.pages
  FOR EACH ROW
  EXECUTE FUNCTION public.set_page_size_bytes();

-- 기존 데이터 일괄 갱신
UPDATE public.pages
SET size_bytes = public.compute_page_size_bytes(html_content, blocks)
WHERE size_bytes = 0;


-- ── 4. user_storage_usage 뷰 ────────────────────────────────
-- 사용자별 보유 페이지 수 + 총 데이터 크기 집계 (Storage 객체 용량은 별도 작업)
CREATE OR REPLACE VIEW public.user_storage_usage AS
SELECT
  user_id,
  COUNT(*) FILTER (WHERE deleted_at IS NULL) AS page_count,
  COALESCE(SUM(size_bytes) FILTER (WHERE deleted_at IS NULL), 0) AS pages_bytes
FROM public.pages
WHERE user_id IS NOT NULL
GROUP BY user_id;


-- ── 5. updated_at 자동 갱신 트리거 ────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER trg_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
