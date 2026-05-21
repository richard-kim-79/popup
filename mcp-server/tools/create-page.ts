import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { createPage } from '../lib/api-client.js'

export function registerCreatePage(server: McpServer) {
  server.tool(
    'create_page',
    'Create a new Popup web page from an array of blocks. Returns the slug, public URL, and edit PIN. Save the PIN — it is required to edit the page later.',
    {
      blocks: z.array(z.object({
        type: z.enum(['h1', 'h2', 'text', 'image', 'button', 'divider', 'youtube', 'link']),
        content: z.string().optional().describe('Text content (for h1, h2, text)'),
        url: z.string().optional().describe('URL (for image, link)'),
        label: z.string().optional().describe('Button label (for button)'),
        href: z.string().optional().describe('Button link URL (for button)'),
        videoId: z.string().optional().describe('YouTube video ID (for youtube)'),
        width: z.enum(['small', 'medium', 'full']).optional().describe('Display width'),
        title: z.string().optional().describe('Link title (for link)'),
        description: z.string().optional().describe('Link description (for link)'),
      })).describe('Array of content blocks'),
      pin: z.string().min(4).max(8).optional().describe('4–8 digit edit PIN (auto-generated if omitted)'),
    },
    { readOnlyHint: false, destructiveHint: false },
    async ({ blocks, pin }) => {
      const result = await createPage(blocks, pin)
      if (!result.ok) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${result.error?.message ?? 'Unknown error'}` }],
          isError: true,
        }
      }
      const d = result.data!
      return {
        content: [{
          type: 'text' as const,
          text: [
            '✅ 페이지가 생성됐습니다!',
            '',
            `🔗 URL: ${d.url}`,
            `✏️  편집: ${d.editUrl ?? `${d.url}/edit`}`,
            `🔑 편집 PIN: ${d.pin}   ← 반드시 메모해두세요`,
            `📅 만료: ${d.expiresAt}`,
          ].join('\n'),
        }],
      }
    },
  )
}
