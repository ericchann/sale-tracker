#!/usr/bin/env python3
"""Fill blank `photo` values in the non-Abercrombie stores (data/<store>/ and data/phoebe/<store>/) from
any other day where the same item (id + seq) has a photo; the most recent photo wins.
Existing photos are never overwritten and Abercrombie is not touched. Safe to re-run.

usage: python3 tools/carry_photos.py [--dry-run]
"""
import json, os, sys, glob

D = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data')
dry = '--dry-run' in sys.argv
key = lambda i: str(i.get('id', '')) + '|' + str(i.get('seq') or '')
for sd in sorted(glob.glob(os.path.join(D, '*', 'index.json')) + glob.glob(os.path.join(D, 'phoebe', '*', 'index.json'))):
    store_dir = os.path.dirname(sd); store = os.path.relpath(store_dir, D)
    days = json.load(open(sd)).get('days', [])
    data = {n: json.load(open(os.path.join(store_dir, n + '.json'))) for n in days
            if os.path.exists(os.path.join(store_dir, n + '.json'))}
    best = {}
    for n in sorted(data):
        for i in data[n].get('items', []):
            if i.get('photo'):
                best[key(i)] = i['photo']
    for n in sorted(data):
        filled = missing = 0
        for i in data[n].get('items', []):
            if not i.get('photo'):
                if key(i) in best:
                    i['photo'] = best[key(i)]; filled += 1
                else:
                    missing += 1
        if filled and not dry:
            json.dump(data[n], open(os.path.join(store_dir, n + '.json'), 'w'), separators=(',', ':'))
        if filled or missing:
            print(f'{store}/{n}: filled {filled}, still blank {missing}')
