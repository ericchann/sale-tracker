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
const tk=keyFor(legacyCmp(T,Y)),ym=minBy(Y,tk);
const isNew=i=>Y&&!ym[tk(i)];
function card(i,tags=''){const p=photo(i);
return `<a class="card" href="${url(i)}" target="_blank" rel="noopener"><div class="ph">${p?`<img loading="lazy" src="${p}" alt="" onerror="this.remove()">`:'no photo'}<span class="tag">${pct(i)}% off</span>${tags}</div><div class="info"><div class="nm">${esc(i.name)}</div><div class="cl">${esc(i.color||'')}</div><div class="pr"><b>${$$(i.sale)}</b><s>${$$(i.orig)}</s></div></div></a>`}
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
function render(){$('#view').innerHTML=cur==='t'?view(T,Y):(Y?view(Y,null):'<div class="empty">No earlier day yet.</div>');
 document.querySelectorAll('.tabs button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.k===cur))}
document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>{cur=b.dataset.k;render()});
$('#ttl').textContent=(idx.store||'Sale')+' clearance';render();
// More: full table
let sortK='pct',asc=false,q='',flt='all';
function tbl(){let r=T.items.map(i=>({...i,pct:pct(i)}));
 if(q)r=r.filter(i=>(i.name+' '+i.color+' '+i.id).toLowerCase().includes(q));
 if(flt==='60')r=r.filter(i=>i.pct>=60);if(flt==='new')r=r.filter(isNew);
 r.sort((a,b)=>{const x=a[sortK],y=b[sortK];return(x>y?1:x<y?-1:0)*(asc?1:-1)});
 $('#tb').innerHTML=r.map(i=>`<tr><td><a href="${url(i)}" target="_blank">${esc(i.name)}</a></td><td>${esc(i.color||'')}</td><td>${$$(i.sale)}</td><td>${$$(i.orig)}</td><td>${i.pct}%</td></tr>`).join('');$('#cnt').textContent=r.length+' rows'}
$('#q').oninput=e=>{q=e.target.value.toLowerCase();tbl()};$('#f').onchange=e=>{flt=e.target.value;tbl()};
document.querySelectorAll('th').forEach(th=>th.onclick=()=>{const k=th.dataset.k;asc=sortK===k?!asc:false;sortK=k;tbl()});
tbl();
$('#older').innerHTML=idx.days.slice(0,-2).reverse().map(d=>`<li>${esc(d)}</li>`).join('')||'<li class="empty">No older days yet.</li>';
})();
