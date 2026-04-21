// ============================================================
// In-memory Sliding Window Rate Limiter
// ============================================================

const WINDOW_MS = 60_000 // 1분

interface BucketEntry {
  timestamps: number[]
}

/** API Key ID → 요청 타임스탬프 배열 */
const buckets = new Map<string, BucketEntry>()

/** 오래된 엔트리 정리 간격 (5분) */
const CLEANUP_INTERVAL_MS = 5 * 60_000
let lastCleanup = Date.now()

function cleanup() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return
  lastCleanup = now

  const cutoff = now - WINDOW_MS
  for (const [key, entry] of buckets) {
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff)
    if (entry.timestamps.length === 0) {
      buckets.delete(key)
    }
  }
}

/**
 * Rate limit 확인 및 기록
 * @param keyId API Key ID (unique identifier)
 * @param limit 분당 허용 요청 수
 * @returns true이면 통과, false이면 제한 초과
 */
export function checkRateLimit(keyId: string, limit: number): boolean {
  cleanup()

  const now = Date.now()
  const cutoff = now - WINDOW_MS

  let entry = buckets.get(keyId)
  if (!entry) {
    entry = { timestamps: [] }
    buckets.set(keyId, entry)
  }

  // 윈도우 밖의 타임스탬프 제거
  entry.timestamps = entry.timestamps.filter((t) => t > cutoff)

  if (entry.timestamps.length >= limit) {
    return false
  }

  entry.timestamps.push(now)
  return true
}

/** 테스트용: 특정 키의 버킷 초기화 */
export function resetRateLimit(keyId: string): void {
  buckets.delete(keyId)
}
