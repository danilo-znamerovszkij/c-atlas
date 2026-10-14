export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD') // Decompose accented characters
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritical marks
    .replace(/[øæœßłđ]/g, c => ({ ø: 'o', æ: 'ae', œ: 'oe', ß: 'ss', ł: 'l', đ: 'd' })[c] ?? c) // Letters NFD can't decompose (e.g. 'Strømme')
    .replace(/[^\w\s-]/g, '') // Remove remaining special characters except word chars, spaces, and hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
}

// Chart taxonomy node names (src/config/chartConfig.ts baseData) carry
// punctuation/accents/spaces that the actual public/data/*.json filenames
// don't (e.g. 'A. Clark' -> A-Clark.json, 'Buzs\u00e1ki' -> Buzsaki.json,
// 'Brain Circuits' -> Brain-Circuits.json) - the content files were named by
// slugifying the theory name and then title-casing each hyphen-separated
// word. Route any raw chart name through this before using it as a filename
// stem, rather than interpolating the chart name directly.
export function resolveTheoryFileStem(chartName: string): string {
  return generateSlug(chartName)
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('-')
}
