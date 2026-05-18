(function(){
'use strict';

/* ── Fonts & styles ──────────────────────────────────── */
if(!document.getElementById('__cwfont')){
  var lnk=document.createElement('link');lnk.id='__cwfont';lnk.rel='stylesheet';
  lnk.href='https://api.fontshare.com/v2/css?f[]=satoshi@700,500,400&display=swap';
  document.head.appendChild(lnk);
}
if(!document.getElementById('__cwstyle')){
  var st=document.createElement('style');st.id='__cwstyle';
  st.textContent=[
    '.cw-hide{display:none!important}',
    '#__cwf,#__cwbot{font-family:"Satoshi",sans-serif!important;}',
    '#__cwf *,#__cwbot *{font-family:"Satoshi",sans-serif!important;box-sizing:border-box;}',
    '@media(max-width:768px){',
    '#__cwf .cwrow{flex-direction:column!important;}',
    '#__cwf .cwrow>*{width:100%!important;min-width:unset!important;flex:unset!important;}',
    '#__cwbot{flex-direction:column!important;align-items:flex-start!important;}',
    '.__cwpanel{min-width:100%!important;}',
    '}'
  ].join('');
  document.head.appendChild(st);
}

/* ── Constants ───────────────────────────────────────── */
var BRAND='#14214E',BRAND_LIGHT='#eef0f7',PER=10;
var STATUSES=['For Sale','For Rent','Land'];
var TYPES=['Apartment','Terrace','Semi Detached','Detached Duplex','Penthouse','Maisonette','Commercial','Mixed-Use Land','Residential Land'];
var MAIN_LOCS=['Ikoyi','Lekki','Victoria Island','Lekki Phase 1'];
var SUB_MAP={
  'Ikoyi':['Banana Island','Parkview','Old Ikoyi','Osborne Foreshore'],
  'Lekki':['VGC','Chevron','Ajah','Lekki County','Ikota','Ikate','Osapa','Pinnock Beach Estate','Orchid','Idado','Ologolo'],
  'Victoria Island':['Oniru','Eko Atlantic'],
  'Lekki Phase 1':['Freedom Way','Orange Island','Admiralty Way']
};
var AGENTS=['Adaeze','Adeyemi','Chinenye','Ebunoluwa','Emmanuel','Esther','Faith','Ifunanya','Jennifer','Nadi','Olade','Peter','Princess','Priscilla','Rose','Seun','Sophia','Teni','Titi','Ummie','Wunmi'];
var BEDS=['1–2 Beds','3–5 Beds','6–10 Beds','10+ Beds'];
var BED_VALS={'1–2 Beds':[1,2],'3–5 Beds':[3,4,5],'6–10 Beds':[6,7,8,9,10],'10+ Beds':'10+'};
var PRICES=['Under ₦50M','₦50M–₦200M','₦200M–₦500M','₦500M–₦1B','₦1B+'];
var PRICE_VALS={'Under ₦50M':[0,50],'₦50M–₦200M':[50,200],'₦200M–₦500M':[200,500],'₦500M–₦1B':[500,1000],'₦1B+':[1000,99999]};
var E={bed:'bedroom',beds:'bedroom',br:'bedroom',apt:'apartment',apts:'apartment',flat:'apartment',dup:'duplex',pent:'penthouse',one:'1',two:'2',three:'3',four:'4',five:'5',six:'6',vi:'victoria island'};
var STOP={in:1,at:1,the:1,a:1,an:1,of:1,on:1,with:1,and:1,or:1,to:1,for:1,by:1};

/* ── State ───────────────────────────────────────────── */
var S={status:[],type:[],mainLoc:[],subLoc:[],bed:[],price:[],agent:[],query:'',pid:''};
var curPage=1,allCards=[],grid=null,moreAvail=true,loading=false,preloading=false;

/* ── Auto-detect grid & cards (no hardcoded class names) */
function looksLikeCard(el){
  var t=el.textContent||'';
  return t.indexOf('₦')!==-1;
}
function detectGrid(){
  /* First try: known Framer class (works until next republish) */
  var g=document.querySelector('.framer-10qs1fj');
  if(g&&g.children.length>=2){return g;}
  /* Second try: find the div whose direct children are mostly property cards */
  var best=null,bestScore=0;
  var divs=document.querySelectorAll('div');
  for(var i=0;i<divs.length;i++){
    var d=divs[i];
    if(d.id==='__cwf'||d.id==='__cwbot')continue;
    /* skip anything inside our own UI */
    var inOurs=false;var pp=d.parentElement;
    while(pp){if(pp.id==='__cwf'||pp.id==='__cwbot'){inOurs=true;break;}pp=pp.parentElement;}
    if(inOurs)continue;
    var score=0;
    for(var j=0;j<d.children.length;j++){if(looksLikeCard(d.children[j]))score++;}
    if(score>bestScore){bestScore=score;best=d;}
  }
  return bestScore>=3?best:null;
}
function getCards(){
  if(!grid)return[];
  /* Try: direct children of grid that contain ₦ */
  var direct=Array.from(grid.children).filter(looksLikeCard);
  if(direct.length>=2)return direct;
  /* Try: one level deeper */
  var deeper=[];
  for(var i=0;i<grid.children.length;i++){
    var ch=grid.children[i];
    var inner=Array.from(ch.children).filter(looksLikeCard);
    if(inner.length>0)deeper=deeper.concat(inner);
    else if(looksLikeCard(ch))deeper.push(ch);
  }
  return deeper;
}

/* ── Text helpers ────────────────────────────────────── */
function ex(t){return E[t]||t;}
function tk(s){return s.toLowerCase().replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(function(t){return t.length>0&&!STOP[t];});}
function ct(c){return(c.textContent||'').replace(/[₦$€£][\d,]+/g,' ').replace(/\b\d{4,}\b/g,' ').replace(/-/g,' ').toLowerCase();}

/* ── Filter matchers ─────────────────────────────────── */
function qmatch(c,q){
  var ts=tk(q);if(!ts.length)return true;
  var lo=ct(c);
  return ts.every(function(t){var f=ex(t);if(/^\d+$/.test(f))return lo.indexOf(f+' bedroom')!==-1;return lo.indexOf(f)!==-1||(f!==t&&lo.indexOf(t)!==-1);});
}
function bedmatch(c){
  if(!S.bed.length)return true;var lo=ct(c);
  return S.bed.some(function(label){
    var r=BED_VALS[label];
    if(r==='10+'){for(var i=10;i<=50;i++){if(lo.indexOf(i+' bedroom')!==-1)return true;}return false;}
    return r.some(function(n){return lo.indexOf(n+' bedroom')!==-1;});
  });
}
function pmatch(c){
  if(!S.price.length)return true;
  var m=(c.textContent||'').match(/₦([\d,]+)/);if(!m)return false;
  var v=parseInt(m[1].replace(/,/g,''))/1e6;
  return S.price.some(function(label){var r=PRICE_VALS[label];return v>=r[0]&&v<r[1];});
}
function locmatch(c){
  if(!S.mainLoc.length)return true;var lo=ct(c);
  if(S.subLoc.length)return S.subLoc.some(function(s){return lo.indexOf(s.toLowerCase())!==-1;});
  return S.mainLoc.some(function(main){
    if(lo.indexOf(main.toLowerCase())!==-1)return true;
    return(SUB_MAP[main]||[]).some(function(s){return lo.indexOf(s.toLowerCase())!==-1;});
  });
}
function matches(c){
  var lo=ct(c);
  if(S.pid&&lo.indexOf(S.pid.toLowerCase())===-1)return false;
  if(S.query&&!qmatch(c,S.query))return false;
  if(S.status.length&&!S.status.some(function(v){return lo.indexOf(v.toLowerCase())!==-1;}))return false;
  if(S.type.length&&!S.type.some(function(v){return lo.indexOf(v.toLowerCase())!==-1;}))return false;
  if(!locmatch(c))return false;
  if(!bedmatch(c))return false;
  if(!pmatch(c))return false;
  if(S.agent.length&&!S.agent.some(function(v){return lo.indexOf(v.toLowerCase())!==-1;}))return false;
  return true;
}

/* ── Find & hide Framer's Load More button ───────────── */
function findLoadMoreBtn(){
  var all=document.querySelectorAll('button');
  for(var i=0;i<all.length;i++){
    var b=all[i];
    if(b.id&&b.id.indexOf('__cw')===0)continue;
    var inOurs=false;var p=b.parentElement;
    while(p){if(p.id==='__cwf'||p.id==='__cwbot'){inOurs=true;break;}p=p.parentElement;}
    if(inOurs)continue;
    var txt=(b.textContent||'').trim().toLowerCase();
    if(txt==='load more'||txt==='load'||txt==='more'||txt==='show more'||txt==='next')return b;
  }
  return null;
}
function isActive(b){
  if(!b)return false;
  if(b.disabled||b.getAttribute('aria-disabled')==='true')return false;
  var cs=window.getComputedStyle(b);
  return cs.display!=='none'&&cs.visibility!=='hidden';
}
function hideLoadMore(b){
  if(!b)return;
  var wrap=b.parentElement;
  var target=(wrap&&wrap!==document.body&&wrap.children.length===1)?wrap:b;
  target.setAttribute('data-cw-hidden','1');
  target.style.cssText='position:absolute!important;width:1px!important;height:1px!important;overflow:hidden!important;opacity:0!important;pointer-events:none!important;clip:rect(0,0,0,0)!important;';
}
function triggerFramerLoad(cb){
  if(loading){if(cb)cb(false);return;}
  var btn=findLoadMoreBtn();
  if(!btn||!isActive(btn)){moreAvail=false;if(cb)cb(false);return;}
  loading=true;
  var before=allCards.length;
  var timer=setTimeout(function(){obs.disconnect();loading=false;moreAvail=false;if(cb)cb(false);},6000);
  var obs=new MutationObserver(function(m,o){
    var fresh=getCards();
    if(fresh.length>before){
      clearTimeout(timer);o.disconnect();allCards=fresh;loading=false;
      setTimeout(function(){
        var nb=findLoadMoreBtn();moreAvail=isActive(nb);if(nb)hideLoadMore(nb);
        if(cb)cb(true);
      },400);
    }
  });
  obs.observe(grid,{childList:true,subtree:true});
  /* Reveal briefly so Framer's React handler fires */
  var saved=btn.style.cssText;
  btn.removeAttribute('data-cw-hidden');btn.style.cssText='';
  btn.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));
  btn.setAttribute('data-cw-hidden','1');btn.style.cssText=saved;
}

/* ── Background preload all cards ────────────────────── */
function preloadAll(){
  if(!moreAvail||loading||preloading)return;
  preloading=true;
  triggerFramerLoad(function(ok){
    preloading=false;
    var bot=document.getElementById('__cwbot');
    if(bot&&moreAvail){
      var ce=bot.querySelector('span');
      if(ce)ce.textContent=allCards.length+' properties loaded… (still loading)';
    }
    if(ok&&moreAvail)setTimeout(preloadAll,300);
    else render();
  });
}

/* ── Page navigation ─────────────────────────────────── */
function goToPage(n){
  if(n<1||loading)return;
  var matched=allCards.filter(matches);
  var knownPages=Math.max(1,Math.ceil(matched.length/PER));
  if(n<=knownPages){
    curPage=n;render();
    var el=document.getElementById('__cwf')||document.body;
    window.scrollTo({top:Math.max(0,el.getBoundingClientRect().top+window.scrollY-100),behavior:'smooth'});
    return;
  }
  if(!moreAvail)return;
  var bot=document.getElementById('__cwbot');
  if(bot)bot.innerHTML='<span style="color:#6b7280;font-size:14px;font-family:\'Satoshi\',sans-serif">Loading…</span>';
  triggerFramerLoad(function(ok){if(ok)goToPage(n);else render();});
}

/* ── Core render ─────────────────────────────────────── */
function render(){
  refreshSubDropdown();
  var matched=allCards.filter(matches);
  var knownPages=Math.max(1,Math.ceil(matched.length/PER));
  if(curPage>knownPages)curPage=1;
  var s=(curPage-1)*PER,e=s+PER;
  allCards.forEach(function(c){
    var i=matched.indexOf(c);
    var hide=(i<s||i>=e);
    c.classList.toggle('cw-hide',hide);
    if(hide)c.style.setProperty('display','none','important');
    else c.style.removeProperty('display');
  });
  renderPagination(matched.length,knownPages);
}

/* ── Pagination UI ───────────────────────────────────── */
function mkPBtn(label,pg,active,disabled){
  var b=document.createElement('button');b.type='button';b.textContent=label;
  if(disabled){b.disabled=true;b.style.cssText='min-width:36px;height:36px;padding:0 8px;border-radius:8px;border:1px solid #e2e8f0;background:#f9fafb;color:#d1d5db;font-size:14px;cursor:not-allowed;margin:0 2px;font-family:"Satoshi",sans-serif;';return b;}
  b.style.cssText='min-width:36px;height:36px;padding:0 8px;border-radius:8px;border:1px solid '+(active?BRAND:'#e2e8f0')+';background:'+(active?BRAND:'#fff')+';color:'+(active?'#fff':'#374151')+';font-size:14px;cursor:pointer;margin:0 2px;font-family:"Satoshi",sans-serif;transition:all .15s;';
  if(!active){b.onmouseenter=function(){this.style.borderColor=BRAND;this.style.color=BRAND;};b.onmouseleave=function(){this.style.borderColor='#e2e8f0';this.style.color='#374151';};}
  b.onclick=function(){goToPage(pg);};return b;
}
function renderPagination(matchedCount,knownPages){
  var bot=document.getElementById('__cwbot');if(!bot)return;
  bot.innerHTML='';
  var ce=document.createElement('span');
  var txt=matchedCount+' propert'+(matchedCount===1?'y':'ies')+' found';
  if(moreAvail)txt+=' (loading more…)';
  ce.textContent=txt;
  ce.style.cssText='color:#6b7280;font-size:14px;font-family:"Satoshi",sans-serif;white-space:nowrap;';
  bot.appendChild(ce);
  var canNext=curPage<knownPages||moreAvail;
  if(knownPages<=1&&!canNext)return;
  var pag=document.createElement('div');pag.style.cssText='display:flex;align-items:center;flex-wrap:wrap;gap:4px;';
  pag.appendChild(mkPBtn('‹',curPage-1,false,curPage<=1));
  var ps=[];
  if(knownPages<=7){for(var i=1;i<=knownPages;i++)ps.push(i);}
  else if(curPage<=4)ps=[1,2,3,4,5,'…',knownPages];
  else if(curPage>=knownPages-3)ps=[1,'…',knownPages-4,knownPages-3,knownPages-2,knownPages-1,knownPages];
  else ps=[1,'…',curPage-1,curPage,curPage+1,'…',knownPages];
  ps.forEach(function(p){
    if(p==='…'){var sp=document.createElement('span');sp.textContent='…';sp.style.cssText='display:inline-flex;align-items:center;min-width:36px;height:36px;justify-content:center;color:#9ca3af;font-size:14px;';pag.appendChild(sp);}
    else pag.appendChild(mkPBtn(p,p,p===curPage,false));
  });
  pag.appendChild(mkPBtn('›',curPage+1,false,!canNext));
  bot.appendChild(pag);
}

/* ── Dropdowns ───────────────────────────────────────── */
function closeAll(){document.querySelectorAll('.__cwpanel').forEach(function(p){p.style.display='none';var b=document.getElementById(p.id.replace('_panel','_btn'));if(b){var a=b.querySelector('.__cwarr');if(a)a.style.transform='translateY(-50%)';}});}
function setLabel(btn,placeholder,vals){var a=btn.querySelector('.__cwarr');btn.firstChild.nodeValue=vals.length?(vals.length===1?vals[0]:vals.length+' selected'):placeholder;btn.style.color=vals.length?'#1a1a1a':'#9ca3af';if(a)btn.appendChild(a);}
function mkDropdown(id,placeholder,opts,stateKey,onchange){
  var wrap=document.createElement('div');wrap.style.cssText='position:relative;flex:1;min-width:140px;';
  var btn=document.createElement('button');btn.id=id+'_btn';btn.type='button';
  btn.style.cssText='width:100%;padding:10px 30px 10px 12px;border:1px solid #e2e8f0;border-radius:8px;background:#fff;font-size:14px;color:#9ca3af;cursor:pointer;font-family:"Satoshi",sans-serif;outline:none;text-align:left;position:relative;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
  btn.appendChild(document.createTextNode(placeholder));
  var arr=document.createElement('span');arr.className='__cwarr';arr.innerHTML='&#9662;';
  arr.style.cssText='position:absolute;right:10px;top:50%;transform:translateY(-50%);pointer-events:none;color:#9ca3af;font-size:11px;transition:transform .15s;';
  btn.appendChild(arr);
  var panel=document.createElement('div');panel.id=id+'_panel';panel.className='__cwpanel';
  panel.style.cssText='display:none;position:absolute;top:calc(100% + 4px);left:0;min-width:100%;max-height:220px;overflow-y:auto;background:#fff;border:1px solid #e2e8f0;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.1);z-index:9999;padding:6px 0;';
  opts.forEach(function(opt){
    var lbl=document.createElement('label');lbl.style.cssText='display:flex;align-items:center;gap:10px;padding:9px 14px;cursor:pointer;font-size:14px;color:#374151;font-family:"Satoshi",sans-serif;';
    lbl.onmouseenter=function(){this.style.background=BRAND_LIGHT;};lbl.onmouseleave=function(){this.style.background='';};
    var cb=document.createElement('input');cb.type='checkbox';cb.value=opt;
    cb.style.cssText='width:15px;height:15px;accent-color:'+BRAND+';cursor:pointer;flex-shrink:0;';
    cb.onchange=function(){var a=S[stateKey];if(this.checked){if(a.indexOf(opt)===-1)a.push(opt);}else{var idx=a.indexOf(opt);if(idx>-1)a.splice(idx,1);}setLabel(btn,placeholder,S[stateKey]);curPage=1;if(onchange)onchange();render();};
    lbl.appendChild(cb);lbl.appendChild(document.createTextNode(opt));panel.appendChild(lbl);
  });
  btn.onclick=function(e){e.stopPropagation();var open=panel.style.display!=='none';closeAll();if(!open){panel.style.display='block';arr.style.transform='translateY(-50%) rotate(180deg)';}};
  wrap.appendChild(btn);wrap.appendChild(panel);return wrap;
}
function mkSubDropdown(){
  var wrap=document.createElement('div');wrap.id='__cwsub';wrap.style.cssText='position:relative;flex:1;min-width:140px;display:none;';
  var btn=document.createElement('button');btn.id='__cwsubd_btn';btn.type='button';
  btn.style.cssText='width:100%;padding:10px 30px 10px 12px;border:1px solid '+BRAND+';border-radius:8px;background:'+BRAND_LIGHT+';font-size:14px;color:#9ca3af;cursor:pointer;font-family:"Satoshi",sans-serif;outline:none;text-align:left;position:relative;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
  btn.appendChild(document.createTextNode('Sub-neighbourhood'));
  var arr=document.createElement('span');arr.className='__cwarr';arr.innerHTML='&#9662;';
  arr.style.cssText='position:absolute;right:10px;top:50%;transform:translateY(-50%);pointer-events:none;color:'+BRAND+';font-size:11px;transition:transform .15s;';btn.appendChild(arr);
  var panel=document.createElement('div');panel.id='__cwsubd_panel';panel.className='__cwpanel';
  panel.style.cssText='display:none;position:absolute;top:calc(100% + 4px);left:0;min-width:100%;max-height:220px;overflow-y:auto;background:#fff;border:1px solid '+BRAND+';border-radius:10px;box-shadow:0 8px 24px rgba(20,33,78,.12);z-index:9999;padding:6px 0;';
  btn.onclick=function(e){e.stopPropagation();var open=panel.style.display!=='none';closeAll();if(!open){panel.style.display='block';arr.style.transform='translateY(-50%) rotate(180deg)';}};
  wrap.appendChild(btn);wrap.appendChild(panel);return wrap;
}
function refreshSubDropdown(){
  var wrap=document.getElementById('__cwsub'),panel=document.getElementById('__cwsubd_panel'),btn=document.getElementById('__cwsubd_btn');
  if(!wrap||!panel||!btn)return;
  var avail=[];S.mainLoc.forEach(function(m){(SUB_MAP[m]||[]).forEach(function(s){if(avail.indexOf(s)===-1)avail.push(s);});});
  if(!avail.length){wrap.style.display='none';S.subLoc=[];setLabel(btn,'Sub-neighbourhood',[]);return;}
  wrap.style.display='';S.subLoc=S.subLoc.filter(function(s){return avail.indexOf(s)!==-1;});setLabel(btn,'Sub-neighbourhood',S.subLoc);
  panel.innerHTML='';
  avail.forEach(function(opt){
    var lbl=document.createElement('label');lbl.style.cssText='display:flex;align-items:center;gap:10px;padding:9px 14px;cursor:pointer;font-size:14px;color:#374151;font-family:"Satoshi",sans-serif;';
    lbl.onmouseenter=function(){this.style.background=BRAND_LIGHT;};lbl.onmouseleave=function(){this.style.background='';};
    var cb=document.createElement('input');cb.type='checkbox';cb.value=opt;cb.checked=S.subLoc.indexOf(opt)!==-1;
    cb.style.cssText='width:15px;height:15px;accent-color:'+BRAND+';cursor:pointer;flex-shrink:0;';
    cb.onchange=function(){if(this.checked){if(S.subLoc.indexOf(opt)===-1)S.subLoc.push(opt);}else{var i=S.subLoc.indexOf(opt);if(i>-1)S.subLoc.splice(i,1);}setLabel(btn,'Sub-neighbourhood',S.subLoc);curPage=1;render();};
    lbl.appendChild(cb);lbl.appendChild(document.createTextNode(opt));panel.appendChild(lbl);
  });
}

/* ── Build UI ────────────────────────────────────────── */
function build(){
  if(document.getElementById('__cwf'))return;
  allCards=getCards();
  var lmBtn=findLoadMoreBtn();moreAvail=isActive(lmBtn);if(lmBtn)hideLoadMore(lmBtn);

  var con=document.createElement('div');con.id='__cwf';con.style.cssText='width:100%;margin-bottom:16px;font-family:"Satoshi",sans-serif;box-sizing:border-box;';
  var inp=document.createElement('input');inp.type='text';inp.autocomplete='off';inp.spellcheck=false;
  inp.placeholder='Search by name, location, type or property ID…';
  inp.style.cssText='width:100%;box-sizing:border-box;background:#f3f4f6;border:2px solid transparent;border-radius:10px;font-size:16px;padding:14px 16px;outline:none;color:#1a1a1a;font-family:"Satoshi",sans-serif;-webkit-appearance:none;appearance:none;display:block;margin:0 0 10px 0;';
  inp.addEventListener('focus',function(){this.style.background='#fff';this.style.borderColor=BRAND;});
  inp.addEventListener('blur',function(){this.style.background=this.value?'#fff':'#f3f4f6';this.style.borderColor=this.value?'#e2e8f0':'transparent';});
  inp.addEventListener('input',function(){S.query=this.value;curPage=1;render();});
  var row1=document.createElement('div');row1.className='cwrow';row1.style.cssText='display:flex;flex-wrap:wrap;gap:8px;margin-bottom:8px;align-items:flex-start;';
  row1.appendChild(mkDropdown('__cwst','Listing Status',STATUSES,'status'));
  row1.appendChild(mkDropdown('__cwty','Property Type',TYPES,'type'));
  row1.appendChild(mkDropdown('__cwml','Location',MAIN_LOCS,'mainLoc',function(){S.subLoc=[];curPage=1;}));
  row1.appendChild(mkSubDropdown());
  var row2=document.createElement('div');row2.className='cwrow';row2.style.cssText='display:flex;flex-wrap:wrap;gap:8px;margin-bottom:0;align-items:flex-start;';
  row2.appendChild(mkDropdown('__cwbd','Bedrooms',BEDS,'bed'));
  row2.appendChild(mkDropdown('__cwpr','Price Range',PRICES,'price'));
  row2.appendChild(mkDropdown('__cwag','Agent',AGENTS,'agent'));
  var pidW=document.createElement('div');pidW.style.cssText='flex:1;min-width:130px;';
  var pidI=document.createElement('input');pidI.type='text';pidI.placeholder='Property ID';pidI.autocomplete='off';
  pidI.style.cssText='width:100%;padding:10px 12px;border:1px solid #e2e8f0;border-radius:8px;background:#fff;font-size:14px;color:#374151;font-family:"Satoshi",sans-serif;outline:none;-webkit-appearance:none;appearance:none;';
  pidI.addEventListener('focus',function(){this.style.borderColor=BRAND;});pidI.addEventListener('blur',function(){this.style.borderColor='#e2e8f0';});
  pidI.addEventListener('input',function(){S.pid=this.value;curPage=1;render();});
  pidW.appendChild(pidI);row2.appendChild(pidW);
  var clr=document.createElement('button');clr.type='button';clr.textContent='Clear All';
  clr.style.cssText='flex:0 0 auto;padding:10px 16px;border:1px solid #e2e8f0;border-radius:8px;background:#fff;color:#6b7280;font-size:14px;cursor:pointer;font-family:"Satoshi",sans-serif;white-space:nowrap;';
  clr.onmouseenter=function(){this.style.borderColor='#ef4444';this.style.color='#ef4444';};clr.onmouseleave=function(){this.style.borderColor='#e2e8f0';this.style.color='#6b7280';};
  clr.onclick=function(){
    S={status:[],type:[],mainLoc:[],subLoc:[],bed:[],price:[],agent:[],query:'',pid:''};curPage=1;
    inp.value='';pidI.value='';inp.style.background='#f3f4f6';inp.style.borderColor='transparent';
    [['__cwst','Listing Status'],['__cwty','Property Type'],['__cwml','Location'],['__cwbd','Bedrooms'],['__cwpr','Price Range'],['__cwag','Agent']].forEach(function(pair){
      var b=document.getElementById(pair[0]+'_btn');if(!b)return;b.firstChild.nodeValue=pair[1];b.style.color='#9ca3af';
      var p=document.getElementById(pair[0]+'_panel');if(p)p.querySelectorAll('input').forEach(function(c){c.checked=false;});
    });render();
  };
  row2.appendChild(clr);
  con.appendChild(inp);con.appendChild(row1);con.appendChild(row2);
  grid.parentNode.insertBefore(con,grid);

  var bot=document.createElement('div');bot.id='__cwbot';bot.style.cssText='width:100%;display:flex;align-items:center;flex-wrap:wrap;gap:10px;margin-top:24px;font-family:"Satoshi",sans-serif;justify-content:space-between;';
  if(grid.nextSibling)grid.parentNode.insertBefore(bot,grid.nextSibling);else grid.parentNode.appendChild(bot);
  document.addEventListener('click',closeAll);

  var cardObs=new MutationObserver(function(){
    var fresh=getCards();
    if(fresh.length!==allCards.length){
      allCards=fresh;
      var nb=findLoadMoreBtn();if(nb){moreAvail=isActive(nb);hideLoadMore(nb);}
      render();
    }
  });
  cardObs.observe(grid,{childList:true,subtree:true});
  render();
  setTimeout(preloadAll,1500);
}

/* ── Boot: auto-detect grid, no hardcoded class needed ── */
function tryBuild(){
  grid=detectGrid();
  if(grid){build();return;}
  var attempts=0;
  var iv=setInterval(function(){
    attempts++;
    grid=detectGrid();
    if(grid){clearInterval(iv);build();return;}
    if(attempts>40){clearInterval(iv);} /* give up after 20s */
  },500);
}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',tryBuild):tryBuild();
})();
