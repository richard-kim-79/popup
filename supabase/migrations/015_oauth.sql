-- ============================================================
-- 015. MCP OAuth 2.1 (인가 서버) — Claude 구글 로그인 연결
-- ============================================================
-- AS+RS 동일 오리진. 토큰/코드는 평문 저장 금지(sha256 해시).
-- 전부 service_role 전용(RLS enable, 정책 없음).
-- ============================================================

-- 동적 클라이언트 등록(DCR) — public client (secret 없음)
CREATE TABLE IF NOT EXISTS public.oauth_clients (
  client_id     TEXT PRIMARY KEY,
  redirect_uris TEXT[] NOT NULL DEFAULT '{}',
  client_name   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.oauth_clients ENABLE ROW LEVEL SECURITY;

-- 1회용 authorization code (PKCE)
CREATE TABLE IF NOT EXISTS public.oauth_codes (
  code_hash      TEXT PRIMARY KEY,
  client_id      TEXT NOT NULL,
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  redirect_uri   TEXT NOT NULL,
  code_challenge TEXT NOT NULL,
  resource       TEXT,
  scope          TEXT,
  expires_at     TIMESTAMPTZ NOT NULL,
  used           BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.oauth_codes ENABLE ROW LEVEL SECURITY;

-- 액세스/리프레시 토큰 (해시 저장, 단명+회전)
CREATE TABLE IF NOT EXISTS public.oauth_tokens (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  access_hash        TEXT UNIQUE,
  refresh_hash       TEXT UNIQUE,
  user_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id          TEXT NOT NULL,
  audience           TEXT,
  scope              TEXT,
  access_expires_at  TIMESTAMPTZ,
  refresh_expires_at TIMESTAMPTZ,
  revoked_at         TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.oauth_tokens ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_oauth_tokens_access  ON public.oauth_tokens(access_hash)  WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_refresh ON public.oauth_tokens(refresh_hash) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_user    ON public.oauth_tokens(user_id);
