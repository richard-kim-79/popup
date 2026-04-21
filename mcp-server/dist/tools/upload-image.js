import { z } from 'zod';
import { requestUpload } from '../lib/api-client.js';
export function registerUploadImage(server) {
    server.tool('upload_image', 'Get a signed upload URL for adding an image to a page. Returns the signed URL and public URL. The LLM or client must then upload the file to the signed URL.', {
        slug: z.string().describe('The page slug to upload to'),
        filename: z.string().describe('Original filename (e.g. "photo.jpg")'),
        mimeType: z.enum(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'])
            .describe('MIME type of the file'),
        size: z.number().describe('File size in bytes'),
    }, { readOnlyHint: false, destructiveHint: false }, async ({ slug, filename, mimeType, size }) => {
        const result = await requestUpload(slug, filename, mimeType, size);
        if (!result.ok) {
            return {
                content: [{ type: 'text', text: `Error: ${result.error?.message ?? 'Upload request failed'}` }],
                isError: true,
            };
        }
        return {
            content: [{
                    type: 'text',
                    text: JSON.stringify({
                        signedUrl: result.data.signedUrl,
                        publicUrl: result.data.publicUrl,
                        token: result.data.token,
                        path: result.data.path,
                        instructions: 'Upload the file to the signedUrl using PUT with the file binary. Then use the publicUrl in an image block.',
                    }, null, 2),
                }],
        };
    });
}
//# sourceMappingURL=upload-image.js.map