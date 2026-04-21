import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { listTemplates, createFromTemplate } from '../lib/api-client.js'

export function registerTemplates(server: McpServer) {
  // List templates
  server.tool(
    'list_templates',
    'List available page templates (landing page, event invite, link-in-bio, etc.)',
    {},
    { readOnlyHint: true },
    async () => {
      const result = await listTemplates()
      if (!result.ok) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${result.error?.message ?? 'Fetch failed'}` }],
          isError: true,
        }
      }

      const list = result.data!.data.map((t) =>
        `- **${t.id}**: ${t.name} — ${t.description} (${t.blockCount} blocks)`,
      ).join('\n')

      return {
        content: [{ type: 'text' as const, text: `Available templates:\n\n${list}` }],
      }
    },
  )

  // Create from template
  server.tool(
    'create_page_from_template',
    'Create a new page from a template. You can override individual block content by index.',
    {
      templateId: z.string().describe('Template ID (e.g. "landing-page", "event-invite", "link-in-bio")'),
      overrides: z.array(z.record(z.string(), z.unknown()).nullable()).optional()
        .describe('Array of overrides per block index. Use null to keep default. Example: [{"content": "My Title"}, null, null, {"content": "Custom text"}]'),
    },
    { readOnlyHint: false, destructiveHint: false },
    async ({ templateId, overrides }) => {
      const result = await createFromTemplate(templateId, overrides ?? undefined)
      if (!result.ok) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${result.error?.message ?? 'Creation failed'}` }],
          isError: true,
        }
      }
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            slug: result.data!.slug,
            url: result.data!.url,
            templateId: result.data!.templateId,
            expiresAt: result.data!.expiresAt,
          }, null, 2),
        }],
      }
    },
  )
}
