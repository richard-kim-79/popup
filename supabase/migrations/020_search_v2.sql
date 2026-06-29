-- ============================================================
-- 020. 검색 갤러리 v2 — 썸네일(listing_image) + 정렬(p_sort) + 신고 반영
-- ============================================================

-- ① 썸네일 컬럼
ALTER TABLE public.pages ADD COLUMN IF NOT EXISTS listing_image text;

-- ② 백필: listed 페이지 listing_image = 블록 첫 이미지 → og:image → 첫 <img src>
UPDATE public.pages
SET listing_image = coalesce(
  (SELECT b->>'url'
     FROM jsonb_array_elements(
       CASE WHEN jsonb_typeof(blocks::jsonb)='array' THEN blocks::jsonb ELSE '[]'::jsonb END
     ) b
     WHERE b->>'type'='image'
       AND b->>'url' ~* '^https?://'
       AND b->>'url' !~* '\.pdf(\?|$)'
     LIMIT 1),
  (regexp_match(html_content, '<meta[^>]+property=["'']og:image["''][^>]*content=["'']([^"'']+)["'']', 'i'))[1],
  (regexp_match(html_content, '<img[^>]+src=["'']([^"'']+)["'']', 'i'))[1]
)
WHERE listed = true AND deleted_at IS NULL;

-- ③ search_pages v2 (정렬·신고·썸네일). 반환 타입 변경 → DROP 후 재생성
DROP FUNCTION IF EXISTS public.search_pages(text, int, int);
DROP FUNCTION IF EXISTS public.search_pages(text, int, int, text);

CREATE FUNCTION public.search_pages(
  p_q text,
  p_limit int DEFAULT 24,
  p_offset int DEFAULT 0,
  p_sort text DEFAULT 'relevance'
)
RETURNS TABLE(
  slug text,
  listing_title text,
  listing_description text,
  listing_image text,
  listed_at timestamptz,
  view_count int,
  score real,
  snippet text,
  total_count bigint
)
LANGUAGE sql
STABLE
AS $$
  WITH hits AS (
    SELECT
      p.slug, p.listing_title, p.listing_description, p.listing_image,
      p.listed_at, p.view_count, p.search_text, coalesce(p.report_count,0) AS report_count,
      pgroonga_score(p.tableoid, p.ctid) AS pg_score,
      count(*) OVER() AS total_count
    FROM public.pages p
    WHERE p.listed = true
      AND p.deleted_at IS NULL
      AND coalesce(p.report_count,0) < 3
      AND p.search_text &@~ p_q
  )
  SELECT
    slug, listing_title, listing_description, listing_image, listed_at, view_count,
    pg_score AS score,
    array_to_string(
      pgroonga_snippet_html(search_text, pgroonga_query_extract_keywords(p_q)),
      ' … '
    ) AS snippet,
    total_count
  FROM hits
  ORDER BY
    CASE WHEN p_sort = 'recent'  THEN extract(epoch FROM listed_at) END DESC NULLS LAST,
    CASE WHEN p_sort = 'popular' THEN view_count END DESC NULLS LAST,
    CASE WHEN p_sort NOT IN ('recent','popular') THEN
      pg_score * 1.0
      + ln(coalesce(view_count,0) + 1) * 0.4
      + greatest(0, 1 - extract(epoch FROM (now() - listed_at)) / (60*60*24*60)) * 0.5
      - least(report_count, 2) * 0.5
    END DESC NULLS LAST,
    listed_at DESC
  LIMIT p_limit OFFSET p_offset;
$$;
