(function(){
'use strict';

/* ── Config ──────────────────────────────────────────── */
var TOKEN = 'pat8fe92oU0NQ1N96.1944a15174edc88d33823b78467bd8b573588da271dd4357ff857102ee276b67';
var BASE  = 'appui0GIVsqalToEa';
var TABLE = 'Lagos Properties';
var BASE_URL = 'https://cwlagos.com/property/';
var BRAND = '#14214E';
var BRAND_LIGHT = '#eef0f7';

/* ── Fonts ───────────────────────────────────────────── */
if(!document.getElementById('__cwfont')){
  var lnk=document.createElement('link');lnk.id='__cwfont';lnk.rel='stylesheet';
  lnk.href='https://api.fontshare.com/v2/css?f[]=satoshi@700,500,400&display=swap';
  document.head.appendChild(lnk);
}

/* ── State ───────────────────────────────────────────── */
var allRecords = [];
var loaded = false;
var searchTimeout = null;

/* ── Airtable fetch (handles pagination) ─────────────── */
function fetchPage(offset){
  var url = 'https://api.airtable.com/v0/' + BASE + '/' + encodeURIComponent(TABLE) + '?pageSize=100';
  if(offset) url += '&offset=' + encodeURIComponent(offset);
  return fetch(url, {headers:{'Authorization':'Bearer '+TOKEN}})
    .then(function(r){return r.json();})
    .then(function(data){
      allRecords = allRecords.concat(data.records||[]);
      if(data.offset) return fetchPage(data.offset);
      loaded = true;
    });
}

/* ── Field helpers ───────────────────────────────────── */
function f(rec){return rec.fields||{};}
function get(rec){
  var fields=f(rec);
  return function(){
    for(var i=0;i<arguments.length;i++){
      var v=fields[arguments[i]];
      if(v!==undefined&&v!==null&&v!=='')return v;
    }
    return '';
  };
}

function getSlug(rec){
  var g=get(rec);
  /* Try dedicated slug field first */
  var slug=g('Slug','slug','URL Slug','url_slug','CMS Slug');
  if(slug)return slug;
  /* Build from name + property ID (matches cwlagos.com URL pattern) */
  var name=g('Name','Property Name','Title','Listing Name');
  var id=g('Property ID','CW ID','ID','Ref','Reference','CWID');
  if(!name)return '';
  var s=name.toString().toLowerCase()
    .replace(/[^a-z0-9\s-]/g,'')
    .trim().replace(/\s+/g,'-');
  if(id)s=s+'-'+id.toString().toLowerCase().replace(/\s+/g,'-');
  return s;
}

function formatPrice(val){
  if(!val)return '';
  var n=parseFloat(String(val).replace(/[^0-9.]/g,''));
  if(isNaN(n))return String(val);
  return '₦'+n.toLocaleString('en-NG');
}

/* ── Search logic ────────────────────────────────────── */
var ALIASES={bed:'bedroom',beds:'bedroom',br:'bedroom',apt:'apartment',
  flat:'apartment',dup:'duplex',pent:'penthouse',
  one:'1',two:'2',three:'3',four:'4',five:'5',six:'6',
  vi:'victoria island',lekki1:'lekki phase 1',ph1:'lekki phase 1'};

function searchText(rec){
  return Object.values(f(rec)).join(' ').toLowerCase();
}

function doSearch(q){
  if(!q.trim())return[];
  var terms=q.toLowerCase().replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(Boolean);
  return allRecords.filter(function(rec){
    var txt=searchText(rec);
    return terms.every(function(t){
      var alias=ALIASES[t]||t;
      return txt.indexOf(alias)!==-1||txt.indexOf(t)!==-1;
    });
  });
}

/* ── Render result card ──────────────────────────────── */
function renderCard(rec){
  var g=get(rec);
  var name   = g('Name','Property Name','Title','Listing Name','Listing Title');
  var price  = formatPrice(g('Price','Listing Price','Amount','Sale Price','Rent Price'));
  var loc    = g('Neighbourhood','Sub-Neighbourhood','Location','Area','Sub Neighbourhood','Sub-neighborhood');
  var type   = g('Property Type','Type','Listing Type');
  var beds   = g('Bedrooms','Bedroom','No. of Bedrooms','Number of Bedrooms');
  var status = g('Status','Listing Status','For Sale/Rent');
  var slug   = getSlug(rec);
  var href   = slug ? BASE_URL+slug : '#';

  var a=document.createElement('a');
  a.href=href;
  a.style.cssText=[
    'display:flex;flex-direction:column;gap:2px;',
    'padding:12px 16px;text-decoration:none;border-bottom:1px solid #f1f5f9;',
    'transition:background .12s;cursor:pointer;'
  ].join('');
  a.onmouseenter=function(){this.style.background=BRAND_LIGHT;};
  a.onmouseleave=function(){this.style.background='';};

  /* top row: name + price */
  var top=document.createElement('div');
  top.style.cssText='display:flex;justify-content:space-between;align-items:flex-start;gap:12px;';
  var nameEl=document.createElement('span');
  nameEl.textContent=name||'Property';
  nameEl.style.cssText='font-size:14px;font-weight:600;color:#111827;font-family:"Satoshi",sans-serif;line-height:1.3;flex:1;';
  var priceEl=document.createElement('span');
  priceEl.textContent=price;
  priceEl.style.cssText='font-size:13px;font-weight:700;color:'+BRAND+';font-family:"Satoshi",sans-serif;white-space:nowrap;';
  top.appendChild(nameEl);top.appendChild(priceEl);

  /* bottom row: location · type · beds · status */
  var meta=[];
  if(loc)meta.push(loc);
  if(type)meta.push(type);
  if(beds)meta.push(beds+' Bed'+(beds>1?'s':''));
  if(status)meta.push(status);
  var bot=document.createElement('div');
  bot.textContent=meta.join(' · ');
  bot.style.cssText='font-size:12px;color:#6b7280;font-family:"Satoshi",sans-serif;';

  a.appendChild(top);a.appendChild(bot);
  return a;
}

/* ── Render results panel ────────────────────────────── */
function renderResults(q, panel, counter){
  panel.innerHTML='';
  if(!q.trim()){panel.style.display='none';counter.textContent='';return;}

  if(!loaded){
    panel.style.display='block';
    var msg=document.createElement('div');
    msg.textContent='Loading properties… please try again in a moment.';
    msg.style.cssText='padding:16px;color:#6b7280;font-size:14px;font-family:"Satoshi",sans-serif;';
    panel.appendChild(msg);
    return;
  }

  var results=doSearch(q);
  counter.textContent=results.length+' propert'+(results.length===1?'y':'ies')+' found';

  if(!results.length){
    panel.style.display='block';
    var none=document.createElement('div');
    none.textContent='No properties match "'+q+'"';
    none.style.cssText='padding:16px;color:#6b7280;font-size:14px;font-family:"Satoshi",sans-serif;';
    panel.appendChild(none);
    return;
  }

  panel.style.display='block';
  var showing=Math.min(results.length,30);
  for(var i=0;i<showing;i++)panel.appendChild(renderCard(results[i]));

  if(results.length>30){
    var more=document.createElement('div');
    more.textContent='Showing 30 of '+results.length+' results — refine your search to narrow down.';
    more.style.cssText='padding:12px 16px;color:#9ca3af;font-size:12px;font-family:"Satoshi",sans-serif;border-top:1px solid #f1f5f9;';
    panel.appendChild(more);
  }
}

/* ── Build UI ────────────────────────────────────────── */
function build(){
  if(document.getElementById('__cwsearch'))return;

  /* Find the property grid — try several approaches */
  function isCard(el){return(el.textContent||'').indexOf('₦')!==-1;}
  var grid=null;
  var cards=document.querySelectorAll('.framer-12de3j-container');
  if(cards.length>=1){grid=cards[0].parentElement;}
  if(!grid){
    var best=null,bestScore=0;
    Array.from(document.querySelectorAll('div')).forEach(function(d){
      if(d.id==='__cwsearch')return;
      var score=Array.from(d.children).filter(isCard).length;
      if(score>bestScore){bestScore=score;best=d;}
    });
    if(bestScore>=1)grid=best;
  }
  if(!grid)return;

  /* Wrapper */
  var wrap=document.createElement('div');
  wrap.id='__cwsearch';
  wrap.style.cssText='width:100%;font-family:"Satoshi",sans-serif;box-sizing:border-box;margin-bottom:16px;position:relative;';

  /* Search input */
  var inp=document.createElement('input');
  inp.type='text';inp.autocomplete='off';inp.spellcheck=false;
  inp.placeholder='Search all properties — location, type, bedrooms, price…';
  inp.style.cssText=[
    'width:100%;box-sizing:border-box;',
    'background:#f3f4f6;border:2px solid transparent;border-radius:10px;',
    'font-size:16px;padding:14px 48px 14px 16px;outline:none;',
    'color:#1a1a1a;font-family:"Satoshi",sans-serif;',
    '-webkit-appearance:none;appearance:none;display:block;'
  ].join('');
  inp.addEventListener('focus',function(){this.style.background='#fff';this.style.borderColor=BRAND;});
  inp.addEventListener('blur',function(){
    this.style.background=this.value?'#fff':'#f3f4f6';
    this.style.borderColor=this.value?'#e2e8f0':'transparent';
  });

  /* Clear button */
  var clr=document.createElement('button');
  clr.type='button';clr.innerHTML='&#x2715;';
  clr.style.cssText='position:absolute;right:14px;top:14px;background:none;border:none;cursor:pointer;color:#9ca3af;font-size:16px;line-height:1;padding:2px;display:none;';
  clr.onclick=function(){
    inp.value='';clr.style.display='none';
    panel.style.display='none';counter.textContent='';inp.focus();
  };

  /* Counter */
  var counter=document.createElement('div');
  counter.style.cssText='font-size:13px;color:#6b7280;font-family:"Satoshi",sans-serif;min-height:18px;margin:6px 0 4px 2px;';

  /* Results panel */
  var panel=document.createElement('div');
  panel.style.cssText=[
    'display:none;position:absolute;top:calc(100% + 4px);left:0;right:0;',
    'background:#fff;border:1px solid #e2e8f0;border-radius:12px;',
    'box-shadow:0 8px 32px rgba(0,0,0,.12);z-index:99999;',
    'max-height:480px;overflow-y:auto;'
  ].join('');

  inp.addEventListener('input',function(){
    clr.style.display=this.value?'block':'none';
    clearTimeout(searchTimeout);
    var q=this.value;
    searchTimeout=setTimeout(function(){renderResults(q,panel,counter);},180);
  });

  /* Close panel on outside click */
  document.addEventListener('click',function(e){
    if(!wrap.contains(e.target)){panel.style.display='none';}
  });
  inp.addEventListener('focus',function(){
    if(this.value.trim())renderResults(this.value,panel,counter);
  });

  wrap.appendChild(inp);wrap.appendChild(clr);wrap.appendChild(counter);wrap.appendChild(panel);
  grid.parentNode.insertBefore(wrap,grid);

  /* Start fetching all Airtable records immediately */
  fetchPage(null).catch(function(err){
    console.error('CW Search: Airtable error',err);
    loaded=true;
  });
}

/* ── Boot ────────────────────────────────────────────── */
function tryBuild(){
  /* Try immediately, retry every 400ms until grid appears */
  build();
  if(!document.getElementById('__cwsearch')){
    var iv=setInterval(function(){
      build();
      if(document.getElementById('__cwsearch'))clearInterval(iv);
    },400);
    setTimeout(function(){clearInterval(iv);},10000);
  }
}
document.readyState==='loading'
  ?document.addEventListener('DOMContentLoaded',tryBuild)
  :tryBuild();
})();
