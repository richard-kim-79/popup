-- ============================================================
-- 005. 페이지 검색 디렉토리 — listed 컬럼 추가
-- ============================================================

ALTER TABLE public.pages
  ADD COLUMN IF NOT EXISTS listed            BOOLEAN     NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS listing_title     TEXT,
  ADD COLUMN IF NOT EXISTS listing_description TEXT,
  ADD COLUMN IF NOT EXISTS listed_at         TIMESTAMPTZ;

-- 검색 인덱스 (등록된 페이지만)
CREATE INDEX IF NOT EXISTS idx_pages_listed
  ON public.pages (listed_at DESC)
  WHERE listed = TRUE AND deleted_at IS NULL;

-- 전문 검색용 인덱스 (제목 + 설명)
CREATE INDEX IF NOT EXISTS idx_pages_listing_text
  ON public.pages
  USING gin(to_tsvector('simple', coalesce(listing_title, '') || ' ' || coalesce(listing_description, '')))
  WHERE listed = TRUE AND deleted_at IS NULL;
