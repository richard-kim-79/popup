// ============================================================
// Popup API v1 Client — MCP Server → REST API
// ============================================================

const BASE_URL = process.env.POPUP_API_URL ?? 'https://popup2026.com'
const API_KEY = process.env.MCP_API_KEY ?? ''

interface ApiResponse<T> {
  ok: boolean
  status: number
  data?: T
  error?: { code: string; message: string; details?: Record<string, unknown> }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<ApiResponse<T>> {
  const url = `${BASE_URL}${path}`
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
  }

  const res = await fetch(url, {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  })

  const json = await res.json().catch(() => ({})) as Record<string, unknown>

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      error: (json.error ?? { code: 'UNKNOWN', message: `HTTP ${res.status}` }) as ApiResponse<T>['error'],
    }
  }

  return { ok: true, status: res.status, data: json as T }
}

// --- Pages ---

export interface PageData {
  slug: string
  url: string
  editUrl?: string
  pin?: string       // 생성 시 1회만 반환
  editToken?: string
  blocks: unknown[]
  locked: boolean
  expiresAt: string
  daysLeft?: number
  viewCount: number
  createdAt: string
  updatedAt?: string
}

export interface PagesListData {
  data: PageData[]
  total: number
  page: number
  pageSize: number
}

export function createPage(blocks: unknown[], pin?: string) {
  return request<PageData>('POST', '/api/v1/pages', { blocks, ...(pin ? { pin } : {}) })
}

export function listPages(page = 1, pageSize = 20) {
  return request<PagesListData>('GET', `/api/v1/pages?page=${page}&pageSize=${pageSize}`)
}

export function getPage(slug: string) {
  return request<PageData>('GET', `/api/v1/pages/${slug}`)
}

export function deletePage(slug: string) {
  return request<{ success: boolean; slug: string }>('DELETE', `/api/v1/pages/${slug}`)
}

// --- Blocks ---

export function updateBlocks(slug: string, blocks: unknown[]) {
  return request<{ slug: string; blocks: unknown[] }>('PUT', `/api/v1/pages/${slug}/blocks`, { blocks })
}

export interface BlockOperation {
  op: 'insert' | 'update' | 'delete' | 'move'
  index?: number
  block?: unknown
  blockId?: string
  changes?: Record<string, unknown>
  toIndex?: number
}

export function editBlocks(slug: string, operations: BlockOperation[]) {
  return request<{ slug: string; blocks: unknown[] }>('PATCH', `/api/v1/pages/${slug}/blocks`, { operations })
}

// --- Upload ---

export interface UploadData {
  signedUrl: string
  token: string
  path: string
  publicUrl: string
  filename: string
}

export function requestUpload(slug: string, filename: string, mimeType: string, size: number) {
  return request<UploadData>('POST', `/api/v1/pages/${slug}/upload`, { filename, mimeType, size })
}

// --- Templates ---

export interface TemplateItem {
  id: string
  name: string
  description: string
  blockCount: number
}

export function listTemplates() {
  return request<{ data: TemplateItem[] }>('GET', '/api/v1/templates')
}

export function createFromTemplate(templateId: string, overrides?: unknown[]) {
  return request<PageData & { templateId: string }>('POST', '/api/v1/templates', { templateId, overrides })
}
