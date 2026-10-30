(async function(){
const $=s=>document.querySelector(s);
const get=async u=>window.__DATA__?window.__DATA__[u]:(await fetch(u)).json();
const idx=await get('data/index.json');
const photos=await get('data/photos.json').catch(()=>({}));
const watch=(await get('data/watch.json').catch(()=>null))||{items:[]};
const names=idx.days.slice(-2);
const days=[];for(const n of names)days.push(await get('data/'+n+'.json'));
const [Y,T]=days.length==2?days:[null,days[0]];
const slug=n=>n.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const hasSeq=i=>i.seq!=null&&i.seq!=='';
const url=i=>`https://www.abercrombie.com/shop/us/p/${slug(i.name)}-${i.id}${hasSeq(i)?'?seq='+encodeURIComponent(i.seq):''}`;
const pct=i=>Math.round((1-i.sale/i.orig)*100);
const $$=v=>'$'+v.toFixed(2);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const dayHasSeq=d=>!!d&&d.items.some(hasSeq);
// first per-colorway day vs an older day without seq: compare by product+name+orig instead
const legacyCmp=(D,P)=>dayHasSeq(D)&&!!P&&!dayHasSeq(P);
const keyFor=legacy=>i=>legacy?i.id+'|'+i.name+'|'+i.orig:(hasSeq(i)?i.id+'|'+i.seq:i.id);
const minBy=(d,k)=>{const m={};if(d)for(const i of d.items){const x=k(i);if(!m[x]||i.sale<m[x].sale)m[x]=i}return m};
const imgUrl=c=>`https://img.abercrombie.com/is/image/anf/KIC_${c}_prod1?policy=product-medium&wid=350&hei=438`;
// per-colorway items use their own photo only; photos.json (by product id) is for old no-seq days
const photo=i=>i.photo?imgUrl(i.photo):(!hasSeq(i)&&photos[i.id]?imgUrl(photos[i.id]):null);
// favorites: saved in this browser only (localStorage), keyed id|seq (or id|name for old no-seq items)
const FKEY='sale-tracker-favs';
let favs={};try{favs=JSON.parse(localStorage.getItem(FKEY)||'{}')||{}}catch(e){favs={}}
const saveFavs=()=>{try{localStorage.setItem(FKEY,JSON.stringify(favs))}catch(e){}};
const fk=i=>hasSeq(i)?i.id+'|'+i.seq:i.id+'|'+i.name;
const wmeta=w=>({id:w.id,seq:w.seq,name:w.name,color:w.color||'',photo:''});
// a browser that has never saved favorites starts from the repo watch list
try{if(localStorage.getItem(FKEY)===null&&watch.items.length){for(const w of watch.items)favs[fk(w)]=wmeta(w);saveFavs()}}catch(e){}
const star=i=>{const k=fk(i),on=!!favs[k];return `<span class="fav" role="button" tabindex="0" aria-label="Favorite" aria-pressed="${on}" data-k="${esc(k)}">${on?'\u2605':'\u2606'}</span>`};
const tk=keyFor(legacyCmp(T,Y)),ym=minBy(Y,tk);
const isNew=i=>Y&&!ym[tk(i)];
function card(i,tags='',extra=''){const p=photo(i)||i._p;
return `<a class="card" href="${url(i)}" target="_blank" rel="noopener"><div class="ph">${p?`<img loading="lazy" src="${p}" alt="" onerror="this.remove()">`:'<span class="nop">No photo</span>'}<span class="tag">${pct(i)}% off</span>${tags}${star(i)}</div><div class="info"><div class="nm">${esc(i.name)}</div><div class="cl">${esc(i.color||'')}</div><div class="pr"><b>${$$(i.sale)}</b><s>${$$(i.orig)}</s></div>${extra}</div></a>`}
let vcat='all',vsort='off';
const CATS=[['Swim',/swim|trunk/],['Outerwear',/jacket|coat|puffer|bomber|parka|vest|windbreaker|shacket|blazer|anorak/],['Sweaters',/sweater|cardigan|knit/],['Hoodies',/hoodie|afterhood|sweatshirt|fleece|zip/],['Underwear',/boxer|brief|underwear|socks?\b/],['Tees & tanks',/\btees?\b|t-shirt|tank|muscle|henley|jersey/],['Shirts & polos',/polo|shirt|flannel|oxford|button|popover/],['Bottoms',/\bpants?\b|\bshorts?\b(?![- ]sleeve)|jogger|jean|sweatpant|chino|trouser|cargo|denim|legging/]];
const catOf=n=>{const t=String(n).toLowerCase();for(const [c,r] of CATS)if(r.test(t))return c;return 'Other'};
function view(D,P,which){
 const its=D.items,hotAll=its.filter(i=>pct(i)>=60);
 const legacy=legacyCmp(D,P),k=keyFor(legacy),dm=minBy(P,k),cm=minBy(D,k);
 const newsAll=Object.values(cm).filter(i=>P&&!dm[k(i)]);
 const cn=c=>hotAll.filter(i=>catOf(i.name)===c).length;
 const cats=[...CATS.map(c=>c[0]),'Other'].filter(c=>cn(c)||newsAll.some(i=>catOf(i.name)===c));
 const vc=vcat==='all'||cats.includes(vcat)?vcat:'all',vs=vsort==='drop'&&!P?'off':vsort;
 const dropAmt=i=>dm[k(i)]?Math.max(0,dm[k(i)].sale-i.sale):0;
 const off=(a,b)=>pct(b)-pct(a)||a.sale-b.sale;
 const ord={off,price:(a,b)=>a.sale-b.sale||off(a,b),saved:(a,b)=>(b.orig-b.sale)-(a.orig-a.sale)||off(a,b),drop:(a,b)=>dropAmt(b)-dropAmt(a)||off(a,b)}[vs];
 const sel=a=>vc==='all'||catOf(a.name)===vc;
 const hot=hotAll.filter(sel).sort(ord),news=newsAll.filter(sel).sort(ord);
 const of=(n,t)=>vc==='all'?n:n+' of '+t;
 const drops=Object.values(cm).filter(i=>P&&dm[k(i)]&&i.sale<dm[k(i)].sale);
 const gone=P?Object.values(dm).filter(i=>!cm[k(i)]):[];
 const none=t=>`<div class="empty">${t}</div>`;
 const row=(i,right)=>{const p=photo(i);return `<li class="row"><a class="th" href="${url(i)}" target="_blank" rel="noopener">${p?`<img loading="lazy" src="${p}" alt="" onerror="this.remove()">`:''}</a><div class="rm"><a class="nm" href="${url(i)}" target="_blank" rel="noopener">${esc(i.name)}</a><div class="cl">${esc(i.color||'')}</div></div><div class="rp">${right}</div></li>`};
 const rows=(a,f)=>a.length?`<ul class="rows">${a.map(f).join('')}</ul>`:none('None.');
 const st=(n,l)=>`<div class="st"><b>${n}</b><span>${l}</span></div>`;
 const chip=(c,t,n)=>`<button class="chip" data-c="${esc(c)}" aria-pressed="${c===vc}">${esc(t)}${n!=null?` <i>${n}</i>`:''}</button>`;
 let o=`<div class="stats">${st(hotAll.length,'at 60%+ off')}${st(hotAll.filter(i=>pct(i)>=70).length,'at 70%+')}${P?st(newsAll.length,'new')+st(drops.length,'price drops')+st(gone.length,'gone'):''}${st(its.length,'listings')}</div>`;
 o+=`<p class="promo">${esc(D.promo||'')}${D.readable===false?' <b>Page could not be read fully.</b>':''}${legacy?' Colorway comparison starts next day; today is compared to yesterday by product, name and original price.':''}</p>`;
 o+=`<div class="controls"><div class="chips" role="group" aria-label="Category">${chip('all','All')}${cats.map(c=>chip(c,c,cn(c))).join('')}</div><label class="sort"><span class="sub">Sort</span><select id="vs">${[['off','Biggest discount %'],['saved','Biggest $ saved'],['price','Lowest price']].concat(P?[['drop','Biggest drop since yesterday']]:[]).map(([v,t])=>`<option value="${v}"${v===vs?' selected':''}>${t}</option>`).join('')}</select></label></div>`;
 o+=`<section><h2>60%+ off <span class="ct">${of(hot.length,hotAll.length)}</span></h2>${hot.length?`<div class="grid">${hot.map(i=>card(i,(P&&!dm[k(i)]?'<span class="tag n">NEW</span>':(P&&dm[k(i)]&&i.sale<dm[k(i)].sale?'<span class="tag d">DROP</span>':'')))).join('')}</div>`:none('Nothing matches this filter.')}</section>`;
 if(P){
 o+=`<section><h2>New <span class="ct">${of(news.length,newsAll.length)} since ${esc(P.label)}</span></h2>${news.length?`<div class="grid">${news.map(i=>card(i)).join('')}</div>`:none('Nothing new.')}</section>`;
 o+=`<section><h2>Price drops <span class="ct">${drops.length}</span></h2>${rows(drops,i=>row(i,`<s>${$$(dm[k(i)].sale)}</s> \u2192 <b>${$$(i.sale)}</b> <span class="sub">${pct(i)}% off</span>`))}</section>`;
 o+=`<section><h2>Gone <span class="ct">${gone.length}</span></h2>${rows(gone,i=>row(i,`was ${$$(i.sale)}`))}</section>`;}
 return o}
const main=$('#view');let cur='t';
const byKey={};for(const d of [Y,T])if(d)for(const i of d.items)byKey[fk(i)]=i;
const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const fmtD=d=>{const [,m,dd]=String(d).split('-');return MON[+m-1]+' '+(+dd)};
const norm=x=>String(x||'').toLowerCase().replace(/[^a-z0-9]+/g,'');
// a favorite matches its id+seq on per-colorway days, and id+name (lowest price) on older days
const matchDay=(f,D)=>{let m=null;for(const i of D.items){const ok=f.seq&&hasSeq(i)?i.id===f.id&&String(i.seq)===String(f.seq):i.id===f.id&&norm(i.name)===norm(f.name);if(ok&&(!m||i.sale<m.sale))m=i}return m};
let allDays=null;
const COLS=['id','seq','name','color','sale','orig'];
const unpack=a=>a.days.map(d=>({date:d.date,label:d.label,items:d.items.map(r=>{const o={};COLS.forEach((c,n)=>{if(r[n]!==''&&r[n]!=null)o[c]=r[n]});return o})}));
const loadAll=async()=>allDays||(allDays=await(async()=>{
 const cur=await Promise.all(idx.days.filter(n=>!/baseline/.test(n)).map(n=>get('data/'+n+'.json')));
 const arch=(await Promise.all((idx.archive||[]).map(a=>get('data/'+a)))).flatMap(unpack);
 return arch.concat(cur).sort((a,b)=>String(a.date)<String(b.date)?-1:1)})());
const spark=pts=>{if(pts.length<2)return '';const v=pts.map(p=>p.i.sale),lo=Math.min(...v),hi=Math.max(...v),W=120,H=28;
 const x=n=>n*(W-6)/(pts.length-1)+3,y=v=>hi===lo?H/2:H-3-(v-lo)*(H-6)/(hi-lo);
 return `<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><polyline points="${pts.map((p,n)=>x(n).toFixed(1)+','+y(p.i.sale).toFixed(1)).join(' ')}"/></svg>`};
async function favView(){
 const keys=Object.keys(favs),wset=new Set(watch.items.map(fk));
 const panel=`<details class="sync"><summary>Sync and alerts</summary><div class="syncb"><p class="sub">${watch.items.length} item${watch.items.length===1?'':'s'} in the repo watch list. The daily run sends alerts for them, and any device can import them. To update it: copy, paste over the file on GitHub, then commit.</p><div class="btns"><button id="fcopy">Copy favorites as watch list</button><a href="https://github.com/ericchann/sale-tracker/edit/main/data/watch.json" target="_blank" rel="noopener">Edit on GitHub</a><button id="fimp">Import watch list</button></div></div></details>`;
 if(!keys.length){$('#view').innerHTML=panel+'<div class="empty big"><b>No favorites yet</b><span>Tap the star on any item to track its price over time.</span></div>';return}
 $('#view').innerHTML=panel+'<div class="empty">Loading history\u2026</div>';
 const D=await loadAll();if(cur!=='f')return;
 const lastD=D[D.length-1];
 const cards=keys.map(k=>{const f=favs[k],pts=[];for(const d of D){const m=matchDay(f,d);if(m)pts.push({d,i:m})}
  const last=pts[pts.length-1];if(!last)return `<div class="note">${esc(f.name)} ${esc(f.color||'')} \u2014 not seen in any day yet. ${star(f)}</div>`;
  const prev=pts[pts.length-2],listed=last.d===lastD,v=pts.map(p=>p.i.sale);
  const chg=prev?(last.i.sale<prev.i.sale?`<span class="chg dn">\u2193 ${$$(prev.i.sale-last.i.sale)} since ${fmtD(prev.d.date)}</span>`:last.i.sale>prev.i.sale?`<span class="chg up">\u2191 ${$$(last.i.sale-prev.i.sale)} since ${fmtD(prev.d.date)}</span>`:`<span class="chg">no change since ${fmtD(prev.d.date)}</span>`):'<span class="chg">first day tracked</span>';
  const extra=`<div class="hist">${spark(pts)}<div>${chg}</div><div class="sub">Low ${$$(Math.min(...v))} \u00b7 High ${$$(Math.max(...v))}</div>${listed?'':`<div class="sub"><b>Not listed ${esc(fmtD(lastD.date))}</b> \u2014 last seen ${esc(fmtD(last.d.date))}</div>`}<span class="pill${wset.has(k)?' on':''}">${wset.has(k)?'Alerts on':'No alerts'}</span><details><summary>Price history (${pts.length} day${pts.length>1?'s':''})</summary><div class="sub">${pts.map(p=>`<span class="nw">${fmtD(p.d.date)} ${$$(p.i.sale)}</span>`).join(' \u00b7 ')}</div></details></div>`;
  return card({...last.i,_p:f.photo},'',extra)}).join('');
 $('#view').innerHTML=panel+`<h2>Favorites <span class="ct">${keys.length} tracked \u00b7 saved in this browser</span></h2><div class="grid favgrid">${cards}</div>`}
function favCount(){const b=document.querySelector('.tabs button[data-k="f"]');if(b){const n=Object.keys(favs).length;b.innerHTML='Favorites'+(n?' <span class="bd">'+n+'</span>':'')}}
function toggleFav(k){if(favs[k])delete favs[k];else{const i=byKey[k]||{};favs[k]={id:i.id,seq:i.seq,name:i.name,color:i.color||'',photo:photo(i)||''};if(!favs[k].id){const p=k.split('|');favs[k].id=p[0]}}
 saveFavs();document.querySelectorAll('.fav').forEach(e=>{if(e.dataset.k===k){const on=!!favs[k];e.setAttribute('aria-pressed',on);e.textContent=on?'\u2605':'\u2606'}});favCount();if(cur==='f')favView()}
document.addEventListener('click',e=>{const f=e.target.closest&&e.target.closest('.fav');if(!f)return;e.preventDefault();e.stopPropagation();toggleFav(f.dataset.k)});
document.addEventListener('change',e=>{const t=e.target;if(t.id==='vs'){vsort=t.value;render();const n=$('#vs');if(n)n.focus()}});
document.addEventListener('click',e=>{const c=e.target.closest&&e.target.closest('.chip');if(c){vcat=c.dataset.c;render();const n=document.querySelector('.chip[aria-pressed="true"]');if(n)n.focus()}});
document.addEventListener('click',e=>{const t=e.target;if(t.id==='fcopy'){const txt=JSON.stringify({items:Object.values(favs).map(f=>{const o={id:f.id};if(f.seq)o.seq=f.seq;o.name=f.name;if(f.color)o.color=f.color;return o})},null,2)+'\n';
  const done=()=>{t.textContent='Copied!';setTimeout(()=>{t.textContent='Copy favorites as watch list'},1500)};
  (navigator.clipboard?navigator.clipboard.writeText(txt):Promise.reject()).then(done,()=>{window.prompt('Copy this watch list JSON:',txt)})}
 else if(t.id==='fimp'){for(const w of watch.items)if(!favs[fk(w)])favs[fk(w)]=wmeta(w);saveFavs();favCount();favView()}});
document.addEventListener('keydown',e=>{if(e.key!=='Enter'&&e.key!==' ')return;const f=e.target.closest&&e.target.closest('.fav');if(!f)return;e.preventDefault();toggleFav(f.dataset.k)});
function render(){if(cur==='f')favView();else $('#view').innerHTML=cur==='t'?view(T,Y):(Y?view(Y,null):'<div class="empty">No earlier day yet.</div>');favCount();
 document.querySelectorAll('.tabs button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.k===cur))}
document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>{cur=b.dataset.k;render()});

{const f=(o)=>new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',...o}),now=new Date();
 const ny=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York'}).format(now),hr=+f({hour:'numeric',hour12:false}).format(now)%24;
 const age=Math.round((Date.parse(ny+'T00:00:00Z')-Date.parse(T.date+'T00:00:00Z'))/864e5);
 const warn=age>=2||(age===1&&hr>=18);
 const u=$('#upd');if(u)u.innerHTML=`Last update: ${esc(T.label||fmtD(T.date))}`+(warn?` <b class="warn">No update for ${age} days \u2014 the daily run may have failed.</b>`:'')}
render();
// More: full table
let sortK='pct',asc=false,q='',flt='all';
function tbl(){let r=T.items.map(i=>({...i,pct:pct(i)}));
 if(q)r=r.filter(i=>(i.name+' '+i.color+' '+i.id).toLowerCase().includes(q));
 if(flt==='60')r=r.filter(i=>i.pct>=60);if(flt==='new')r=r.filter(isNew);
 r.sort((a,b)=>{const x=a[sortK],y=b[sortK];return(x>y?1:x<y?-1:0)*(asc?1:-1)});
 $('#tb').innerHTML=r.map(i=>`<tr><td>${star(i)} <a href="${url(i)}" target="_blank">${esc(i.name)}</a></td><td>${esc(i.color||'')}</td><td>${$$(i.sale)}</td><td>${$$(i.orig)}</td><td>${i.pct}%</td></tr>`).join('');$('#cnt').textContent=r.length+' rows'}
$('#q').oninput=e=>{q=e.target.value.toLowerCase();tbl()};$('#f').onchange=e=>{flt=e.target.value;tbl()};
document.querySelectorAll('th').forEach(th=>th.onclick=()=>{const k=th.dataset.k;asc=sortK===k?!asc:false;sortK=k;tbl()});
tbl();
$('#older').innerHTML=idx.days.slice(0,-2).reverse().map(d=>`<li>${esc(d)}</li>`).concat((idx.archive||[]).slice().reverse().map(a=>`<li>${esc(a.replace(/^archive\//,'').replace(/\.json$/,''))} (archived)</li>`)).join('')||'<li class="empty">No older days yet.</li>';
})();
