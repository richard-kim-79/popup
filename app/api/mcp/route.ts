/**
 * Remote MCP Server — popup2026.com/api/mcp
 *
 * Claude.ai 또는 Claude Desktop에서 URL만 추가하면 바로 사용 가능.
 *
 * 익명(기본): https://popup2026.com/api/mcp — 페이지가 계정에 귀속되지 않음.
 * 개인 연결: https://popup2026.com/api/mcp?key=lf_live_... (또는 Authorization: Bearer)
 *   → 키 발급자(로그인 사용자) 계정에 자동 귀속되어 /my-pages 에서 관리됨.
 *   키 발급: /my-pages → "Claude(MCP) 연결".
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { generateUniqueSlug } from '@/lib/slug'
import { resolveApiKeyUserId } from '@/lib/api-key-middleware'
import { sha256, MCP_RESOURCE, wwwAuthenticate } from '@/lib/oauth'
import { nanoid } from 'nanoid'
import type { Json } from '@/types'

export const runtime = 'nodejs'

type McpAuth = { userId: string; apiKeyId: string | null }

/** OAuth 액세스 토큰(Bearer) → user_id (미만료·미폐기·audience 일치) */
async function resolveOAuthToken(token: string): Promise<string | null> {
  const admin = getSupabaseAdmin()
  const { data } = await admin
    .from('oauth_tokens')
    .select('user_id, access_expires_at, audience')
    .eq('access_hash', sha256(token))
    .is('revoked_at', null)
    .maybeSingle()
  if (!data) return null
  if (data.access_expires_at && new Date(data.access_expires_at) < new Date()) return null
  if (data.audience && data.audience !== MCP_RESOURCE) return null
  return data.user_id
}

/**
 * 요청 인증 → 발급자 user_id 해석.
 *  ① 개인 키(lf_live_): ?key= 쿼리 또는 Bearer
 *  ② OAuth 액세스 토큰: Bearer (lf_live_ 아님)
 * 인증 실패 시 null (호출부에서 401 챌린지).
 */
async function mcpAuth(req: NextRequest): Promise<McpAuth | null> {
  const authHeader = req.headers.get('authorization')
  const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null
  const queryKey = req.nextUrl.searchParams.get('key')

  // ① 개인 키
  const apiKeyRaw = queryKey ?? (bearer?.startsWith('lf_live_') ? bearer : null)
  if (apiKeyRaw) {
    const r = await resolveApiKeyUserId(apiKeyRaw)
    if (r) return { userId: r.userId, apiKeyId: r.apiKeyId }
  }

  // ② OAuth 액세스 토큰
  if (bearer && !bearer.startsWith('lf_live_')) {
    const userId = await resolveOAuthToken(bearer)
    if (userId) return { userId, apiKeyId: null }
  }

  return null
}

const BASE = (process.env.NEXT_PUBLIC_BASE_URL ?? 'https://popup2026.com').trim()
const DEFAULT_DAYS = 30

// ── 블록 ID 자동 할당 ──────────────────────────────────────────
function assignIds(blocks: Record<string, unknown>[]): Json {
  return blocks.map((b) => ({ id: nanoid(6), ...b })) as Json
}

// pin_hash 컬럼 채움용 임의 PIN (PIN 기능 제거 — 노출/사용 안 함, 편집은 계정/토큰)
function randomPin(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

const EDIT_HINT = `✏️ 편집: 로그인한 내 계정의 /my-pages 에서 편집할 수 있어요`

// ── 블록 스키마 (tools 공통) ───────────────────────────────────
const BlockSchema = z.object({
  type: z.enum(['h1', 'h2', 'text', 'image', 'button', 'divider', 'youtube', 'link']),
  content: z.string().optional().describe('텍스트 내용 (h1, h2, text)'),
  url: z.string().optional().describe('URL (image, link, youtube)'),
  label: z.string().optional().describe('버튼 라벨 (button)'),
  href: z.string().optional().describe('버튼 링크 (button)'),
  videoId: z.string().optional().describe('YouTube 영상 ID (youtube)'),
  width: z.enum(['small', 'medium', 'full']).optional().describe('표시 너비'),
  title: z.string().optional().describe('링크 제목 (link)'),
  description: z.string().optional().describe('링크 설명 (link)'),
  color: z.string().optional().describe('버튼 배경색 HEX (button)'),
})

// ── McpServer 팩토리 ───────────────────────────────────────────
// auth: 인증된 경우 발급자 user_id — 생성 페이지를 그 계정에 귀속
function buildServer(auth?: McpAuth | null): McpServer {
  const ownerUserId = auth?.userId ?? null
  const ownerApiKeyId = auth?.apiKeyId ?? null
  const server = new McpServer(
    {
      name: 'popup',
      version: '1.0.0',
      description: '30초 만에 웹페이지를 만들고 링크로 공유하는 서비스. 로그인 불필요.',
      websiteUrl: BASE,
      icons: [
        { src: `${BASE}/icon-512`, mimeType: 'image/png', sizes: ['512x512'] },
        { src: `${BASE}/icon`,     mimeType: 'image/png', sizes: ['32x32']   },
      ],
    },
    {
      instructions: `
Popup creates instant shareable web pages.

## Account
This connection is authenticated, so created pages are saved to the user's Popup account
and can be edited/managed from /my-pages. No PIN is involved — never ask for one.

## Page building guide
- Block-based pages: use create_page with h1/h2/text/image/button/youtube/link/divider blocks.
- Raw HTML pages: use create_html_page when the user provides complete HTML. Renders fullscreen exactly as-is.

## Examples
- "카페 소개 페이지" → create_page: h1 + text + image + button
- "행사 초대장" → create_page: h1 + text + button(RSVP)
- "링크 모음" → create_page: h1 + multiple link blocks
- "이 HTML 파일 공유해줘" → create_html_page with the HTML content
      `.trim(),
    },
  )

  const supabase = getSupabaseAdmin()

  // ── Tool: create_page ────────────────────────────────────────
  server.tool(
    'create_page',
    'Creates a new Popup page. Saved to the connected user\'s account and editable from /my-pages. No PIN needed.',
    {
      blocks: z.array(BlockSchema).describe('페이지를 구성할 블록 배열'),
    },
    { readOnlyHint: false, destructiveHint: false },
    async ({ blocks }) => {
      const slug = await generateUniqueSlug()
      const { hashPin } = await import('@/lib/pin')
      const pin_hash = await hashPin(randomPin())
      const expires_at = new Date(Date.now() + DEFAULT_DAYS * 86400000).toISOString()
      const delete_at = new Date(Date.now() + 365 * 86400000).toISOString()

      const { error } = await supabase.from('pages').insert({
        slug,
        blocks: assignIds(blocks as Record<string, unknown>[]),
        pin_hash,
        expires_at,
        delete_at,
        locked: false,
        user_id: ownerUserId,
        api_key_id: ownerApiKeyId,
      })

      if (error) {
        return { content: [{ type: 'text' as const, text: `오류: ${error.message}` }], isError: true }
      }

      return {
        content: [{
          type: 'text' as const,
          text: [
            `✅ 페이지가 생성됐습니다!`,
            ``,
            `🔗 URL: ${BASE}/${slug}`,
            EDIT_HINT,
            `📅 유효기간: ${DEFAULT_DAYS}일`,
            ``,
            `편집 링크: ${BASE}/${slug}/edit`,
          ].join('\n'),
        }],
      }
    },
  )

  // ── Tool: create_html_page ──────────────────────────────────
  server.tool(
    'create_html_page',
    'Creates a Popup page from raw HTML. Renders fullscreen exactly as-is — use for presentations, reports, visualizations, custom designs. Saved to the connected user\'s account, editable from /my-pages without a PIN. Do NOT ask for a PIN by default.',
    {
      html: z.string().min(1).max(5_000_000).describe('Complete HTML content to publish (max 5 MB)'),
    },
    { readOnlyHint: false, destructiveHint: false },
    async ({ html }) => {
      if (Buffer.byteLength(html, 'utf8') > 5_000_000) {
        return { content: [{ type: 'text' as const, text: 'HTML 크기가 5MB를 초과합니다.' }], isError: true }
      }

      const slug = await generateUniqueSlug()
      const { hashPin } = await import('@/lib/pin')
      const pin_hash = await hashPin(randomPin())
      const expires_at = new Date(Date.now() + DEFAULT_DAYS * 86400000).toISOString()
      const delete_at = new Date(Date.now() + 365 * 86400000).toISOString()

      const { error } = await supabase.from('pages').insert({
        slug,
        blocks: [] as unknown as Json,
        html_content: html,
        pin_hash,
        expires_at,
        delete_at,
        locked: false,
        user_id: ownerUserId,
        api_key_id: ownerApiKeyId,
      })

      if (error) {
        return { content: [{ type: 'text' as const, text: `오류: ${error.message}` }], isError: true }
      }

      return {
        content: [{
          type: 'text' as const,
          text: [
            `✅ HTML 페이지가 생성됐습니다!`,
            ``,
            `🔗 URL: ${BASE}/${slug}`,
            EDIT_HINT,
            `📅 유효기간: ${DEFAULT_DAYS}일`,
            ``,
            `페이지를 열면 HTML이 풀스크린으로 표시됩니다.`,
          ].join('\n'),
        }],
      }
    },
  )

  // ── Tool: get_page ───────────────────────────────────────────
  server.tool(
    'get_page',
    '기존 Popup 페이지의 블록 내용을 조회합니다.',
    { slug: z.string().describe('페이지 슬러그 (URL의 마지막 부분, 예: abc123)') },
    { readOnlyHint: true },
    async ({ slug }) => {
      const { data, error } = await supabase
        .from('pages')
        .select('blocks, locked, expires_at')
        .eq('slug', slug)
        .is('deleted_at', null)
        .single()

      if (error || !data) {
        return { content: [{ type: 'text' as const, text: `페이지를 찾을 수 없습니다: ${slug}` }], isError: true }
      }

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            slug,
            url: `${BASE}/${slug}`,
            locked: data.locked,
            expiresAt: data.expires_at,
            blocks: data.blocks,
          }, null, 2),
        }],
      }
    },
  )

  // ── Tool: update_page ────────────────────────────────────────
  server.tool(
    'update_page',
    '기존 페이지의 블록 전체를 새 내용으로 교체합니다. 연결된 계정이 소유한 페이지만 수정할 수 있습니다.',
    {
      slug: z.string().describe('페이지 슬러그'),
      blocks: z.array(BlockSchema).describe('새 블록 배열'),
    },
    { readOnlyHint: false, destructiveHint: false },
    async ({ slug, blocks }) => {
      const { data: page } = await supabase
        .from('pages')
        .select('user_id')
        .eq('slug', slug)
        .is('deleted_at', null)
        .single()

      if (!page) {
        return { content: [{ type: 'text' as const, text: '페이지를 찾을 수 없습니다.' }], isError: true }
      }

      // 연결 계정이 소유자일 때만 수정 허용
      const isOwner = !!ownerUserId && page.user_id === ownerUserId
      if (!isOwner) {
        return { content: [{ type: 'text' as const, text: '이 페이지를 수정할 권한이 없습니다(소유자만 가능).' }], isError: true }
      }

      const { error } = await supabase
        .from('pages')
        .update({ blocks: assignIds(blocks as Record<string, unknown>[]) })
        .eq('slug', slug)

      if (error) {
        return { content: [{ type: 'text' as const, text: `오류: ${error.message}` }], isError: true }
      }

      return {
        content: [{ type: 'text' as const, text: `✅ 페이지가 업데이트됐습니다.\n🔗 ${BASE}/${slug}` }],
      }
    },
  )

  // ── Tool: list_templates ─────────────────────────────────────
  server.tool(
    'list_templates',
    '사용 가능한 페이지 템플릿 목록을 반환합니다.',
    {},
    { readOnlyHint: true },
    async () => {
      const templates = [
        { id: 'landing-page', name: '랜딩 페이지', description: '제품/서비스 소개 페이지', blocks: 5 },
        { id: 'event-invite', name: '행사 초대장', description: '이벤트/모임 초대 페이지', blocks: 4 },
        { id: 'link-in-bio', name: '링크인바이오', description: 'SNS 링크 모음 페이지', blocks: 6 },
        { id: 'portfolio', name: '포트폴리오', description: '작품/프로젝트 소개 페이지', blocks: 7 },
        { id: 'notice', name: '공지사항', description: '간단한 공지/안내 페이지', blocks: 3 },
      ]
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(templates, null, 2) }],
      }
    },
  )

  // ── Resource: 서비스 소개 ─────────────────────────────────────
  server.resource(
    'popup-info',
    'popup://info',
    { description: 'Popup 서비스 소개 및 사용 가이드' },
    async () => ({
      contents: [{
        uri: 'popup://info',
        mimeType: 'text/plain',
        text: [
          '# Popup — 30초 웹페이지 메이커',
          '',
          '로그인 없이 즉시 웹페이지를 만들고 링크로 공유하는 서비스입니다.',
          '',
          '## 블록 타입',
          '- h1: 큰 제목',
          '- h2: 소제목',
          '- text: 본문 텍스트',
          '- image: 이미지 (url 필드에 이미지 URL)',
          '- button: 클릭 버튼 (label, href)',
          '- youtube: 유튜브 영상 (videoId)',
          '- link: 링크 미리보기 카드 (url, title)',
          '- divider: 구분선',
          '',
          `## 서비스 URL: ${BASE}`,
        ].join('\n'),
      }],
    }),
  )

  return server
}

// ── Route Handler ──────────────────────────────────────────────
async function handle(req: NextRequest): Promise<Response> {
  const auth = await mcpAuth(req)

  // 인증 없으면 401 + WWW-Authenticate → Claude가 OAuth(구글 로그인) 플로우 시작
  if (!auth) {
    return new Response(
      JSON.stringify({ error: 'unauthorized', error_description: '로그인이 필요합니다.' }),
      {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'WWW-Authenticate': wwwAuthenticate(),
        },
      },
    )
  }

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless — Vercel serverless 호환
  })
  const server = buildServer(auth)
  await server.connect(transport)
  return transport.handleRequest(req)
}

export const POST = handle
export const GET = handle
export const DELETE = handle
