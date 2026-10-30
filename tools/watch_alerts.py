#!/usr/bin/env python3
"""Print watchlist alerts for the newest day (empty output = nothing to report).

Reads data/watch.json ({"items":[{id,seq?,name,color?}]}) and every day file/archive.
Matching mirrors the site: id+seq on per-colorway days, id+name (lowest price) on older days.
Events: price drop (and new low), price rise, back in the list, no longer listed, now 60%+ off.

usage: python3 tools/watch_alerts.py
"""
import json, os, re

D = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data')
norm = lambda s: re.sub(r'[^a-z0-9]+', '', (s or '').lower())
money = lambda v: '$%.2f' % v
pct = lambda i: round((1 - i['sale'] / i['orig']) * 100)
rd = lambda p: json.load(open(os.path.join(D, p)))

def days():
    ix = rd('index.json'); out = []
    for n in ix['days']:
        if not n.endswith('-baseline'):
            out.append(rd(n + '.json'))
    for a in ix.get('archive', []):
        for d in rd(a)['days']:
            out.append({'date': d['date'], 'items': [dict(zip(('id', 'seq', 'name', 'color', 'sale', 'orig'), r)) for r in d['items']]})
    return sorted(out, key=lambda d: d['date'])

def match(w, items):
    best = None
    for i in items:
        if w.get('seq') and i.get('seq'):
            ok = i['id'] == w['id'] and str(i['seq']) == str(w['seq'])
        else:
            ok = i['id'] == w['id'] and norm(i['name']) == norm(w.get('name'))
        if ok and (best is None or i['sale'] < best['sale']):
            best = i
    return best

try:
    watch = rd('watch.json').get('items', [])
except FileNotFoundError:
    watch = []
ds = days()
if not watch or len(ds) < 2:
    raise SystemExit(0)
today = ds[-1]
lines = []
for w in watch:
    pts = [(d, match(w, d['items'])) for d in ds]
    cur, prev = pts[-1][1], pts[-2][1]
    earlier = [i for _, i in pts[:-1] if i]
    name = (w.get('name') or '') + (' (' + w['color'] + ')' if w.get('color') else '')
    msg = []
    if cur and prev:
        if cur['sale'] < prev['sale']:
            m = f"price drop {money(prev['sale'])} -> {money(cur['sale'])} ({pct(cur)}% off)"
            if cur['sale'] < min(i['sale'] for i in earlier):
                m += ', new low'
            msg.append(m)
        elif cur['sale'] > prev['sale']:
            msg.append(f"price up {money(prev['sale'])} -> {money(cur['sale'])}")
        if pct(cur) >= 60 and pct(prev) < 60:
            msg.append('now 60%+ off')
    elif cur and not prev and earlier:
        msg.append(f"back in the list at {money(cur['sale'])} ({pct(cur)}% off)")
    elif prev and not cur:
        msg.append(f"no longer listed (was {money(prev['sale'])})")
    if msg:
        lines.append(f'- {name}: ' + '; '.join(msg))
if lines:
    print(f"Watchlist ({today['date']}):")
    print('\n'.join(lines))
