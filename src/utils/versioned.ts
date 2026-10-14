// Content JSON (i18n, theories, categories, theory index) isn't content-hashed,
// so stamp each request with the build ID: every deploy asks for new URLs.
// This also escapes copies old Vercel deploys told browsers to keep as
// 'immutable' for a year.
export const versioned = (path: string): string => `${path}?v=${__BUILD_ID__}`
