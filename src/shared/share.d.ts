export interface ShareContext { url: string; text: string; title: string; image: string }
export interface ShareTarget { id: string; label: string; color: string; path: string; stroke?: boolean; href: (ctx: ShareContext) => string }
export const SHARE_TARGETS: ShareTarget[]
export function shareIcon(target: ShareTarget, size?: number): string
export function shareLinksHtml(ctx: ShareContext, options?: { labels?: boolean }): string
