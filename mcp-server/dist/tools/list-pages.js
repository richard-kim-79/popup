import { z } from 'zod';
import { listPages } from '../lib/api-client.js';
export function registerListPages(server) {
    server.tool('list_my_pages', 'List all pages created with your API key. Supports pagination.', {
        page: z.number().optional().default(1).describe('Page number (default: 1)'),
        pageSize: z.number().optional().default(20).describe('Items per page (default: 20, max: 100)'),
    }, { readOnlyHint: true }, async ({ page, pageSize }) => {
        const result = await listPages(page, pageSize);
        if (!result.ok) {
            return {
                content: [{ type: 'text', text: `Error: ${result.error?.message ?? 'Fetch failed'}` }],
                isError: true,
            };
        }
        const data = result.data;
        const summary = data.data.map((p) => `- ${p.slug} (${p.url}) — ${p.locked ? 'LOCKED' : 'active'}, ${p.viewCount} views`).join('\n');
        return {
            content: [{
                    type: 'text',
                    text: `Found ${data.total} page(s) (showing page ${data.page}):\n\n${summary || '(no pages)'}`,
                }],
        };
    });
}
//# sourceMappingURL=list-pages.js.map