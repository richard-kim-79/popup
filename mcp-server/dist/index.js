#!/usr/bin/env node
// ============================================================
// Popup MCP Server — AI-native page management via LLM tools
// ============================================================
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerCreatePage } from './tools/create-page.js';
import { registerGetPage } from './tools/get-page.js';
import { registerUpdateBlocks } from './tools/update-blocks.js';
import { registerEditBlocks } from './tools/edit-blocks.js';
import { registerDeletePage } from './tools/delete-page.js';
import { registerListPages } from './tools/list-pages.js';
import { registerTemplates } from './tools/templates.js';
import { registerUploadImage } from './tools/upload-image.js';
const server = new McpServer({
    name: 'popup',
    version: '1.0.0',
});
// Register all tools
registerCreatePage(server);
registerGetPage(server);
registerUpdateBlocks(server);
registerEditBlocks(server);
registerDeletePage(server);
registerListPages(server);
registerTemplates(server);
registerUploadImage(server);
// Resources
server.resource('templates', 'leaf://templates', async () => ({
    contents: [{
            uri: 'leaf://templates',
            mimeType: 'application/json',
            text: JSON.stringify({
                description: 'Available page templates for Popup',
                templates: [
                    { id: 'landing-page', name: 'Landing Page', description: 'Product/service intro page' },
                    { id: 'event-invite', name: 'Event Invite', description: 'Event/meeting invitation' },
                    { id: 'link-in-bio', name: 'Link in Bio', description: 'Social media links collection' },
                ],
            }, null, 2),
        }],
}));
// Start server
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}
main().catch((err) => {
    process.stderr.write(`MCP Server error: ${err}\n`);
    process.exit(1);
});
//# sourceMappingURL=index.js.map