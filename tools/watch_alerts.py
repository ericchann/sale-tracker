#!/usr/bin/env python3
"""Print watch-list alerts (empty output = nothing to report).

Two personal lists live in the repo:
  data/watch-eric.json    {"items":[{id, seq?, name, color?}]}          -> Eric's Abercrombie items
  data/watch-phoebe.json  {"items":[{store, id, seq?, name, color?}]}   -> Phoebe's stores
For every watched item the newest day of its store is compared with the previous day.
Events: price drop (and new low), price rise, back in the list, no longer listed, now 60%+ off.
Matching mirrors the site: id+seq on per-colorway days, id+name (lowest price) otherwise.

usage: python3 tools/watch_alerts.py [--date YYYY-MM-DD ...]
  --date  (repeatable) only look at stores whose newest day is one of these dates, so a store
          that was not updated today is not alerted twice. Without it every store is checked.
"""
import json, os, re, sys

D = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data')
norm = lambda s: re.sub(r'[^a-z0-9]+', '', (s or '').lower())
money = lambda v: '$%.2f' % v
pct = lambda i: round((1 - i['sale'] / i['orig']) * 100) if i.get('orig') else None
exists = lambda p: os.path.exists(os.path.join(D, p))
rd = lambda p: json.load(open(os.path.join(D, p)))
COLS = ('id', 'seq', 'name', 'color', 'sale', 'orig')
LABEL = {'abercrombie': 'Abercrombie', 'dolcevita': 'Dolce Vita', 'samedelman': 'Sam Edelman', 'zara': 'Zara',
         'bershka': 'Bershka', 'jcrew': 'J.Crew', 'uniqlo': 'Uniqlo'}
# person -> (watch file, folder holding that person's stores, default store)
PEOPLE = [('Eric', 'watch-eric.json', lambda s: '' if s == 'abercrombie' else s, 'abercrombie'),
          ('Phoebe', 'watch-phoebe.json', lambda s: 'phoebe/' + s, None)]
dates = [sys.argv[i + 1] for i, a in enumerate(sys.argv) if a == '--date' and i + 1 < len(sys.argv)]

def rows(day):
    out = []
    for r in day['items']:
        out.append(dict(zip(COLS, r)) if isinstance(r, list) else r)
    return out

def store_days(folder):
    pre = folder + '/' if folder else ''
    if not exists(pre + 'index.json'):
        return []
    ix = rd(pre + 'index.json'); out = []
    for n in ix.get('days', []):
        if not n.endswith('-baseline') and exists(pre + n + '.json'):
            d = rd(pre + n + '.json'); out.append({'date': d['date'], 'items': rows(d)})
    for a in ix.get('archive', []):
        if exists(a):
            for d in rd(a)['days']:
                out.append({'date': d['date'], 'items': rows(d)})
    return sorted(out, key=lambda d: d['date'])

def match(w, items):
    best = None
    for i in items:
        if w.get('seq') and i.get('seq'):
            ok = str(i['id']) == str(w['id']) and str(i['seq']) == str(w['seq'])
        else:
            ok = str(i['id']) == str(w['id']) and norm(i.get('name')) == norm(w.get('name'))
        if ok and (best is None or i['sale'] < best['sale']):
            best = i
    return best

def events(w, ds):
    pts = [match(w, d['items']) for d in ds]
    cur, prev = pts[-1], pts[-2]
    earlier = [i for i in pts[:-1] if i]
    msg = []
    if cur and prev:
        pc, pp = pct(cur), pct(prev)
        off = f' ({pc}% off)' if pc is not None else ''
        if cur['sale'] < prev['sale']:
            m = f"price drop {money(prev['sale'])} -> {money(cur['sale'])}{off}"
            if cur['sale'] < min(i['sale'] for i in earlier):
                m += ', new low'
            msg.append(m)
        elif cur['sale'] > prev['sale']:
            msg.append(f"price up {money(prev['sale'])} -> {money(cur['sale'])}")
        if pc is not None and pp is not None and pc >= 60 and pp < 60:
            msg.append('now 60%+ off')
    elif cur and not prev and earlier:
        pc = pct(cur)
        msg.append(f"back in the list at {money(cur['sale'])}" + (f' ({pc}% off)' if pc is not None else ''))
    elif prev and not cur:
        msg.append(f"no longer listed (was {money(prev['sale'])})")
    return msg

legacy = 'watch.json'  # older single list, treated as Eric's when watch-eric.json is missing
for person, wfile, folder_of, default_store in PEOPLE:
    path = wfile if exists(wfile) else (legacy if person == 'Eric' and exists(legacy) else None)
    items = rd(path).get('items', []) if path else []
    cache, lines, shown = {}, [], None
    for w in items:
        sid = w.get('store') or default_store
        if not sid:
            continue
        if sid not in cache:
            cache[sid] = store_days(folder_of(sid))
        ds = cache[sid]
        if len(ds) < 2 or (dates and ds[-1]['date'] not in dates):
            continue
        msg = events(w, ds)
        if msg:
            shown = max(shown or '', ds[-1]['date'])
            name = (w.get('name') or '') + (' (' + w['color'] + ')' if w.get('color') else '')
            tag = f"[{LABEL.get(sid, sid)}] " if person == 'Phoebe' else ''
            lines.append(f'- {tag}{name}: ' + '; '.join(msg))
    if lines:
        print(f'Watchlist — {person} ({shown}):')
        print('\n'.join(lines))
