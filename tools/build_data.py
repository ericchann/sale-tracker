import json,re,collections,sys
S='/tmp/claude-0/-home-claude/8e362886-cdd6-5ee5-b900-c12bf44a578e/scratchpad/'
base=json.load(open(S+'snap/snapshots/abercrombie_clearance.json'));base=base.get('data',base)
upd=json.load(open(S+'w/upd.json'))
rows=json.load(open(S+'w/rows.json'))
today_tokens=open(S+'w/today.txt').read().split()

def parse_cat(cat):
    names={};pts=collections.OrderedDict()
    for e in cat:
        i,n,p=e.split('|',2);names[i]=re.sub(r'\s*\(\d{8}\)$','',n);pts[i]=[tuple(map(float,q.split('/'))) for q in p.split(',')]
    return names,pts
n_old,p_old=parse_cat(base['catalog'])
n_new,p_new=parse_cat(upd['catalog'])
names={**n_old,**n_new}
# overrides from the curated 60%+ rows: (id,sale)->(name,color)
ov={}
for r in rows:
    if r[1]=='60%+ off':
        i=r[7].split('id ')[-1];sale=float(r[4].strip('$'))
        ov[(i,sale)]=(r[2],r[3])
ov[('62375343',59.97)]=('A&F AirCloud Mockneck Puffer','+23 colors')
ov[('63724822',54.99)]=('3-Pack Premium Heavyweight Tanks','1 color')
def items(pts):
    out=[]
    for i,pl in pts.items():
        for s,o in sorted(set(pl)):
            n,c=ov.get((i,s),(names[i],''))
            out.append({'id':i,'name':n,'color':c,'sale':s,'orig':o})
    return out
# today: from the 700 listings, deduped
tp=collections.OrderedDict()
for tok in today_tokens:
    i,p=tok.split(':');s,o=map(float,p.split('/'));tp.setdefault(i,[]).append((s,o))
today_items=items(tp)
old_items=items(p_old)
promo_old="Seasonal Edit up to 25% off ended Oct 26. Free standard shipping over $99; 15% off email signup. (Homepage was unreadable in the earlier run.)"
promo_new="No sitewide sale. Free standard shipping over $99 and 15% off for email signup. The Seasonal Edit (up to 25% off) ended Oct 26."
json.dump({'date':'2026-10-27','label':'Oct 27 (3 PM run)','store':'abercrombie','promo':promo_new,'readable':True,'check':'700 items on 16 contiguous pages, XS filter applied','items':today_items},open('data/2026-10-27.json','w'),separators=(',',':'))
json.dump({'date':'2026-10-27','label':'Oct 27 (earlier baseline)','store':'abercrombie','promo':promo_old,'readable':False,'check':'Earlier same-day catalog; deduped by product id','items':old_items},open('data/2026-10-27-baseline.json','w'),separators=(',',':'))
json.dump({'store':'Abercrombie','days':['2026-10-27-baseline','2026-10-27']},open('data/index.json','w'))
print(len(today_items),len(old_items))
