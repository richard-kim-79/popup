// ============================================================
// Popup API v1 Client — MCP Server → REST API
// ============================================================
const BASE_URL = process.env.POPUP_API_URL ?? 'https://popup2026.com';
const API_KEY = process.env.MCP_API_KEY ?? '';
async function request(method, path, body) {
    const url = `${BASE_URL}${path}`;
    const headers = {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
    };
    const res = await fetch(url, {
        method,
        headers,
        ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
        return {
            ok: false,
            status: res.status,
            error: (json.error ?? { code: 'UNKNOWN', message: `HTTP ${res.status}` }),
        };
    }
    return { ok: true, status: res.status, data: json };
}
export function createPage(blocks) {
    return request('POST', '/api/v1/pages', { blocks });
}
export function listPages(page = 1, pageSize = 20) {
    return request('GET', `/api/v1/pages?page=${page}&pageSize=${pageSize}`);
}
export function getPage(slug) {
    return request('GET', `/api/v1/pages/${slug}`);
}
export function deletePage(slug) {
    return request('DELETE', `/api/v1/pages/${slug}`);
}
// --- Blocks ---
export function updateBlocks(slug, blocks) {
    return request('PUT', `/api/v1/pages/${slug}/blocks`, { blocks });
}
export function editBlocks(slug, operations) {
    return request('PATCH', `/api/v1/pages/${slug}/blocks`, { operations });
}
export function requestUpload(slug, filename, mimeType, size) {
    return request('POST', `/api/v1/pages/${slug}/upload`, { filename, mimeType, size });
}
export function listTemplates() {
    return request('GET', '/api/v1/templates');
}
export function createFromTemplate(templateId, overrides) {
    return request('POST', '/api/v1/templates', { templateId, overrides });
}
//# sourceMappingURL=api-client.js.map