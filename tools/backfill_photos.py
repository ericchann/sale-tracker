#!/usr/bin/env python3
"""Fill in `photo` for old (no-seq) day files using the newest per-colorway day.

An old item gets a photo only when exactly one photo code matches it on
id + name + sale + orig in the reference day; ambiguous or unmatched items
are left alone. Existing photos are never overwritten. Safe to re-run.

usage: python3 tools/backfill_photos.py [--ref YYYY-MM-DD] [--dry-run]
"""
import json, re, sys, collections, os

D = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data')
norm = lambda s: re.sub(r'[^a-z0-9]+', '', (s or '').lower())
load = lambda n: json.load(open(os.path.join(D, n + '.json')))
dry = '--dry-run' in sys.argv

days = load('index')['days']
seq_days = [n for n in days if any('seq' in i for i in load(n)['items'])]
ref = sys.argv[sys.argv.index('--ref') + 1] if '--ref' in sys.argv else seq_days[-1]
by = collections.defaultdict(set)
for i in load(ref)['items']:
    if i.get('photo'):
        by[(i['id'], norm(i['name']), i['sale'], i['orig'])].add(i['photo'])

for n in days:
    if n in seq_days:
        continue
    d = load(n)
    filled = amb = miss = 0
    for i in d['items']:
        if i.get('photo'):
            continue
        c = by.get((i['id'], norm(i['name']), i['sale'], i['orig']), set())
        if len(c) == 1:
            i['photo'] = next(iter(c)); filled += 1
        elif c:
            amb += 1
        else:
            miss += 1
    print(f'{n}: filled {filled}, ambiguous {amb}, no match {miss}')
    if not dry and filled:
        json.dump(d, open(os.path.join(D, n + '.json'), 'w'), separators=(',', ':'))
