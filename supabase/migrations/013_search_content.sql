-- ============================================================
-- 013. 검색 강화 — 본문(블록 + HTML) 전체를 검색 대상에 포함
-- ============================================================
-- 기존(006): search_vector = listing_title + listing_description + 블록텍스트
-- 한계:
--   1) HTML 페이지(html_content) 본문이 전혀 색인되지 않음
--   2) tsvector('simple')는 공백 토큰 단위라 "전자기" 가 "전자기기" 안을
--      부분일치로 못 잡음 → ILIKE 폴백이 필요한데, 폴백은 제목/설명만 봄
-- 해결:
--   · html_to_text() 헬퍼로 HTML 본문을 평문 추출(script/style 제거, 태그 제거)
--   · search_text(평문, 소문자) 컬럼 추가 → 제목+설명+블록+HTML 본문 통합
--   · search_vector = to_tsvector(search_text), ILIKE 폴백도 search_text 대상
-- ============================================================

-- ① HTML → 평문 추출 헬퍼 (script/style 제거 → 태그 제거 → 엔티티 디코드 → 공백정리 → 길이제한)
CREATE OR REPLACE FUNCTION public.html_to_text(html text, max_len int DEFAULT 8000)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT left(
    btrim(
      regexp_replace(
        replace(replace(replace(replace(replace(replace(
          regexp_replace(
            regexp_replace(
              regexp_replace(coalesce(html, ''), '<script[^>]*>[\s\S]*?</script>', ' ', 'gi'),
              '<style[^>]*>[\s\S]*?</style>', ' ', 'gi'
            ),
            '<[^>]+>', ' ', 'g'
          ),
          '&nbsp;', ' '), '&amp;', '&'), '&lt;', '<'), '&gt;', '>'), '&quot;', '"'), '&#39;', ''''
        ),
        '\s+', ' ', 'g'
      )
    ),
  max_len);
$$;

-- ② search_text 컬럼 추가 (소문자 평문 — ILIKE 부분일치 + tsvector 소스)
ALTER TABLE public.pages
  ADD COLUMN IF NOT EXISTS search_text text;

-- ③ 트리거 함수 갱신 — listed=TRUE 일 때 제목+설명+블록+HTML 본문 통합
CREATE OR REPLACE FUNCTION public.update_page_search_vector()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  body text;
BEGIN
  IF NEW.listed = TRUE THEN
    body := coalesce(public.extract_blocks_text(NEW.blocks::jsonb), '');
    IF NEW.html_content IS NOT NULL THEN
      body := body || ' ' || public.html_to_text(NEW.html_content);
    END IF;

    NEW.search_text := lower(
      coalesce(NEW.listing_title, '')       || ' ' ||
      coalesce(NEW.listing_description, '') || ' ' ||
      body
    );
    NEW.search_vector := to_tsvector('simple', NEW.search_text);
  ELSE
    NEW.search_text   := NULL;
    NEW.search_vector := NULL;
  END IF;
  RETURN NEW;
END;
$$;

-- ④ 트리거 재등록 — html_content 변경 시에도 갱신되도록 추가
DROP TRIGGER IF EXISTS trig_update_page_search_vector ON public.pages;

CREATE TRIGGER trig_update_page_search_vector
  BEFORE INSERT OR UPDATE OF
    blocks,
    html_content,
    listing_title,
    listing_description,
    listed
  ON public.pages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_page_search_vector();

-- ⑤ ILIKE 폴백용 trigram 인덱스 (부분일치 가속, listed만)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

DROP INDEX IF EXISTS idx_pages_search_text_trgm;
CREATE INDEX idx_pages_search_text_trgm
  ON public.pages USING gin(search_text gin_trgm_ops)
  WHERE listed = TRUE AND deleted_at IS NULL;

-- ⑥ 기존 listed 페이지 백필
UPDATE public.pages
SET search_text = lower(
      coalesce(listing_title, '')       || ' ' ||
      coalesce(listing_description, '') || ' ' ||
      coalesce(public.extract_blocks_text(blocks::jsonb), '') || ' ' ||
      coalesce(public.html_to_text(html_content), '')
    )
WHERE listed = TRUE AND deleted_at IS NULL;

UPDATE public.pages
SET search_vector = to_tsvector('simple', coalesce(search_text, ''))
WHERE listed = TRUE AND deleted_at IS NULL;
