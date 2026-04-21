-- API Keys for Public API v1
-- API 키 인증 기반의 외부 연동 (MCP, REST API) 지원

-- api_keys: API 키 관리 테이블
CREATE TABLE IF NOT EXISTS api_keys (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_hash      TEXT NOT NULL,                     -- SHA-256 해시 (평문 저장 안 함)
  prefix        TEXT NOT NULL,                     -- 'lf_live_xxxxxxxx' 앞 16자 (식별용)
  name          TEXT NOT NULL DEFAULT 'Unnamed',   -- 키 별명
  scopes        TEXT[] NOT NULL DEFAULT '{}',      -- 권한 배열: pages:create, pages:read, ...
  rate_limit    INT NOT NULL DEFAULT 100,          -- 분당 요청 수 제한
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at  TIMESTAMPTZ,
  revoked_at    TIMESTAMPTZ,                       -- NULL이면 활성, 값 있으면 폐기됨
  expires_at    TIMESTAMPTZ                        -- NULL이면 만료 없음
);

CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(prefix);
CREATE INDEX IF NOT EXISTS idx_api_keys_revoked ON api_keys(revoked_at) WHERE revoked_at IS NULL;

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service role full access" ON api_keys USING (true) WITH CHECK (true);

-- api_key_pages: API 키로 생성한 페이지 추적
CREATE TABLE IF NOT EXISTS api_key_pages (
  api_key_id    UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  page_id       UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (api_key_id, page_id)
);

CREATE INDEX IF NOT EXISTS idx_api_key_pages_page ON api_key_pages(page_id);

ALTER TABLE api_key_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service role full access" ON api_key_pages USING (true) WITH CHECK (true);

-- pages 테이블에 api_key_id 컬럼 추가 (API로 생성된 페이지 식별)
ALTER TABLE pages ADD COLUMN IF NOT EXISTS api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_pages_api_key ON pages(api_key_id) WHERE api_key_id IS NOT NULL;
