import { z } from 'zod';
import { deletePage } from '../lib/api-client.js';
export function registerDeletePage(server) {
    server.tool('delete_page', 'Delete a Popup page by its slug. This is a soft delete (recoverable).', {
        slug: z.string().describe('The page slug to delete'),
    }, { readOnlyHint: false, destructiveHint: true }, async ({ slug }) => {
        const result = await deletePage(slug);
        if (!result.ok) {
            return {
                content: [{ type: 'text', text: `Error: ${result.error?.message ?? 'Delete failed'}` }],
                isError: true,
            };
        }
        return {
            content: [{ type: 'text', text: `Page "${slug}" has been deleted.` }],
        };
    });
}
//# sourceMappingURL=delete-page.js.map