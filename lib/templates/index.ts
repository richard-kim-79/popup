// ============================================================
// Template Registry — 페이지 템플릿 관리
// ============================================================

import type { Block } from '@/types'
import { landingPageTemplate } from './landing-page'
import { eventInviteTemplate } from './event-invite'
import { linkInBioTemplate } from './link-in-bio'

/** 템플릿 블록 — id 없이 type + 속성만 */
export type TemplateBlock = { type: string; [key: string]: unknown }

export interface PageTemplate {
  id: string
  name: string
  description: string
  blocks: TemplateBlock[]
}

/** 모든 템플릿 목록 */
export const templates: PageTemplate[] = [
  landingPageTemplate,
  eventInviteTemplate,
  linkInBioTemplate,
]

/** ID로 템플릿 검색 */
export function getTemplateById(id: string): PageTemplate | undefined {
  return templates.find((t) => t.id === id)
}
