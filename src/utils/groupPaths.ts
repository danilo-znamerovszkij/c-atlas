// Map URLs for categories and subcategories: /{category} and
// /{category}/{subcategory}. Shared by the app router and the Worker (relative
// imports only). A subcategory whose slug equals a theory's in the same
// category ('Computational') gets '-theories', since /{category}/{theory}
// already belongs to the theory.
import taxonomy from '../config/taxonomy.json'
import { generateSlug } from './slugUtils'

interface Node { name: string; children?: Node[] }

const pathBySlug = new Map<string, string[]>()
const slugByKey = new Map<string, string>()

for (const top of taxonomy as Node[]) {
  const category = generateSlug(top.name)
  const children = top.children ?? []
  const leafSlugs = new Set(children.flatMap(c => c.children ?? [c]).map(l => generateSlug(l.name)))
  const add = (path: string[], slug: string) => {
    pathBySlug.set(slug, path)
    slugByKey.set(path.join('/'), slug)
  }
  add([top.name], category)
  for (const group of children.filter(c => c.children)) {
    const slug = generateSlug(group.name)
    add([top.name, group.name], `${category}/${leafSlugs.has(slug) ? `${slug}-theories` : slug}`)
  }
}

export const categorySlugs = new Set([...pathBySlug.keys()].filter(slug => !slug.includes('/')))

// ['Materialism', 'Neurobiological'] -> '/materialism/neurobiological'
export const groupUrlPath = (path: string[]): string => {
  const slug = slugByKey.get(path.join('/'))
  return slug ? `/${slug}` : '/'
}

// URL segments -> chart key path, or null if they don't name a category/subcategory.
export const groupPathFromSegments = (segments: string[]): string[] | null =>
  segments.length ? pathBySlug.get(segments.join('/')) ?? null : null
