-- 021. 라이프사이클 크론이 storage 회수한 시각 (재처리 방지)
ALTER TABLE public.pages ADD COLUMN IF NOT EXISTS storage_purged_at timestamptz;
COMMENT ON COLUMN public.pages.storage_purged_at IS '라이프사이클 크론이 이 페이지의 storage 객체를 회수한 시각(재처리 방지)';
