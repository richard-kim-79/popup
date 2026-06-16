-- ============================================================
-- 012: 성장 측정(page_events) + 검색 갤러리 자동 노출 플래그
-- ============================================================

-- ── 채널별 전환 측정용 이벤트 로그 ──────────────────────────
CREATE TABLE IF NOT EXISTS public.page_events (
  id          BIGSERIAL PRIMARY KEY,
  event_type  TEXT        NOT NULL,   -- 'arrival'(ref 유입) | 'created'(페이지 생성)
  source      TEXT,                    -- ref/source 채널 (shared/expired/template:x ...)
  slug        TEXT,                    -- created 이벤트의 생성 slug
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_page_events_type_time ON public.page_events (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_events_source ON public.page_events (source);

-- RLS 활성화(정책 없음) → anon/authenticated 직접 접근 불가, 서버(service_role)만 기록·조회
ALTER TABLE public.page_events ENABLE ROW LEVEL SECURITY;

-- ── 갤러리 자동 노출 + 옵트아웃 플래그 ───────────────────────
ALTER TABLE public.pages ADD COLUMN IF NOT EXISTS auto_listed     BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.pages ADD COLUMN IF NOT EXISTS gallery_opt_out BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.pages.auto_listed     IS '검색 갤러리에 자동 등록된 페이지 여부 (수동 등록과 구분)';
COMMENT ON COLUMN public.pages.gallery_opt_out IS '소유자가 갤러리 노출을 끈 경우 true — 자동 노출 제외';
