-- Add html_content column for raw HTML pages
ALTER TABLE public.pages ADD COLUMN IF NOT EXISTS html_content TEXT;
