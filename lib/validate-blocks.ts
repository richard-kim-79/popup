// ============================================================
// Block Validation — API v1 + 에디터 공용
// ============================================================

import type { BlockType, Block } from '@/types'

const VALID_TYPES: BlockType[] = ['h1', 'h2', 'text', 'image', 'button', 'divider', 'youtube', 'link']
const VALID_WIDTHS = ['small', 'medium', 'full']
const MAX_BLOCKS = 100
const MAX_CONTENT_LENGTH = 10_000

interface ValidationResult {
  valid: boolean
  error?: string
}

/** blocks 배열 전체 유효성 검증 */
export function validateBlocks(blocks: unknown): ValidationResult {
  if (!Array.isArray(blocks)) {
    return { valid: false, error: 'blocks must be an array' }
  }

  if (blocks.length > MAX_BLOCKS) {
    return { valid: false, error: `blocks cannot exceed ${MAX_BLOCKS} items` }
  }

  for (let i = 0; i < blocks.length; i++) {
    const result = validateSingleBlock(blocks[i], i)
    if (!result.valid) return result
  }

  return { valid: true }
}

/** 개별 블록 유효성 검증 */
function validateSingleBlock(block: unknown, index: number): ValidationResult {
  if (!block || typeof block !== 'object') {
    return { valid: false, error: `blocks[${index}]: must be an object` }
  }

  const b = block as Record<string, unknown>

  if (!b.type || !VALID_TYPES.includes(b.type as BlockType)) {
    return { valid: false, error: `blocks[${index}]: invalid type "${String(b.type)}". Valid: ${VALID_TYPES.join(', ')}` }
  }

  // content 길이 제한 (h1, h2, text)
  if (['h1', 'h2', 'text'].includes(b.type as string)) {
    if (b.content !== undefined && typeof b.content !== 'string') {
      return { valid: false, error: `blocks[${index}]: content must be a string` }
    }
    if (typeof b.content === 'string' && b.content.length > MAX_CONTENT_LENGTH) {
      return { valid: false, error: `blocks[${index}]: content exceeds ${MAX_CONTENT_LENGTH} characters` }
    }
  }

  // width 검증
  if ('width' in b && b.width !== undefined) {
    if (!VALID_WIDTHS.includes(b.width as string)) {
      return { valid: false, error: `blocks[${index}]: invalid width "${String(b.width)}". Valid: ${VALID_WIDTHS.join(', ')}` }
    }
  }

  // image: url 검증
  if (b.type === 'image' && b.url !== undefined && typeof b.url !== 'string') {
    return { valid: false, error: `blocks[${index}]: image url must be a string` }
  }

  // button: label 필수
  if (b.type === 'button') {
    if (!b.label || typeof b.label !== 'string') {
      return { valid: false, error: `blocks[${index}]: button requires a label string` }
    }
  }

  // youtube: videoId 검증
  if (b.type === 'youtube' && b.videoId !== undefined && typeof b.videoId !== 'string') {
    return { valid: false, error: `blocks[${index}]: youtube videoId must be a string` }
  }

  // link: url 검증
  if (b.type === 'link' && b.url !== undefined && typeof b.url !== 'string') {
    return { valid: false, error: `blocks[${index}]: link url must be a string` }
  }

  return { valid: true }
}

/** ID 없는 블록에 nanoid로 ID를 부여 */
export function assignBlockIds(blocks: Record<string, unknown>[]): Block[] {
  const { nanoid } = require('nanoid') as { nanoid: (size?: number) => string }
  return blocks.map((b) => ({
    ...b,
    id: (b.id as string) || nanoid(10),
  })) as unknown as Block[]
}
