(async function(){
const $=s=>document.querySelector(s);
const get=async u=>window.__DATA__?window.__DATA__[u]:(await fetch(u)).json();
const idx=await get('data/index.json');
const photos=await get('data/photos.json').catch(()=>({}));
const names=idx.days.slice(-2);
const days=[];for(const n of names)days.push(await get('data/'+n+'.json'));
const [Y,T]=days.length==2?days:[null,days[0]];
const slug=n=>n.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const url=i=>`https://www.abercrombie.com/shop/us/p/${slug(i.name)}-${i.id}`;
const pct=i=>Math.round((1-i.sale/i.orig)*100);
const $$=v=>'$'+v.toFixed(2);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const minBy=d=>{const m={};if(d)for(const i of d.items){if(!m[i.id]||i.sale<m[i.id].sale)m[i.id]=i}return m};
const tm=minBy(T),ym=minBy(Y);
const isNew=i=>Y&&!ym[i.id], isDrop=i=>Y&&ym[i.id]&&tm[i.id].sale<ym[i.id].sale&&i.sale===tm[i.id].sale;
const photo=i=>photos[i.id]?`https://img.abercrombie.com/is/image/anf/KIC_${photos[i.id]}_prod1?policy=product-medium`:null;
function card(i,tags=''){const p=photo(i);
return `<a class="card" href="${url(i)}" target="_blank" rel="noopener"><div class="ph">${p?`<img loading="lazy" src="${p}" alt="" onerror="this.remove()">`:'no photo'}<span class="tag">${pct(i)}% off</span>${tags}</div><div class="info"><div class="nm">${esc(i.name)}</div><div class="cl">${esc(i.color||'')}</div><div class="pr"><b>${$$(i.sale)}</b><s>${$$(i.orig)}</s></div></div></a>`}
function view(D,P,which){
 const its=D.items,hot=its.filter(i=>pct(i)>=60).sort((a,b)=>pct(b)-pct(a)||a.sale-b.sale);
 const dm=minBy(P),cm=minBy(D);
 const news=Object.values(cm).filter(i=>P&&!dm[i.id]).sort((a,b)=>pct(b)-pct(a));
 const drops=Object.values(cm).filter(i=>P&&dm[i.id]&&i.sale<dm[i.id].sale);
 const gone=P?Object.values(dm).filter(i=>!cm[i.id]):[];
 const li=(a,f)=>a.length?`<ul class="l">${a.map(f).join('')}</ul>`:'<div class="empty">None.</div>';
 const h=hot.filter(i=>pct(i)>=70);
 let o=`<div class="sub">${esc(D.label)} · ${its.length} listings</div>`;
 o+=`<div class="note">${esc(D.promo||'')}${D.readable===false?' <b>Page could not be read fully.</b>':''}</div>`;
 o+=`<h2>${hot.length} items at 60%+ off${h.length?` (${h.length} at 70%+)`:''}</h2><div class="grid">${hot.map(i=>card(i,(P&&!dm[i.id]?'<span class="tag n">NEW</span>':(P&&dm[i.id]&&i.sale<dm[i.id].sale?'<span class="tag d">DROP</span>':'')))).join('')}</div>`;
 if(P){
 o+=`<h2>New since ${esc(P.label)} (${news.length})</h2>`+li(news,i=>`<li><a href="${url(i)}" target="_blank">${esc(i.name)}</a> ${esc(i.color||'')} — <b>${$$(i.sale)}</b> <s>${$$(i.orig)}</s> (${pct(i)}% off)</li>`);
 o+=`<h2>Price drops (${drops.length})</h2>`+li(drops,i=>`<li><a href="${url(i)}" target="_blank">${esc(i.name)}</a> — ${$$(dm[i.id].sale)} → <b>${$$(i.sale)}</b> (${pct(i)}% off)</li>`);
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
