(async function(){
const $=s=>document.querySelector(s);
const get=async u=>window.__DATA__?window.__DATA__[u]:(await fetch(u)).json();
const idx=await get('data/index.json');
const photos=await get('data/photos.json').catch(()=>({}));
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
const star=i=>{const k=fk(i),on=!!favs[k];return `<span class="fav" role="button" tabindex="0" aria-label="Favorite" aria-pressed="${on}" data-k="${esc(k)}">${on?'\u2605':'\u2606'}</span>`};
const tk=keyFor(legacyCmp(T,Y)),ym=minBy(Y,tk);
const isNew=i=>Y&&!ym[tk(i)];
function card(i,tags='',extra=''){const p=photo(i)||i._p;
return `<a class="card" href="${url(i)}" target="_blank" rel="noopener"><div class="ph">${p?`<img loading="lazy" src="${p}" alt="" onerror="this.remove()">`:'no photo'}<span class="tag">${pct(i)}% off</span>${tags}${star(i)}</div><div class="info"><div class="nm">${esc(i.name)}</div><div class="cl">${esc(i.color||'')}</div><div class="pr"><b>${$$(i.sale)}</b><s>${$$(i.orig)}</s></div>${extra}</div></a>`}
function view(D,P,which){
 const its=D.items,hot=its.filter(i=>pct(i)>=60).sort((a,b)=>pct(b)-pct(a)||a.sale-b.sale);
 const legacy=legacyCmp(D,P),k=keyFor(legacy),dm=minBy(P,k),cm=minBy(D,k);
 const news=Object.values(cm).filter(i=>P&&!dm[k(i)]).sort((a,b)=>pct(b)-pct(a));
 const drops=Object.values(cm).filter(i=>P&&dm[k(i)]&&i.sale<dm[k(i)].sale);
 const gone=P?Object.values(dm).filter(i=>!cm[k(i)]):[];
 const li=(a,f)=>a.length?`<ul class="l">${a.map(f).join('')}</ul>`:'<div class="empty">None.</div>';
 const h=hot.filter(i=>pct(i)>=70);
 let o=`<div class="sub">${esc(D.label)} · ${its.length} listings</div>`;
 o+=`<div class="note">${esc(D.promo||'')}${D.readable===false?' <b>Page could not be read fully.</b>':''}${legacy?' Colorway comparison starts next day; today is compared to yesterday by product, name and original price.':''}</div>`;
 o+=`<h2>${hot.length} items at 60%+ off${h.length?` (${h.length} at 70%+)`:''}</h2><div class="grid">${hot.map(i=>card(i,(P&&!dm[k(i)]?'<span class="tag n">NEW</span>':(P&&dm[k(i)]&&i.sale<dm[k(i)].sale?'<span class="tag d">DROP</span>':'')))).join('')}</div>`;
 if(P){
 o+=`<h2>New since ${esc(P.label)} (${news.length})</h2>`+(news.length?`<div class="grid">${news.map(i=>card(i)).join('')}</div>`:'<div class="empty">None.</div>');
 o+=`<h2>Price drops (${drops.length})</h2>`+li(drops,i=>`<li><a href="${url(i)}" target="_blank">${esc(i.name)}</a>${i.color?' '+esc(i.color):''} — ${$$(dm[k(i)].sale)} → <b>${$$(i.sale)}</b> (${pct(i)}% off)</li>`);
 o+=`<h2>Gone (${gone.length})</h2>`+li(gone,i=>`<li>${esc(i.name)} ${esc(i.color||'')} — was ${$$(i.sale)}</li>`);}
 return o}
const main=$('#view');let cur='t';
const byKey={};for(const d of [Y,T])if(d)for(const i of d.items)byKey[fk(i)]=i;
const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const fmtD=d=>{const [,m,dd]=String(d).split('-');return MON[+m-1]+' '+(+dd)};
const norm=x=>String(x||'').toLowerCase().replace(/[^a-z0-9]+/g,'');
// a favorite matches its id+seq on per-colorway days, and id+name (lowest price) on older days
const matchDay=(f,D)=>{let m=null;for(const i of D.items){const ok=f.seq&&hasSeq(i)?i.id===f.id&&String(i.seq)===String(f.seq):i.id===f.id&&norm(i.name)===norm(f.name);if(ok&&(!m||i.sale<m.sale))m=i}return m};
let allDays=null;
const loadAll=async()=>allDays||(allDays=await Promise.all(idx.days.filter(n=>!/baseline/.test(n)).map(n=>get('data/'+n+'.json'))));
const spark=pts=>{if(pts.length<2)return '';const v=pts.map(p=>p.i.sale),lo=Math.min(...v),hi=Math.max(...v),W=120,H=28;
 const x=n=>n*(W-6)/(pts.length-1)+3,y=v=>hi===lo?H/2:H-3-(v-lo)*(H-6)/(hi-lo);
 return `<svg class="spark" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true"><polyline points="${pts.map((p,n)=>x(n).toFixed(1)+','+y(p.i.sale).toFixed(1)).join(' ')}"/></svg>`};
async function favView(){
 const keys=Object.keys(favs);
 if(!keys.length){$('#view').innerHTML='<div class="empty">No favorites yet. Tap the star on any item to track its price here.</div>';return}
 $('#view').innerHTML='<div class="empty">Loading history\u2026</div>';
 const D=await loadAll();if(cur!=='f')return;
 const lastD=D[D.length-1];
 const cards=keys.map(k=>{const f=favs[k],pts=[];for(const d of D){const m=matchDay(f,d);if(m)pts.push({d,i:m})}
  const last=pts[pts.length-1];if(!last)return `<div class="note">${esc(f.name)} ${esc(f.color||'')} \u2014 not seen in any day yet. ${star(f)}</div>`;
  const prev=pts[pts.length-2],listed=last.d===lastD,v=pts.map(p=>p.i.sale);
  const chg=prev?(last.i.sale<prev.i.sale?`<span class="chg dn">\u2193 ${$$(prev.i.sale-last.i.sale)} since ${fmtD(prev.d.date)}</span>`:last.i.sale>prev.i.sale?`<span class="chg up">\u2191 ${$$(last.i.sale-prev.i.sale)} since ${fmtD(prev.d.date)}</span>`:`<span class="chg">no change since ${fmtD(prev.d.date)}</span>`):'<span class="chg">first day tracked</span>';
  const extra=`<div class="hist">${spark(pts)}<div>${chg}</div><div class="sub">Low ${$$(Math.min(...v))} \u00b7 High ${$$(Math.max(...v))} \u00b7 ${pts.length} day${pts.length>1?'s':''}</div>${listed?'':`<div class="sub"><b>Not listed ${esc(fmtD(lastD.date))}</b> \u2014 last seen ${esc(fmtD(last.d.date))}</div>`}<div class="sub">${pts.map(p=>`<span class="nw">${fmtD(p.d.date)} ${$$(p.i.sale)}</span>`).join(' \u00b7 ')}</div></div>`;
  return card({...last.i,_p:f.photo},'',extra)}).join('');
 $('#view').innerHTML=`<div class="sub">${keys.length} tracked \u00b7 saved in this browser only</div><div class="grid favgrid">${cards}</div>`}
function favCount(){const b=document.querySelector('.tabs button[data-k="f"]');if(b){const n=Object.keys(favs).length;b.textContent='Favorites'+(n?' ('+n+')':'')}}
function toggleFav(k){if(favs[k])delete favs[k];else{const i=byKey[k]||{};favs[k]={id:i.id,seq:i.seq,name:i.name,color:i.color||'',photo:photo(i)||''};if(!favs[k].id){const p=k.split('|');favs[k].id=p[0]}}
 saveFavs();document.querySelectorAll('.fav').forEach(e=>{if(e.dataset.k===k){const on=!!favs[k];e.setAttribute('aria-pressed',on);e.textContent=on?'\u2605':'\u2606'}});favCount();if(cur==='f')favView()}
document.addEventListener('click',e=>{const f=e.target.closest&&e.target.closest('.fav');if(!f)return;e.preventDefault();e.stopPropagation();toggleFav(f.dataset.k)});
document.addEventListener('keydown',e=>{if(e.key!=='Enter'&&e.key!==' ')return;const f=e.target.closest&&e.target.closest('.fav');if(!f)return;e.preventDefault();toggleFav(f.dataset.k)});
function render(){if(cur==='f')favView();else $('#view').innerHTML=cur==='t'?view(T,Y):(Y?view(Y,null):'<div class="empty">No earlier day yet.</div>');favCount();
 document.querySelectorAll('.tabs button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.k===cur))}
document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>{cur=b.dataset.k;render()});
$('#ttl').textContent=(idx.store||'Sale')+' clearance';render();
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
$('#older').innerHTML=idx.days.slice(0,-2).reverse().map(d=>`<li>${esc(d)}</li>`).join('')||'<li class="empty">No older days yet.</li>';
})();
