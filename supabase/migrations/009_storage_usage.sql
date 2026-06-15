-- ============================================================
-- 009_storage_usage.sql — 첨부파일(Storage) 용량 집계
--
-- pages.size_bytes는 텍스트(html_content + blocks)만 계산.
-- 이미지·PDF는 storage.objects(media 버킷)에 별도 저장되므로 합산 누락.
-- 사용자별 첨부 용량을 집계하는 SECURITY DEFINER 함수 추가.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_user_storage_bytes(p_user_id UUID)
RETURNS BIGINT
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public, storage
AS $$
  SELECT COALESCE(SUM((o.metadata->>'size')::BIGINT), 0)
  FROM storage.objects o
  JOIN public.pages p ON p.slug = split_part(o.name, '/', 1)
  WHERE o.bucket_id = 'media'
    AND p.user_id = p_user_id
    AND p.deleted_at IS NULL;
$$;

-- authenticated/service_role이 RPC로 호출
GRANT EXECUTE ON FUNCTION public.get_user_storage_bytes(UUID) TO authenticated, service_role;
