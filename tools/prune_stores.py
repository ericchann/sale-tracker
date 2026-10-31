#!/usr/bin/env python3
"""Archive day files older than --keep days (default 60, from the newest day) of the
non-Abercrombie stores into data/<store>/archive/YYYY-MM.json and update each store's
index.json. Always keeps the newest 2 days listed. usage: prune_stores.py [--keep 60]"""
import json, os, sys, datetime, collections
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data')
keep = int(sys.argv[sys.argv.index('--keep') + 1]) if '--keep' in sys.argv else 60
date = lambda n: datetime.date.fromisoformat(n[:10])
changed = False
for store in ('uniqlo', 'ralphlauren-polo', 'ralphlauren-boys', 'kith'):
    sd = os.path.join(D, store); ip = os.path.join(sd, 'index.json')
    if not os.path.exists(ip): continue
    ix = json.load(open(ip)); days = ix['days']
    if not days: continue
    newest = max(date(n) for n in days); protect = set(days[-2:])
    old = [n for n in days if (newest - date(n)).days > keep and n not in protect]
    groups = collections.defaultdict(list)
    for n in old: groups[n[:7]].append(n)
    for month, names in sorted(groups.items()):
        os.makedirs(os.path.join(sd, 'archive'), exist_ok=True)
        path = os.path.join(sd, 'archive', month + '.json')
        arch = json.load(open(path)) if os.path.exists(path) else {'days': []}
        have = {x['date'] for x in arch['days']}
        for n in names:
            d = json.load(open(os.path.join(sd, n + '.json')))
            if d['date'] not in have: arch['days'].append(d)
        arch['days'].sort(key=lambda x: x['date'])
        json.dump(arch, open(path, 'w'), ensure_ascii=False)
        for n in names: os.remove(os.path.join(sd, n + '.json'))
    if old:
        ix['days'] = [n for n in days if n not in old]
        ix.setdefault('archive', [])
        ix['archive'] = sorted(set(ix['archive']) | {'%s/archive/%s.json' % (store, m) for m in groups})
        json.dump(ix, open(ip, 'w')); changed = True
        print(store, 'archived', len(old))
if not changed: print('nothing to archive')
