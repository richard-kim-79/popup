-- ============================================================
-- 002: 신고(Report) 기능
-- ============================================================

-- pages 테이블에 신고 카운트 추가
ALTER TABLE public.pages ADD COLUMN IF NOT EXISTS report_count INTEGER NOT NULL DEFAULT 0;

-- reports 테이블
CREATE TABLE IF NOT EXISTS public.reports (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id     UUID        NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  reason      TEXT        NOT NULL CHECK (reason IN ('illegal', 'spam', 'adult', 'other')),
  detail      TEXT,
  ip_hash     TEXT        NOT NULL,   -- SHA-256(IP) — 중복 방지용, 원본 IP 저장 안 함
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reports_page_id ON public.reports (page_id);
CREATE UNIQUE INDEX idx_reports_dedup ON public.reports (page_id, ip_hash);

-- RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- 누구나 신고 가능 (삽입만)
CREATE POLICY "reports_insert_anon"
  ON public.reports FOR INSERT
  WITH CHECK (TRUE);

-- 조회/수정: service_role만
CREATE POLICY "reports_select_service"
  ON public.reports FOR SELECT
  USING (auth.role() = 'service_role');
