// ============================================================
// 페이지 생성 출처(source) 정규화 — 바이럴/홍보 채널 측정용
// 클라이언트가 보낸 값을 신뢰하지 않고 허용 문자·길이로 제한한다.
// 예: 'shared', 'expired', 'template:landing-page'
// ============================================================

/** 허용: 소문자·숫자·`:`·`_`·`-`, 최대 64자. 그 외/빈값은 null */
export function normalizeSource(input: unknown): string | null {
  if (typeof input !== 'string') return null
  const cleaned = input.trim().toLowerCase().slice(0, 64)
  if (!cleaned) return null
  if (!/^[a-z0-9:_-]+$/.test(cleaned)) return null
  return cleaned
}
