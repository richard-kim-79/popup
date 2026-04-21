import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { updateBlocks } from '../lib/api-client.js'

export function registerUpdateBlocks(server: McpServer) {
  server.tool(
    'update_page_blocks',
    'Replace all blocks on a page with a new set of blocks. Use this for full page rewrites.',
    {
      slug: z.string().describe('The page slug'),
      blocks: z.array(z.object({
        type: z.enum(['h1', 'h2', 'text', 'image', 'button', 'divider', 'youtube', 'link']),
        content: z.string().optional(),
        url: z.string().optional(),
        label: z.string().optional(),
        href: z.string().optional(),
        videoId: z.string().optional(),
        width: z.enum(['small', 'medium', 'full']).optional(),
        title: z.string().optional(),
        description: z.string().optional(),
      })).describe('Complete new set of blocks'),
    },
    { readOnlyHint: false, destructiveHint: false },
    async ({ slug, blocks }) => {
      const result = await updateBlocks(slug, blocks)
      if (!result.ok) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${result.error?.message ?? 'Update failed'}` }],
          isError: true,
        }
      }
      return {
        content: [{
          type: 'text' as const,
          text: `Page "${slug}" updated with ${result.data!.blocks.length} blocks.`,
        }],
      }
    },
  )
}
