export interface Portrait { name: string; src: string; author: string | null; license: string; licenseUrl: string | null; source: string }
export function portraitKey(name: string): string
export function portraitIndex(portraits: Record<string, Omit<Portrait, 'name'>>): Map<string, Portrait>
export function portraitTitle(p: Portrait): string
export function portraitImg(p: Portrait, size: number, cls?: string): string
export function thinkersHtml(names: string[], index: Map<string, Portrait>, size?: number): string | null
