import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { createPage } from '../lib/api-client.js'

export function registerCreatePage(server: McpServer) {
  server.tool(
    'create_page',
    'Create a new Popup web page from an array of blocks. Returns the slug and public URL.',
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
    },
    { readOnlyHint: false, destructiveHint: false },
    async ({ blocks }) => {
      const result = await createPage(blocks)
      if (!result.ok) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${result.error?.message ?? 'Unknown error'}` }],
          isError: true,
        }
      }
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            slug: result.data!.slug,
            url: result.data!.url,
            expiresAt: result.data!.expiresAt,
            blockCount: result.data!.blocks.length,
          }, null, 2),
        }],
      }
    },
  )
}
