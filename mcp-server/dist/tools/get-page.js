import { z } from 'zod';
import { getPage } from '../lib/api-client.js';
export function registerGetPage(server) {
    server.tool('get_page', 'Get the content and metadata of a Popup page by its slug.', {
        slug: z.string().describe('The page slug (e.g. "abc123")'),
    }, { readOnlyHint: true }, async ({ slug }) => {
        const result = await getPage(slug);
        if (!result.ok) {
            return {
                content: [{ type: 'text', text: `Error: ${result.error?.message ?? 'Page not found'}` }],
                isError: true,
            };
        }
        return {
            content: [{ type: 'text', text: JSON.stringify(result.data, null, 2) }],
        };
    });
}
//# sourceMappingURL=get-page.js.map