interface ApiResponse<T> {
    ok: boolean;
    status: number;
    data?: T;
    error?: {
        code: string;
        message: string;
        details?: Record<string, unknown>;
    };
}
export interface PageData {
    slug: string;
    url: string;
    editUrl?: string;
    pin?: string;
    editToken?: string;
    blocks: unknown[];
    locked: boolean;
    expiresAt: string;
    daysLeft?: number;
    viewCount: number;
    createdAt: string;
    updatedAt?: string;
}
export interface PagesListData {
    data: PageData[];
    total: number;
    page: number;
    pageSize: number;
}
export declare function createPage(blocks: unknown[], pin?: string): Promise<ApiResponse<PageData>>;
export declare function listPages(page?: number, pageSize?: number): Promise<ApiResponse<PagesListData>>;
export declare function getPage(slug: string): Promise<ApiResponse<PageData>>;
export declare function deletePage(slug: string): Promise<ApiResponse<{
    success: boolean;
    slug: string;
}>>;
export declare function updateBlocks(slug: string, blocks: unknown[]): Promise<ApiResponse<{
    slug: string;
    blocks: unknown[];
}>>;
export interface BlockOperation {
    op: 'insert' | 'update' | 'delete' | 'move';
    index?: number;
    block?: unknown;
    blockId?: string;
    changes?: Record<string, unknown>;
    toIndex?: number;
}
export declare function editBlocks(slug: string, operations: BlockOperation[]): Promise<ApiResponse<{
    slug: string;
    blocks: unknown[];
}>>;
export interface UploadData {
    signedUrl: string;
    token: string;
    path: string;
    publicUrl: string;
    filename: string;
}
export declare function requestUpload(slug: string, filename: string, mimeType: string, size: number): Promise<ApiResponse<UploadData>>;
export interface TemplateItem {
    id: string;
    name: string;
    description: string;
    blockCount: number;
}
export declare function listTemplates(): Promise<ApiResponse<{
    data: TemplateItem[];
}>>;
export declare function createFromTemplate(templateId: string, overrides?: unknown[]): Promise<ApiResponse<PageData & {
    templateId: string;
}>>;
export {};
