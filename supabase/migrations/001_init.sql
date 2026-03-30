-- ============================================================
-- Leaf — Supabase PostgreSQL Schema
-- 작성일: 2026-03-29
-- ============================================================

-- UUID 확장
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. pages 테이블
-- ============================================================
CREATE TABLE IF NOT EXISTS public.pages (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT        NOT NULL UNIQUE,           -- 공유 URL (예: k8x2m9)
  blocks      JSONB       NOT NULL DEFAULT '[]',     -- 블록 배열
  pin_hash    TEXT        NOT NULL,                  -- bcrypt 해시 (cost 12)

  -- 시간 제한
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  delete_at   TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '365 days'),
  locked      BOOLEAN     NOT NULL DEFAULT FALSE,    -- 편집 잠금 여부

  -- 소유자 (결제 후 연결, 최초엔 NULL)
  user_id     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,

  -- 메타
  view_count  INTEGER     NOT NULL DEFAULT 0,
  deleted_at  TIMESTAMPTZ,                           -- soft delete
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스
CREATE UNIQUE INDEX idx_pages_slug ON public.pages (slug) WHERE deleted_at IS NULL;
CREATE INDEX idx_pages_expires_at ON public.pages (expires_at) WHERE locked = FALSE AND deleted_at IS NULL;
CREATE INDEX idx_pages_delete_at  ON public.pages (delete_at)  WHERE deleted_at IS NULL;
CREATE INDEX idx_pages_user_id    ON public.pages (user_id)    WHERE user_id IS NOT NULL;

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pages_updated_at
  BEFORE UPDATE ON public.pages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 2. payments 테이블
-- ============================================================
CREATE TABLE IF NOT EXISTS public.payments (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id         UUID        NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  user_id         UUID        REFERENCES auth.users(id) ON DELETE SET NULL,

  -- 토스페이먼츠
  order_id        TEXT        NOT NULL UNIQUE,       -- 우리가 생성하는 주문 ID
  payment_key     TEXT,                              -- 토스 결제 키 (승인 후 저장)
  amount          INTEGER     NOT NULL,              -- 결제 금액 (원)
  plan            TEXT        NOT NULL CHECK (plan IN ('month', 'year')),
  status          TEXT        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'done', 'failed', 'canceled')),

  -- 수명 연장 기록
  extended_until  TIMESTAMPTZ,                       -- 이 결제로 연장된 만료일

  paid_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_page_id ON public.payments (page_id);
CREATE INDEX idx_payments_user_id ON public.payments (user_id);
CREATE INDEX idx_payments_status  ON public.payments (status);

-- ============================================================
-- 3. RLS (Row Level Security)
-- ============================================================

-- pages 테이블 RLS
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;

-- 공개 읽기 (삭제되지 않은 페이지)
CREATE POLICY "pages_select_public"
  ON public.pages FOR SELECT
  USING (deleted_at IS NULL);

-- 삽입: 누구나 가능 (비로그인 생성 허용)
CREATE POLICY "pages_insert_anon"
  ON public.pages FOR INSERT
  WITH CHECK (TRUE);

-- 수정: service_role만 가능 (editToken 검증은 API Route에서 처리)
CREATE POLICY "pages_update_service"
  ON public.pages FOR UPDATE
  USING (auth.role() = 'service_role');

-- payments 테이블 RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- 본인 결제만 조회
CREATE POLICY "payments_select_own"
  ON public.payments FOR SELECT
  USING (user_id = auth.uid());

-- 삽입/수정: service_role만 가능
CREATE POLICY "payments_insert_service"
  ON public.payments FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "payments_update_service"
  ON public.payments FOR UPDATE
  USING (auth.role() = 'service_role');

-- ============================================================
-- 4. Edge Function: auto-lock (매일 00:00 KST)
-- ============================================================
-- supabase/functions/auto-lock/index.ts 에서 아래 쿼리 실행:
--
-- UPDATE public.pages
-- SET locked = TRUE
-- WHERE expires_at < NOW()
--   AND locked = FALSE
--   AND deleted_at IS NULL;

-- ============================================================
-- 5. Edge Function: auto-delete (매일 00:00 KST)
-- ============================================================
-- supabase/functions/auto-delete/index.ts 에서 아래 쿼리 실행:
--
-- UPDATE public.pages
-- SET deleted_at = NOW()
-- WHERE delete_at < NOW()
--   AND deleted_at IS NULL;

-- ============================================================
-- 6. Storage Policy (media 버킷)
-- ============================================================
-- Supabase 대시보드에서 설정:
-- Bucket: media (Public)
-- 업로드: 인증 없이 가능 (editToken은 API Route에서 검증 후 서버에서 업로드)
-- 파일 크기: 100MB (동영상 기준 최대치)
-- 허용 MIME: image/*, video/mp4, video/quicktime, application/pdf

-- ============================================================
-- 7. 초기 데이터 없음 (서비스 특성상 시드 데이터 불필요)
-- ============================================================
