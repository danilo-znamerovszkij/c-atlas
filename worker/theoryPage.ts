// Server-rendered theory pages. For /{category}/{theory} (optionally locale-
// prefixed) the Worker puts the theory's real content into the HTML so search
// engines and link previews see it without running the app:
//   - <title>, meta description, Open Graph/Twitter tags, Article JSON-LD
//   - an <article> with the theory text inside #item-details (the app replaces
//     it with the interactive panel as soon as it boots)
// It also fixes up the URL itself: wrong category -> 301 to the right one,
// unknown theory -> 404, and canonical/hreflang only point at languages the
// theory actually exists in.
import taxonomy from '../src/config/taxonomy.json'
import { generateSlug, resolveTheoryFileStem } from '../src/utils/slugUtils'
import { SITE_ORIGIN, DEFAULT_LOCALE, buildLocalizedPath } from '../src/shared/site'
import type { Locale } from '../src/shared/site'
import type { TheoryData } from '../src/types/theory'
import enTaxonomy from '../public/i18n/taxonomy/en.json'

interface Leaf { name: string; categoryKey: string; categorySlug: string; subcategoryKey: string }

const leafBySlug = new Map<string, Leaf>()
for (const top of taxonomy as { name: string; children: any[] }[]) {
  for (const child of top.children) {
    for (const leaf of child.children ?? [child]) {
      leafBySlug.set(generateSlug(leaf.name), {
        name: leaf.name,
        categoryKey: top.name,
        categorySlug: generateSlug(top.name),
        subcategoryKey: child.children ? child.name : ''
      })
    }
  }
}
// Related theories are stored by display name; map those (and leaf keys) back
// to leaf slugs. Apostrophe variants are folded.
const nameKey = (name: string) => name.toLowerCase().replace(/[’‘`]/g, "'").replace(/\s+/g, ' ').trim()
const slugByName = new Map<string, string>()
for (const [slug, leaf] of leafBySlug) {
  slugByName.set(nameKey(leaf.name), slug)
  const full = (enTaxonomy.fullNames as Record<string, string>)[leaf.name]
  if (full) slugByName.set(nameKey(full), slug)
}

let translations: Promise<Record<string, string[]>> | null = null

const esc = (value: unknown) =>
  String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const truncate = (text: string, max: number) =>
  text.length <= max ? text : text.slice(0, text.lastIndexOf(' ', max - 1)).replace(/[,;:]$/, '') + '…'

export type TheoryRoute =
  | { kind: 'redirect'; location: string }
  | { kind: 'page'; status: number; theory: TheoryData | null; canonical: string; locales: Locale[]; leaf: Leaf | null }

// Resolve a 2-segment path to a theory page, a redirect, or a 404.
export async function routeTheory(
  assets: Fetcher, origin: string, locale: Locale, categorySegment: string, theorySlug: string
): Promise<TheoryRoute> {
  const leaf = leafBySlug.get(theorySlug) ?? null
  if (leaf && categorySegment !== leaf.categorySlug) {
    return { kind: 'redirect', location: SITE_ORIGIN + buildLocalizedPath(`/${leaf.categorySlug}/${theorySlug}`, locale) }
  }
  translations ??= assets.fetch(new URL('/theory-index/translations.json', origin))
    .then(r => (r.ok ? r.json() : {}) as Promise<Record<string, string[]>>)
    .catch(() => ({}))
  const stem = resolveTheoryFileStem(leaf?.name ?? theorySlug)
  const translated = (await translations)[stem] ?? []
  const hasLocale = locale === DEFAULT_LOCALE || translated.includes(locale)

  const theory = await fetchTheory(assets, origin, hasLocale && locale !== DEFAULT_LOCALE ? `/data/${locale}/${stem}.json` : `/data/${stem}.json`)
  const path = `/${categorySegment}/${theorySlug}`
  return {
    kind: 'page',
    status: theory ? 200 : 404,
    theory,
    // Untranslated theory under a locale prefix: same English content, so the
    // English URL is canonical.
    canonical: SITE_ORIGIN + (hasLocale ? buildLocalizedPath(path, locale) : path),
    locales: [DEFAULT_LOCALE, ...translated] as Locale[],
    leaf
  }
}

async function fetchTheory(assets: Fetcher, origin: string, path: string): Promise<TheoryData | null> {
  const response = await assets.fetch(new URL(path, origin))
  // Missing files fall through to the SPA's index.html, so check the type.
  if (!response.ok || !(response.headers.get('content-type') || '').includes('json')) return null
  try {
    return await response.json() as TheoryData
  } catch {
    return null
  }
}

function relatedHref(name: string, locale: Locale): string | null {
  const slug = slugByName.get(nameKey(name))
  const leaf = slug ? leafBySlug.get(slug) : undefined
  return leaf ? buildLocalizedPath(`/${leaf.categorySlug}/${slug}`, locale) : null
}

// Short names people search for, keyed by chart leaf.
const SEARCH_ALIASES: Record<string, string> = {
  'Penrose-Hameroff': 'Orch OR', IIT: 'IIT', 'Baars-Dehaene': 'GWT', Graziano: 'AST', Lamme: 'RPT',
  Friston: 'Free Energy Principle', 'Crick-Koch': 'NCC', Rosenthal: 'HOT'
}

// Title for search results: the entry's title, plus its acronym and thinker
// surnames when the title doesn't already contain them ("Analytic Idealism"
// -> "Analytic Idealism (Kastrup)").
export function searchTitle(theory: TheoryData, leaf: Leaf | null): string {
  const title = theory.id_and_class.theory_title
  const lower = title.toLowerCase()
  const extras: string[] = []
  const alias = leaf ? SEARCH_ALIASES[leaf.name] : undefined
  if (alias && !lower.includes(alias.toLowerCase())) extras.push(alias)
  const thinkers = theory.id_and_class.associated_thinkers ?? []
  if (thinkers.length >= 1 && thinkers.length <= 2) {
    const surnames = thinkers.map(n => n.trim().split(/\s+/).pop()!.replace(/[^\p{L}'-]/gu, '')).filter(Boolean)
    if (surnames.length && !surnames.some(n => lower.includes(n.toLowerCase()))) extras.push(surnames.join(' & '))
  }
  if (!extras.length) return title
  // "Integrated Information Theory (IIT)" -> "(IIT, Tononi & Koch)", not "(IIT) (…)"
  return title.endsWith(')') ? `${title.slice(0, -1)}, ${extras.join(', ')})` : `${title} (${extras.join(', ')})`
}

// Head tags + JSON-LD for a theory page.
export function theoryHead(theory: TheoryData, canonical: string, leaf: Leaf | null = null): { title: string; description: string; jsonLd: string } {
  const ic = theory.id_and_class
  const title = `${searchTitle(theory, leaf)} · Consciousness Atlas`
  const description = truncate([ic.core_identity_tagline, ic.summary].filter(Boolean).join('. ').replace(/\.\./g, '.'), 158)
  const article = {
    '@type': 'Article',
    headline: ic.theory_title,
    description: truncate(ic.summary, 300),
    url: canonical,
    about: ic.classification_tags,
    author: ic.associated_thinkers.map(name => ({ '@type': 'Person', name })),
    isPartOf: { '@type': 'WebSite', name: 'Consciousness Atlas', url: SITE_ORIGIN },
    publisher: { '@type': 'Organization', name: 'Consciousness Atlas', url: SITE_ORIGIN },
    genre: [ic.category, ic.subcategory].filter(Boolean)
  }
  // Home › Category › Theory (the category step links to its section on the map).
  const breadcrumb = {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Consciousness Atlas', item: `${SITE_ORIGIN}/` },
      ...(leaf ? [{ '@type': 'ListItem', position: 2, name: (enTaxonomy.categories as Record<string, string>)[leaf.categoryKey] ?? leaf.categoryKey, item: `${SITE_ORIGIN}/${leaf.categorySlug}` }] : []),
      { '@type': 'ListItem', position: leaf ? 3 : 2, name: ic.theory_title, item: canonical }
    ]
  }
  const jsonLd = JSON.stringify({ '@context': 'https://schema.org', '@graph': [article, breadcrumb] }).replace(/</g, '\\u003c')
  return { title, description, jsonLd }
}

// Readable article for crawlers and the first paint; the app swaps it for the
// interactive panel on boot.
export function theoryArticle(theory: TheoryData, locale: Locale, leaf: Leaf | null = null): string {
  const { id_and_class: ic, conceptual_ground: cg, mechanism_and_dynamics: md, empirics_and_critiques: ec, implications: im, relations_and_sources: rs } = theory
  const field = (label: string, value: string) => value?.trim() ? `<h2>${esc(label)}</h2><p>${esc(value)}</p>` : ''
  const implications = ([
    ['AI consciousness', im.AI_consciousness], ['Survival beyond death', im.survival_beyond_death],
    ['Meaning and purpose', im.meaning_and_purpose], ['Virtual immortality', im.virtual_immortality]
  ] as const).filter(([, v]) => v?.stance)
  const related = rs.related_theories.map(r => {
    const href = relatedHref(r.name, locale)
    return `<li>${href ? `<a href="${esc(href)}">${esc(r.name)}</a>` : esc(r.name)} <span>(${esc(r.relationship)})</span></li>`
  }).join('')
  return `
<article class="ssr-theory" lang="${esc(locale)}">
  <h1>${esc(ic.theory_title)}</h1>
  <p class="ssr-theory-category">${esc([ic.category, ic.subcategory].filter(Boolean).join(' › '))}</p>
  ${ic.core_identity_tagline ? `<p class="ssr-theory-tagline">${esc(ic.core_identity_tagline)}</p>` : ''}
  <p class="ssr-theory-summary">${esc(ic.summary)}</p>
  ${ic.associated_thinkers.length ? `<p class="ssr-theory-thinkers">${esc(ic.associated_thinkers.join(', '))}</p>` : ''}
  ${field('What consciousness is', cg.explanatory_identity_claim)}
  ${field('Mind and body', cg.mind_body_relationship)}
  ${field('Mechanism', md.distinctive_mechanism_or_principle)}
  ${md.core_claims_and_evidence.length ? `<h2>Core claims</h2><ul>${md.core_claims_and_evidence.map(c => `<li>${esc(c)}</li>`).join('')}</ul>` : ''}
  ${field('Criticisms', ec.criticisms_and_tensions)}
  ${implications.length ? `<h2>Implications</h2><dl>${implications.map(([q, v]) => `<dt>${esc(q)}: ${esc(v.stance)}</dt><dd>${esc(v.rationale)}</dd>`).join('')}</dl>` : ''}
  ${related ? `<h2>Related theories</h2><ul>${related}</ul>` : ''}
  ${rs.sources_and_references.length ? `<h2>Sources</h2><ul>${rs.sources_and_references.map(s => `<li>${esc(s.title_with_names)}${s.year ? ` (${esc(s.year)})` : ''}</li>`).join('')}</ul>` : ''}
  <p><a href="${esc(buildLocalizedPath('/', locale))}">Explore all theories on the Consciousness Atlas</a>${leaf ? ` · <a href="/compare?t=${esc(generateSlug(leaf.name))}">Compare ${esc(ic.theory_title)} with other theories</a>` : ''} · <a href="/quiz">Which theory of consciousness fits you?</a></p>
</article>`
}
