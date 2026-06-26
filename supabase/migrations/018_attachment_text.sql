-- ============================================================
-- 018. 첨부(PDF) 내부 텍스트 색인 — search_text에 attachment_text 포함
-- ============================================================
-- PDF 첨부의 추출 텍스트를 pages.attachment_text에 저장하고, 검색 색인(search_text)에
-- 합쳐 PGroonga가 PDF 내용까지 검색하도록 한다. 추출은 앱(blocks 저장 시 unpdf)에서 수행.
-- ============================================================

ALTER TABLE public.pages ADD COLUMN IF NOT EXISTS attachment_text text;

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
    IF NEW.attachment_text IS NOT NULL THEN
      body := body || ' ' || NEW.attachment_text;
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

DROP TRIGGER IF EXISTS trig_update_page_search_vector ON public.pages;
CREATE TRIGGER trig_update_page_search_vector
  BEFORE INSERT OR UPDATE OF
    blocks, html_content, listing_title, listing_description, listed, attachment_text
  ON public.pages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_page_search_vector();
