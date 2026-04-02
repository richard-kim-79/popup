-- Add customer_email to payments
ALTER TABLE payments ADD COLUMN IF NOT EXISTS customer_email TEXT;
CREATE INDEX IF NOT EXISTS idx_payments_customer_email ON payments(customer_email);

-- page_emails table: link email to page (without payment too)
CREATE TABLE IF NOT EXISTS page_emails (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id     UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_page_emails_page_email ON page_emails(page_id, email);
CREATE INDEX IF NOT EXISTS idx_page_emails_email ON page_emails(email);

ALTER TABLE page_emails ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service role full access" ON page_emails USING (true) WITH CHECK (true);
