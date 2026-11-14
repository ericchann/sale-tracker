#!/usr/bin/env python3
"""Import one store handoff doc (e.g. zara_women_latest) as a day file in a store folder.

  usage: python3 tools/import_latest.py <doc.json> <store_dir> [--force]

Writes <store_dir>/<date>.json = {date, store, label, promo, readable, check, items:[...]}
(no written_at) and appends the date to <store_dir>/index.json "days" (created if missing).
Refuses (exit 1, nothing written) when the doc is not readable, has no items list, or an item
lacks id/sale. An existing day file is only replaced with --force. A store with 0 items is
valid ("No items listed today"). Prints one summary line.
"""
import json, os, sys, datetime

MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
args = [a for a in sys.argv[1:] if not a.startswith('--')]
if len(args) != 2:
    sys.exit(__doc__)
doc_path, out = args
force = '--force' in sys.argv
d = json.load(open(doc_path))
if d.get('readable') is False or not isinstance(d.get('items'), list) or not d.get('date'):
    print('REFUSED: doc not readable / no items list / no date'); sys.exit(1)
bad = [i for i in d['items'] if i.get('id') in (None, '') or not isinstance(i.get('sale'), (int, float))]
if bad:
    print(f'REFUSED: {len(bad)} item(s) without id or numeric sale'); sys.exit(1)
date = d['date']
y, m, dd = map(int, date.split('-'))
keep = ('id', 'seq', 'name', 'color', 'sale', 'orig', 'range', 'photo', 'url')
items = [{k: i.get(k) for k in keep if k in i} for i in d['items']]
day = {'date': date, 'store': d.get('store'), 'label': f'{MON[m-1]} {dd}', 'promo': d.get('promo'),
       'readable': d.get('readable', True), 'check': d.get('check'), 'items': items}
os.makedirs(out, exist_ok=True)
fp = os.path.join(out, date + '.json'); ip = os.path.join(out, 'index.json')
if os.path.exists(fp) and not force:
    print(f'SKIPPED: {fp} exists (use --force)'); sys.exit(0)
json.dump(day, open(fp, 'w'), separators=(',', ':'))
ix = json.load(open(ip)) if os.path.exists(ip) else {'days': []}
if date not in ix['days']:
    ix['days'].append(date); ix['days'].sort()
json.dump(ix, open(ip, 'w'))
print(f"{d.get('store')}: {date} {len(items)} items, {sum(1 for i in items if i.get('photo'))} with photo")
