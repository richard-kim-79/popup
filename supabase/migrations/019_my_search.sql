-- ============================================================
-- 019. 마이페이지 검색 — 비공개 포함 전체 색인 + 소유자 검색 RPC
-- ============================================================
-- 기존(018) 트리거는 listed=TRUE 일 때만 search_text 계산 → 비공개 미색인.
-- 마이페이지에서 내 비공개 페이지까지 PGroonga로 검색하려면 전체 색인 필요.
-- 노출은 RPC에서 user_id(소유자)/listed(공개)로 게이팅 → 공개 누수 없음.
-- ============================================================

-- ① 트리거: listed 게이트 제거 → 모든 행에서 search_text 계산
CREATE OR REPLACE FUNCTION public.update_page_search_vector()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  body text;
BEGIN
  body := coalesce(public.extract_blocks_text(NEW.blocks::jsonb), '');
  IF NEW.html_content IS NOT NULL THEN
    body := body || ' ' || public.html_to_text(NEW.html_content);
  END IF;
  IF NEW.attachment_text IS NOT NULL THEN
    body := body || ' ' || NEW.attachment_text;
  END IF;

  NEW.search_text := lower(
    coalesce(NEW.listing_title, '')       || ' ' ||
    coalesce(NEW.listing_description, '') || ' ' ||
    body
  );
  NEW.search_vector := to_tsvector('simple', NEW.search_text);
  RETURN NEW;
END;
$$;

-- ② PGroonga 인덱스 전체화(비삭제 전부). 공개 RPC는 쿼리에서 listed 필터 유지.
DROP INDEX IF EXISTS idx_pages_pgroonga_search;
CREATE INDEX idx_pages_pgroonga_search
  ON public.pages USING pgroonga (search_text)
  WHERE deleted_at IS NULL;

-- ③ 백필: 모든 비삭제 페이지 search_text 재계산
UPDATE public.pages
SET search_text = lower(
  coalesce(listing_title, '')       || ' ' ||
  coalesce(listing_description, '') || ' ' ||
  coalesce(public.extract_blocks_text(blocks::jsonb), '') || ' ' ||
  coalesce(public.html_to_text(html_content), '') || ' ' ||
  coalesce(attachment_text, '')
)
WHERE deleted_at IS NULL;

-- ④ 소유자 검색 RPC
CREATE OR REPLACE FUNCTION public.search_my_pages(
  p_user_id uuid,
  p_q text,
  p_limit int DEFAULT 30,
  p_offset int DEFAULT 0
)
RETURNS TABLE(slug text, score real, snippet text, total_count bigint)
LANGUAGE sql
STABLE
AS $$
  WITH hits AS (
    SELECT
      p.slug, p.search_text, p.created_at,
      pgroonga_score(p.tableoid, p.ctid) AS score,
      count(*) OVER() AS total_count
    FROM public.pages p
    WHERE p.user_id = p_user_id
      AND p.deleted_at IS NULL
      AND p.search_text &@~ p_q
  )
  SELECT
    slug, score,
    array_to_string(
      pgroonga_snippet_html(search_text, pgroonga_query_extract_keywords(p_q)),
      ' … '
    ) AS snippet,
    total_count
  FROM hits
  ORDER BY score DESC, created_at DESC
  LIMIT p_limit OFFSET p_offset;
$$;
