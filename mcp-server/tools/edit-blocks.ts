import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { editBlocks, type BlockOperation } from '../lib/api-client.js'

export function registerEditBlocks(server: McpServer) {
  server.tool(
    'edit_page_blocks',
    'Partially edit blocks on a page using batch operations (insert, update, delete, move). More efficient than replacing all blocks.',
    {
      slug: z.string().describe('The page slug'),
      operations: z.array(z.object({
        op: z.enum(['insert', 'update', 'delete', 'move']).describe('Operation type'),
        index: z.number().optional().describe('Insert position (for insert op)'),
        block: z.object({
          type: z.enum(['h1', 'h2', 'text', 'image', 'button', 'divider', 'youtube', 'link']),
          content: z.string().optional(),
          url: z.string().optional(),
          label: z.string().optional(),
          href: z.string().optional(),
          videoId: z.string().optional(),
          width: z.enum(['small', 'medium', 'full']).optional(),
        }).optional().describe('New block data (for insert op)'),
        blockId: z.string().optional().describe('Target block ID (for update/delete/move)'),
        changes: z.record(z.string(), z.unknown()).optional().describe('Fields to change (for update op)'),
        toIndex: z.number().optional().describe('Destination index (for move op)'),
      })).describe('Array of operations to apply'),
    },
    { readOnlyHint: false, destructiveHint: false },
    async ({ slug, operations }) => {
      const result = await editBlocks(slug, operations as BlockOperation[])
      if (!result.ok) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${result.error?.message ?? 'Edit failed'}` }],
          isError: true,
        }
      }
      return {
        content: [{
          type: 'text' as const,
          text: `Applied ${operations.length} operation(s) to "${slug}". Page now has ${result.data!.blocks.length} blocks.`,
        }],
      }
    },
  )
}
