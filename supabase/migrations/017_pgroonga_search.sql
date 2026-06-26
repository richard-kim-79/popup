-- ============================================================
-- 017. 검색 강화 — PGroonga(한국어 전문검색) + 랭킹 + 스니펫
-- ============================================================
-- 기존(006/013): tsvector('simple') + search_text(pg_trgm) ILIKE.
-- 한계: 한국어 형태소·관련도 랭킹·스니펫·정렬 약함.
-- PGroonga: CJK 대응 전문검색(기본 Bigram), pgroonga_score(관련도),
--           pgroonga_snippet_html(하이라이트 발췌).
-- search_text(013) = 제목+설명+블록본문+HTML본문(소문자) 을 그대로 색인.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgroonga;

-- PGroonga 전문검색 인덱스 — 공개(listed) 페이지만
CREATE INDEX IF NOT EXISTS idx_pages_pgroonga_search
  ON public.pages USING pgroonga (search_text)
  WHERE listed = true AND deleted_at IS NULL;

-- 검색 RPC: 매칭 + 관련도·인기·최신 랭킹 + 스니펫 + 총건수
CREATE OR REPLACE FUNCTION public.search_pages(
  p_q text,
  p_limit int DEFAULT 24,
  p_offset int DEFAULT 0
)
RETURNS TABLE(
  slug text,
  listing_title text,
  listing_description text,
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
      p.slug, p.listing_title, p.listing_description, p.listed_at,
      p.view_count, p.search_text,
      pgroonga_score(p.tableoid, p.ctid) AS score,
      count(*) OVER() AS total_count
    FROM public.pages p
    WHERE p.listed = true AND p.deleted_at IS NULL
      AND p.search_text &@~ p_q
  )
  SELECT
    slug, listing_title, listing_description, listed_at, view_count, score,
    array_to_string(
      pgroonga_snippet_html(search_text, pgroonga_query_extract_keywords(p_q)),
      ' … '
    ) AS snippet,
    total_count
  FROM hits
  ORDER BY
    score * 1.0
    + ln(view_count + 1) * 0.4
    + greatest(0, 1 - extract(epoch FROM (now() - listed_at)) / (60*60*24*60)) * 0.5
    DESC
  LIMIT p_limit OFFSET p_offset;
$$;
