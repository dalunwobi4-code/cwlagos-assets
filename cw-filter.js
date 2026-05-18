(function(){
'use strict';

/* ── Config ──────────────────────────────────────────── */
var TOKEN = 'pat8fe92oU0NQ1N96.1944a15174edc88d33823b78467bd8b573588da271dd4357ff857102ee276b67';
var BASE  = 'appui0GIVsqalToEa';
var TABLE = 'Lagos Properties';
var BASE_URL = 'https://cwlagos.com/property/';
var BRAND = '#14214E';

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
var framerGrid = null;
var resultsEl = null;
var counterEl = null;
var activeInp = null;

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
  var slug=g('Slug','slug','URL Slug','url_slug','CMS Slug');
  if(slug)return slug;
  var name=g('Name','Property Name','Title','Listing Name');
  var id=g('Property ID','CW ID','ID','Ref','Reference','CWID');
  if(!name)return '';
  var s=name.toString().toLowerCase()
    .replace(/[^a-z0-9\s-]/g,'').trim().replace(/\s+/g,'-');
  if(id)s=s+'-'+id.toString().toLowerCase().replace(/\s+/g,'-');
  return s;
}

function formatPrice(val){
  if(!val)return '';
  var n=parseFloat(String(val).replace(/[^0-9.]/g,''));
  if(isNaN(n))return String(val);
  return '₦'+n.toLocaleString('en-NG');
}

function getImage(rec){
  var fields=f(rec);
  var keys=['Images','Photos','Image','Photo','Pictures','Thumbnail',
            'Cover','Cover Image','Main Image','Featured Image','Gallery'];
  for(var i=0;i<keys.length;i++){
    var v=fields[keys[i]];
    if(v&&Array.isArray(v)&&v.length){
      var att=v[0];
      if(att.thumbnails&&att.thumbnails.large) return att.thumbnails.large.url;
      if(att.url) return att.url;
    }
  }
  return '';
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

/* ── Render property card ────────────────────────────── */
function renderCard(rec){
  var g=get(rec);
  var name   = g('Name','Property Name','Title','Listing Name','Listing Title');
  var price  = formatPrice(g('Price','Listing Price','Amount','Sale Price','Rent Price'));
  var loc    = g('Neighbourhood','Sub-Neighbourhood','Location','Area','Sub Neighbourhood','Sub-neighborhood');
  var type   = g('Property Type','Type','Listing Type');
  var beds   = g('Bedrooms','Bedroom','No. of Bedrooms','Number of Bedrooms');
  var status = g('Status','Listing Status','For Sale/Rent');
  var img    = getImage(rec);
  var slug   = getSlug(rec);
  var href   = slug ? BASE_URL+slug : '#';

  var card=document.createElement('a');
  card.href=href;
  card.style.cssText='display:flex;flex-direction:column;text-decoration:none;border-radius:16px;overflow:hidden;background:#fff;box-shadow:0 2px 12px rgba(0,0,0,.08);transition:transform .15s,box-shadow .15s;';
  card.onmouseenter=function(){this.style.transform='translateY(-3px)';this.style.boxShadow='0 10px 28px rgba(0,0,0,.13)';};
  card.onmouseleave=function(){this.style.transform='';this.style.boxShadow='0 2px 12px rgba(0,0,0,.08)';};

  /* Image area */
  var imgWrap=document.createElement('div');
  imgWrap.style.cssText='position:relative;width:100%;height:200px;overflow:hidden;background:#f1f5f9;flex-shrink:0;';

  if(img){
    var imgEl=document.createElement('img');
    imgEl.src=img;
    imgEl.alt=name||'Property';
    imgEl.loading='lazy';
    imgEl.style.cssText='width:100%;height:100%;object-fit:cover;display:block;';
    imgWrap.appendChild(imgEl);
  } else {
    var ph=document.createElement('div');
    ph.style.cssText='width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#9ca3af;font-size:13px;font-family:"Satoshi",sans-serif;';
    ph.textContent='No image';
    imgWrap.appendChild(ph);
  }

  /* Status + type badge tags */
  if(status||type){
    var tags=document.createElement('div');
    tags.style.cssText='position:absolute;top:10px;left:10px;display:flex;gap:6px;flex-wrap:wrap;';
    if(status){
      var st=document.createElement('span');
      st.textContent=status;
      var isRent=status.toLowerCase().indexOf('rent')!==-1;
      st.style.cssText='font-size:11px;font-weight:600;padding:4px 9px;border-radius:20px;font-family:"Satoshi",sans-serif;'
        +'background:'+(isRent?'#f59e0b':'#10b981')+';color:#fff;';
      tags.appendChild(st);
    }
    if(type){
      var ty=document.createElement('span');
      ty.textContent=type;
      ty.style.cssText='font-size:11px;font-weight:600;padding:4px 9px;border-radius:20px;font-family:"Satoshi",sans-serif;background:'+BRAND+';color:#fff;';
      tags.appendChild(ty);
    }
    imgWrap.appendChild(tags);
  }
  card.appendChild(imgWrap);

  /* Text content */
  var content=document.createElement('div');
  content.style.cssText='padding:14px 16px 16px;display:flex;flex-direction:column;gap:5px;flex:1;';

  if(price){
    var priceEl=document.createElement('div');
    priceEl.textContent=price;
    priceEl.style.cssText='font-size:15px;font-weight:700;color:'+BRAND+';font-family:"Satoshi",sans-serif;';
    content.appendChild(priceEl);
  }

  var nameEl=document.createElement('div');
  nameEl.textContent=name||'Property';
  nameEl.style.cssText='font-size:14px;font-weight:600;color:#111827;font-family:"Satoshi",sans-serif;line-height:1.35;';
  content.appendChild(nameEl);

  var metaParts=[];
  if(loc)metaParts.push(loc);
  if(beds)metaParts.push(beds+' Bed'+(beds>1?'s':''));
  if(metaParts.length){
    var metaEl=document.createElement('div');
    metaEl.textContent=metaParts.join(' · ');
    metaEl.style.cssText='font-size:12px;color:#6b7280;font-family:"Satoshi",sans-serif;';
    content.appendChild(metaEl);
  }

  card.appendChild(content);
  return card;
}

/* ── Show/hide results in page ───────────────────────── */
function showResults(q){
  resultsEl.innerHTML='';

  if(!q.trim()){
    /* No query — restore Framer grid */
    if(framerGrid) framerGrid.style.display='';
    resultsEl.style.display='none';
    counterEl.textContent='';
    return;
  }

  /* Still fetching Airtable data */
  if(!loaded){
    if(framerGrid) framerGrid.style.display='none';
    resultsEl.style.display='block';
    counterEl.textContent='Loading all properties…';
    var msg=document.createElement('div');
    msg.textContent='Fetching all properties from database, please wait…';
    msg.style.cssText='padding:40px;text-align:center;color:#6b7280;font-size:15px;font-family:"Satoshi",sans-serif;';
    resultsEl.appendChild(msg);
    return;
  }

  var results=doSearch(q);

  /* Hide Framer grid, show ours */
  if(framerGrid) framerGrid.style.display='none';
  resultsEl.style.display='grid';

  counterEl.textContent=results.length+' propert'+(results.length===1?'y':'ies')+' found';

  if(!results.length){
    var none=document.createElement('div');
    none.textContent='No properties match "'+q+'" — try a different location, type, or bedroom count.';
    none.style.cssText='padding:40px;color:#6b7280;font-size:15px;font-family:"Satoshi",sans-serif;grid-column:1/-1;text-align:center;';
    resultsEl.appendChild(none);
    return;
  }

  /* Render first 9 results */
  var showing=Math.min(results.length,9);
  for(var i=0;i<showing;i++) resultsEl.appendChild(renderCard(results[i]));

  /* Load more button if >9 */
  if(results.length>9){
    var moreWrap=document.createElement('div');
    moreWrap.style.cssText='grid-column:1/-1;text-align:center;padding:8px 0 4px;';
    var btn=document.createElement('button');
    btn.textContent='Load more ('+results.length+' total)';
    btn.style.cssText='padding:11px 28px;background:'+BRAND+';color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px;font-family:"Satoshi",sans-serif;font-weight:600;';
    (function(res){
      btn.onclick=function(){
        resultsEl.innerHTML='';
        for(var j=0;j<res.length;j++) resultsEl.appendChild(renderCard(res[j]));
      };
    })(results);
    moreWrap.appendChild(btn);
    resultsEl.appendChild(moreWrap);
  }
}

/* ── Build UI ────────────────────────────────────────── */
function build(){
  if(document.getElementById('__cwsearch'))return;

  /* Find the Framer property grid */
  function isCard(el){return(el.textContent||'').indexOf('₦')!==-1;}
  var grid=null;
  var cards=document.querySelectorAll('.framer-12de3j-container');
  if(cards.length>=1){grid=cards[0].parentElement;}
  if(!grid){
    var best=null,bestScore=0;
    Array.from(document.querySelectorAll('div')).forEach(function(d){
      if(d.id==='__cwsearch'||d.id==='__cwresults')return;
      var score=Array.from(d.children).filter(isCard).length;
      if(score>bestScore){bestScore=score;best=d;}
    });
    if(bestScore>=1)grid=best;
  }
  if(!grid)return;

  framerGrid=grid;

  /* Wrapper for search bar */
  var wrap=document.createElement('div');
  wrap.id='__cwsearch';
  wrap.style.cssText='width:100%;font-family:"Satoshi",sans-serif;box-sizing:border-box;margin-bottom:12px;position:relative;';

  /* Input */
  var inp=document.createElement('input');
  activeInp=inp;
  inp.type='text';inp.autocomplete='off';inp.spellcheck=false;
  inp.placeholder='Search all properties — location, type, bedrooms…';
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

  /* Clear (×) button */
  var clr=document.createElement('button');
  clr.type='button';clr.innerHTML='&#x2715;';
  clr.style.cssText='position:absolute;right:14px;top:14px;background:none;border:none;cursor:pointer;color:#9ca3af;font-size:16px;line-height:1;padding:2px;display:none;';
  clr.onclick=function(){
    inp.value='';clr.style.display='none';
    showResults('');inp.focus();
  };

  /* Counter */
  counterEl=document.createElement('div');
  counterEl.style.cssText='font-size:13px;color:#6b7280;font-family:"Satoshi",sans-serif;min-height:18px;margin:6px 0 4px 2px;';

  inp.addEventListener('input',function(){
    clr.style.display=this.value?'block':'none';
    clearTimeout(searchTimeout);
    var q=this.value;
    searchTimeout=setTimeout(function(){showResults(q);},200);
  });

  wrap.appendChild(inp);
  wrap.appendChild(clr);
  wrap.appendChild(counterEl);
  grid.parentNode.insertBefore(wrap,grid);

  /* Results grid container — sits in place of Framer grid */
  resultsEl=document.createElement('div');
  resultsEl.id='__cwresults';
  resultsEl.style.cssText=[
    'display:none;',
    'grid-template-columns:repeat(auto-fill,minmax(270px,1fr));',
    'gap:24px;width:100%;margin-bottom:32px;'
  ].join('');
  grid.parentNode.insertBefore(resultsEl,grid);

  /* Fetch all records; re-run search if user already typed */
  fetchPage(null).then(function(){
    if(activeInp&&activeInp.value.trim()) showResults(activeInp.value);
  }).catch(function(err){
    console.error('CW Search: Airtable error',err);
    loaded=true;
  });
}

/* ── Boot ────────────────────────────────────────────── */
function tryBuild(){
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
