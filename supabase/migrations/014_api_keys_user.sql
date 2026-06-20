-- ============================================================
-- 014. api_keys ↔ 사용자 계정 연결
-- ============================================================
-- 목적: MCP/REST로 생성한 페이지를 발급자(로그인 사용자)에게 귀속시켜
--       /my-pages 에서 자동 관리되도록. 개인 키 = user_id 보유 키.
-- ============================================================

ALTER TABLE public.api_keys
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_api_keys_user
  ON public.api_keys(user_id)
  WHERE user_id IS NOT NULL;
