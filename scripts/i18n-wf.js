export const meta = {
  name: 'translate-theories',
  description: 'Build one locale label table, translate missing theory files, then apply labels for consistency',
  phases: [
    { title: 'Labels', detail: 'one agent writes scripts/i18n-labels/{locale}.json' },
    { title: 'Translate', detail: 'agents, ~22 files each; labels are not translated per file' },
    { title: 'Apply', detail: 'apply labels to every file and validate' },
  ],
}

// args: { locale: 'es', name: 'Spanish', files: ['A.json', ...] }
const { locale, name, files } = args
const N = 12
const per = Math.ceil(files.length / N)
const groups = []
for (let i = 0; i < files.length; i += per) groups.push(files.slice(i, i + per))

const ROOT = '/Users/dan/Repositories/c-atlas'

function labelsPrompt() {
  return `Build the ${name} (\`${locale}\`) label table for the Consciousness Atlas.

Read ${ROOT}/docs/i18n/TRANSLATION_GUIDE.md and ${ROOT}/docs/i18n/glossary.json, and ${ROOT}/public/i18n/taxonomy/${locale}.json if it exists (use the labels it already has).

Collect the distinct values of \`id_and_class.category\` and \`id_and_class.subcategory\` across ${ROOT}/public/data/*.json (English sources). Use a short script to list them. Some category values are spelled inconsistently (e.g. "Idealisms", "Monisms"); map each to its canonical category.

Write ${ROOT}/scripts/i18n-labels/${locale}.json with exactly this shape:
{ "categories": {"<canonical English category>": "<${name} label>"},
  "canonical_categories": {"<non-canonical English category>": "<canonical English category>"},
  "subcategories": {"<English subcategory>": "<${name} label>"} }

Rules: one label per English value, used everywhere. Same register as the glossary. Keep proper names and transliterated terms as the glossary has them. Do not edit anything else. Reply with the number of categories and subcategories written.`
}

function buildPrompt(batch) {
  const list = batch.join(', ')
  return `Translate theory-content JSON files for "Consciousness Atlas" from English into ${name} (\`${locale}\`).

First read: ${ROOT}/docs/i18n/TRANSLATION_GUIDE.md and ${ROOT}/docs/i18n/glossary.json (use its \`${locale}\` renderings; do not edit it).

Your files (source in ${ROOT}/public/data/): ${list}

For EACH file (read, translate, write, one at a time):
- Keep the EXACT JSON keys, nesting and value types as the source, even where the source deviates from the schema. Translate values only.
- Do NOT translate: \`id_and_class.associated_thinkers\`, \`id_and_class.classification_tags\`, \`sources_and_references[].title_with_names\`, \`.year\`, or any \`names\` arrays.
- Do NOT translate \`id_and_class.category\` or \`id_and_class.subcategory\`. Copy them from the English source unchanged; a later step sets the translated labels.
- \`related_theories[].name\` stays EXACTLY as the English source (same characters, including straight apostrophes). Translate \`related_theories[].relationship\`.
- Empty ("" or []) stays empty. Keep transliterated Sanskrit/Arabic/Hebrew terms as the source has them.
- Write to ${ROOT}/public/data/${locale}/{filename} (create the directory if needed).

After your files, run: cd ${ROOT} && node scripts/i18n-check.js ${locale} --files ${batch.join(',')}
Fix any hard failures about your files and re-run until there are none. Warnings about "identical to English source" are fine.

Do NOT modify docs/i18n/progress/STATUS.json, docs/i18n/glossary.json or scripts/i18n-labels/.
Report: how many files you wrote, and the final validation line.`
}

phase('Labels')
const labels = await agent(labelsPrompt(), { label: `${locale}-labels`, phase: 'Labels' })

phase('Translate')
const results = await parallel(
  groups.map((batch, i) => () =>
    agent(buildPrompt(batch), { label: `${locale}-group-${i + 1} (${batch.length}f)`, phase: 'Translate' })
  )
)

phase('Apply')
const applied = await agent(
  `Run: cd ${ROOT} && python3 scripts/i18n-labels/apply.py ${locale}
Then run: cd ${ROOT} && node scripts/i18n-check.js ${locale}
Report the apply line and the number of data-file hard failures (lines starting with FAIL data/). Do not edit any file except to fix a hard failure in a data file's id_and_class or structure to match its English source.`,
  { label: `${locale}-apply`, phase: 'Apply' }
)

return { locale, labels: !!labels, groups: groups.length, done: results.filter(Boolean).length, applied: !!applied }
