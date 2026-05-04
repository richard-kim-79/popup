-- ============================================================
-- 006. 페이지 전문 검색 — search_vector (tsvector) + 트리거
-- ============================================================
-- 전략:
--   1. search_vector 컬럼 추가
--   2. blocks JSON 에서 텍스트 추출하는 헬퍼 함수 생성
--   3. BEFORE INSERT/UPDATE 트리거로 자동 갱신
--      (listed=TRUE 인 페이지만 벡터 계산)
--   4. GIN 인덱스 생성
--   5. 기존 listed 페이지 백필
-- ============================================================

-- ① search_vector 컬럼 추가
ALTER TABLE public.pages
  ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- ② blocks JSON 에서 텍스트를 추출하는 순수 함수
--    h1/h2/text → content 필드
--    button     → label 필드
--    link       → title + description 필드
CREATE OR REPLACE FUNCTION public.extract_blocks_text(blocks jsonb)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  result  text := '';
  elem    jsonb;
  btype   text;
  chunk   text;
BEGIN
  IF blocks IS NULL OR jsonb_typeof(blocks) <> 'array' THEN
    RETURN '';
  END IF;

  FOR elem IN SELECT * FROM jsonb_array_elements(blocks)
  LOOP
    btype := elem->>'type';
    chunk := NULL;

    IF btype IN ('h1', 'h2', 'text') THEN
      chunk := elem->>'content';

    ELSIF btype = 'button' THEN
      chunk := elem->>'label';

    ELSIF btype = 'link' THEN
      chunk := coalesce(elem->>'title', '')
            || ' '
            || coalesce(elem->>'description', '');
    END IF;

    IF chunk IS NOT NULL AND trim(chunk) <> '' THEN
      result := result || ' ' || chunk;
    END IF;
  END LOOP;

  RETURN trim(result);
END;
$$;

-- ③ 트리거 함수 — listed=TRUE 일 때만 벡터 계산
CREATE OR REPLACE FUNCTION public.update_page_search_vector()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  block_text text;
BEGIN
  IF NEW.listed = TRUE THEN
    block_text := public.extract_blocks_text(NEW.blocks::jsonb);
    NEW.search_vector := to_tsvector('simple',
      coalesce(NEW.listing_title, '')       || ' ' ||
      coalesce(NEW.listing_description, '') || ' ' ||
      coalesce(block_text, '')
    );
  ELSE
    NEW.search_vector := NULL;
  END IF;
  RETURN NEW;
END;
$$;

-- ④ 트리거 등록
--    blocks / listing 필드 / listed 플래그 변경 시 자동 실행
DROP TRIGGER IF EXISTS trig_update_page_search_vector ON public.pages;

CREATE TRIGGER trig_update_page_search_vector
  BEFORE INSERT OR UPDATE OF
    blocks,
    listing_title,
    listing_description,
    listed
  ON public.pages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_page_search_vector();

-- ⑤ GIN 인덱스 — 등록(listed=TRUE)된 페이지만 인덱싱
DROP INDEX IF EXISTS idx_pages_search_vector;

CREATE INDEX idx_pages_search_vector
  ON public.pages USING gin(search_vector)
  WHERE listed = TRUE AND deleted_at IS NULL;

-- ⑥ 기존 listed 페이지 백필
UPDATE public.pages
SET search_vector = to_tsvector('simple',
  coalesce(listing_title, '')       || ' ' ||
  coalesce(listing_description, '') || ' ' ||
  coalesce(public.extract_blocks_text(blocks::jsonb), '')
)
WHERE listed = TRUE AND deleted_at IS NULL;
