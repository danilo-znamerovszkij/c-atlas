# Sets id_and_class.category/subcategory in public/data/{locale}/*.json from a
# per-locale label table, so every file uses the same label for the same value.
# Usage: python3 scripts/i18n-labels/apply.py de
import json, glob, os, sys
locale = sys.argv[1]
root = os.path.join(os.path.dirname(__file__), '..', '..')
t = json.load(open(os.path.join(root, 'scripts', 'i18n-labels', f'{locale}.json'), encoding='utf-8'))
cats, canon, subs = t['categories'], t['canonical_categories'], t['subcategories']
missing, changed = set(), 0
for path in glob.glob(os.path.join(root, 'public', 'data', locale, '*.json')):
    name = os.path.basename(path)
    en = json.load(open(os.path.join(root, 'public', 'data', name), encoding='utf-8'))['id_and_class']
    d = json.load(open(path, encoding='utf-8'))
    ic = d['id_and_class']
    c = canon.get(en.get('category'), en.get('category'))
    want_cat = cats.get(c)
    want_sub = subs.get(en.get('subcategory')) if en.get('subcategory') else None
    if want_cat is None: missing.add(('cat', c))
    if en.get('subcategory') and want_sub is None: missing.add(('sub', en['subcategory']))
    new = dict(ic)
    if want_cat: new['category'] = want_cat
    if want_sub: new['subcategory'] = want_sub
    if new != ic:
        d['id_and_class'] = new
        json.dump(d, open(path, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
        open(path, 'a').write('\n')
        changed += 1
print(f'{locale}: {changed} files updated; missing labels: {sorted(missing) or "none"}')
