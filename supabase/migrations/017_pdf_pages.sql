-- ============================================================
-- 017. PDF 페이지 — 업로드한 PDF를 풀스크린으로 렌더하는 페이지
-- ============================================================
-- HTML 페이지(html_content)와 동일 패턴. PDF는 Storage(media)에 저장하고
-- pdf_url(public URL)로 가리킨다. 용량은 get_user_storage_bytes로 자동 합산.
-- ============================================================

ALTER TABLE public.pages
  ADD COLUMN IF NOT EXISTS pdf_url TEXT;
