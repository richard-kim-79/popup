-- ============================================================
-- 011: pages.source — 페이지 생성 유입 출처 (바이럴/홍보 측정용)
-- 예: 'shared'(공유 페이지 CTA), 'expired'(만료 화면 CTA), 'template:<id>'
-- nullable, RLS 변경 없음
-- ============================================================

ALTER TABLE public.pages ADD COLUMN IF NOT EXISTS source TEXT;

COMMENT ON COLUMN public.pages.source IS '페이지 생성 유입 출처 — 바이럴/홍보 채널 측정용 (nullable)';
