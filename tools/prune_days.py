#!/usr/bin/env python3
"""Move day files older than --keep days (default 60, counted back from the newest day)
into compact monthly archives data/archive/YYYY-MM.json and update data/index.json.

Archive format: {"days":[{"date","label","items":[[id,seq,name,color,sale,orig],...]}]}
The site's Favorites history reads archives too. "-baseline" files are dropped (a real
file exists for the same date). Always keeps the newest 2 days unarchived.

usage: python3 tools/prune_days.py [--keep 60] [--dry-run]
"""
import json, os, sys, datetime, collections

D = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data')
keep = int(sys.argv[sys.argv.index('--keep') + 1]) if '--keep' in sys.argv else 60
dry = '--dry-run' in sys.argv
ix = json.load(open(os.path.join(D, 'index.json')))
date = lambda n: datetime.date.fromisoformat(n[:10])
newest = max(date(n) for n in ix['days'])
real = [n for n in ix['days'] if not n.endswith('-baseline')]
protect = set(real[-2:])
old = [n for n in ix['days'] if (newest - date(n)).days > keep and n not in protect]
if not old:
    print('nothing to archive'); sys.exit(0)
groups = collections.defaultdict(list)
for n in old:
    groups[n[:7]].append(n)
os.makedirs(os.path.join(D, 'archive'), exist_ok=True)
for month, names in sorted(groups.items()):
    path = os.path.join(D, 'archive', month + '.json')
    arch = json.load(open(path)) if os.path.exists(path) else {'days': []}
    have = {x['date'] for x in arch['days']}
    for n in names:
        if n.endswith('-baseline'):
            continue
        d = json.load(open(os.path.join(D, n + '.json')))
        if d['date'] in have:
            continue
        arch['days'].append({'date': d['date'], 'label': d.get('label', ''), 'items': [
            [i['id'], i.get('seq', ''), i['name'], i.get('color', ''), i['sale'], i['orig']] for i in d['items']]})
    arch['days'].sort(key=lambda x: x['date'])
    print(f'{month}: {len(names)} day file(s) -> archive/{month}.json ({len(arch["days"])} days)')
    if not dry:
        json.dump(arch, open(path, 'w'), separators=(',', ':'))
        ix.setdefault('archive', [])
        if 'archive/' + month + '.json' not in ix['archive']:
            ix['archive'].append('archive/' + month + '.json')
        for n in names:
            os.remove(os.path.join(D, n + '.json'))
if not dry:
    ix['days'] = [n for n in ix['days'] if n not in old]
    ix['archive'] = sorted(ix.get('archive', []))
    json.dump(ix, open(os.path.join(D, 'index.json'), 'w'))
