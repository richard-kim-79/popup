/**
 * Remote MCP Server — popup2026.com/api/mcp
 *
 * Claude.ai 또는 Claude Desktop에서 URL만 추가하면 바로 사용 가능.
 * API 키 불필요 — 익명으로 페이지 생성 가능.
 *
 * 연결 방법:
 *   Claude.ai → 설정 → 통합(Integrations) → URL 추가:
 *   https://popup2026.com/api/mcp
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { generateUniqueSlug } from '@/lib/slug'
import { nanoid } from 'nanoid'
import type { Json } from '@/types'

export const runtime = 'nodejs'

const BASE = (process.env.NEXT_PUBLIC_BASE_URL ?? 'https://popup2026.com').trim()
const DEFAULT_DAYS = 30

// ── 블록 ID 자동 할당 ──────────────────────────────────────────
function assignIds(blocks: Record<string, unknown>[]): Json {
  return blocks.map((b) => ({ id: nanoid(6), ...b })) as Json
}

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
function buildServer(): McpServer {
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
Popup creates instant shareable web pages — no login required.

## ⚠️ MANDATORY RULE — ALWAYS FOLLOW BEFORE create_page
Before calling create_page, you MUST ask the user to choose their own edit PIN.
Say exactly: "편집 비밀번호(PIN)를 4자리 이상으로 직접 정해주세요. 나중에 이 번호로 수정할 수 있어요."
Wait for the user's reply. Use ONLY the PIN the user provides.
NEVER invent, guess, or auto-generate a PIN. NEVER skip this step.

## Page building guide
Combine blocks: h1/h2 (headings), text (body), image (url), button (label+href),
youtube (videoId), link (url+title), divider.

## Examples
- "카페 소개 페이지" → h1 + text + image + button
- "행사 초대장" → h1 + text + button(RSVP)
- "링크 모음" → h1 + multiple link blocks
      `.trim(),
    },
  )

  const supabase = getSupabaseAdmin()

  // ── Tool: create_page ────────────────────────────────────────
  server.tool(
    'create_page',
    'Creates a new Popup page. IMPORTANT: Do NOT call this tool until the user has explicitly told you their PIN. Ask first: "편집 비밀번호(PIN)를 4자리 이상으로 정해주세요."',
    {
      blocks: z.array(BlockSchema).describe('페이지를 구성할 블록 배열'),
      pin: z.string().min(4).max(8).describe('사용자가 직접 정한 4~8자리 편집 PIN. 반드시 사용자에게 먼저 물어보고 입력받으세요.'),
    },
    { readOnlyHint: false, destructiveHint: false },
    async ({ blocks, pin }) => {
      const slug = await generateUniqueSlug()
      const { hashPin } = await import('@/lib/pin')
      const pin_hash = await hashPin(pin)
      const expires_at = new Date(Date.now() + DEFAULT_DAYS * 86400000).toISOString()
      const delete_at = new Date(Date.now() + 365 * 86400000).toISOString()

      const { error } = await supabase.from('pages').insert({
        slug,
        blocks: assignIds(blocks as Record<string, unknown>[]),
        pin_hash,
        expires_at,
        delete_at,
        locked: false,
        user_id: null,
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
            `🔑 편집 PIN: ${pin}  ← 사용자에게 꼭 알려주세요`,
            `📅 유효기간: ${DEFAULT_DAYS}일`,
            ``,
            `편집 링크: ${BASE}/${slug}/edit`,
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
    'PIN을 사용해 기존 페이지의 블록 전체를 새 내용으로 교체합니다.',
    {
      slug: z.string().describe('페이지 슬러그'),
      pin: z.string().describe('4~8자리 편집 PIN'),
      blocks: z.array(BlockSchema).describe('새 블록 배열'),
    },
    { readOnlyHint: false, destructiveHint: false },
    async ({ slug, pin, blocks }) => {
      // PIN 검증
      const { data: page } = await supabase
        .from('pages')
        .select('pin_hash')
        .eq('slug', slug)
        .is('deleted_at', null)
        .single()

      if (!page) {
        return { content: [{ type: 'text' as const, text: '페이지를 찾을 수 없습니다.' }], isError: true }
      }

      const { verifyPin } = await import('@/lib/pin')
      const valid = await verifyPin(pin, page.pin_hash)
      if (!valid) {
        return { content: [{ type: 'text' as const, text: 'PIN이 올바르지 않습니다.' }], isError: true }
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
export async function POST(req: NextRequest): Promise<Response> {
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless — Vercel serverless 호환
  })

  const server = buildServer()
  await server.connect(transport)
  return transport.handleRequest(req)
}

export async function GET(req: NextRequest): Promise<Response> {
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  })

  const server = buildServer()
  await server.connect(transport)
  return transport.handleRequest(req)
}

export async function DELETE(req: NextRequest): Promise<Response> {
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  })

  const server = buildServer()
  await server.connect(transport)
  return transport.handleRequest(req)
}
