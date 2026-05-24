(function(){
'use strict';

/* ── Config ──────────────────────────────────────────── */
var BRAND = '#14214E';

/* ── Fonts ───────────────────────────────────────────── */
if(!document.getElementById('__cwfont')){
  var lnk=document.createElement('link');lnk.id='__cwfont';lnk.rel='stylesheet';
  lnk.href='https://api.fontshare.com/v2/css?f[]=satoshi@700,500,400&display=swap';
  document.head.appendChild(lnk);
}

/* ── State ───────────────────────────────────────────── */
var allCards   = [];
var grid       = null;
var overlay    = null;
var modal      = null;
var counterEl  = null;

var activeFilters = {status:null,type:null,agent:null,propertyId:'',bedrooms:null,priceRange:null};
var tempFilters   = {status:null,type:null,agent:null,propertyId:'',bedrooms:null,priceRange:null};

/* ── Price ranges ────────────────────────────────────── */
var PRICE_RANGES=[
  {label:'Below ₦10M',   min:0,         max:10000000},
  {label:'₦10M–₦50M',   min:10000000,  max:50000000},
  {label:'₦50M–₦100M',  min:50000000,  max:100000000},
  {label:'₦100M–₦250M', min:100000000, max:250000000},
  {label:'₦250M–₦500M', min:250000000, max:500000000},
  {label:'Above ₦500M',  min:500000000, max:Infinity}
];

/* ── Known property types (scraped from card text) ───── */
var KNOWN_TYPES=[
  'Apartment','Duplex','Detached House','Semi-Detached House','Semi-Detached',
  'Penthouse','Bungalow','Terraced House','Terraced','Commercial','Office Space',
  'Office','Land','Short Let','Shortlet','Studio','Townhouse','Mansion',
  'Villa','Flat','Shop','Warehouse','Event Centre'
];

/* ── Helpers ─────────────────────────────────────────── */
function cardText(c){return(c.textContent||'').toLowerCase();}

function parseCardPrice(c){
  var txt=c.textContent||'';
  var m=txt.match(/₦([\d,]+)/);
  if(!m)return null;
  var n=parseFloat(m[1].replace(/,/g,''));
  return isNaN(n)?null:n;
}

function cardBeds(c){
  var txt=cardText(c);
  var m=txt.match(/(\d+)\s*bed/);
  return m?parseInt(m[1]):null;
}

function getUniqueTypes(){
  var found=[];
  KNOWN_TYPES.forEach(function(t){
    var tl=t.toLowerCase();
    var inAny=allCards.some(function(c){return cardText(c).indexOf(tl)!==-1;});
    if(inAny&&found.indexOf(t)===-1)found.push(t);
  });
  return found.sort();
}

/* ── Apply filters to DOM cards ──────────────────────── */
function applyFilters(){
  var f=activeFilters;
  var hasAny=f.status||f.type||f.agent||f.propertyId||f.bedrooms||f.priceRange;
  var visCount=0;

  allCards.forEach(function(card){
    if(!hasAny){card.style.display='';visCount++;return;}
    var txt=cardText(card);
    var show=true;

    if(show&&f.status)   show=txt.indexOf(f.status.toLowerCase())!==-1;
    if(show&&f.type)     show=txt.indexOf(f.type.toLowerCase())!==-1;
    if(show&&f.propertyId) show=txt.indexOf(f.propertyId.toLowerCase())!==-1;

    if(show&&f.bedrooms){
      var b=cardBeds(card);
      if(b===null){show=false;}
      else if(f.bedrooms==='1-2') show=b>=1&&b<=2;
      else if(f.bedrooms==='3-5') show=b>=3&&b<=5;
      else if(f.bedrooms==='6-10')show=b>=6&&b<=10;
      else if(f.bedrooms==='11+') show=b>=11;
    }

    if(show&&f.priceRange){
      var p=parseCardPrice(card);
      if(p===null)show=false;
      else show=p>=f.priceRange.min&&p<f.priceRange.max;
    }

    card.style.display=show?'':' none';
    if(show)visCount++;
  });

  if(counterEl){
    var active=activeFilters.status||activeFilters.type||activeFilters.propertyId||activeFilters.bedrooms||activeFilters.priceRange;
    counterEl.textContent=active?(visCount+' propert'+(visCount===1?'y':'ies')+' found'):'';
  }
}

/* ── Modal helpers ───────────────────────────────────── */
function pill(label,isActive,onClick){
  var b=document.createElement('button');
  b.type='button';b.textContent=label;
  b.style.cssText=[
    'padding:8px 18px;border-radius:50px;font-size:14px;cursor:pointer;',
    'font-family:"Satoshi",sans-serif;font-weight:500;transition:all .12s;',
    'border:1.5px solid '+(isActive?BRAND:'#e5e7eb')+';',
    'background:'+(isActive?BRAND:'#fff')+';',
    'color:'+(isActive?'#fff':'#374151')+';'
  ].join('');
  b.onclick=onClick;
  return b;
}

function sectionLabel(txt){
  var d=document.createElement('div');
  d.textContent=txt;
  d.style.cssText='font-size:11px;font-weight:700;letter-spacing:.09em;color:#9ca3af;font-family:"Satoshi",sans-serif;margin-bottom:12px;';
  return d;
}

function sep(){
  var d=document.createElement('div');
  d.style.cssText='border-top:1px solid #f1f5f9;margin:20px 0;';
  return d;
}

function styledSelect(placeholder,options,current,onChange){
  var wrap=document.createElement('div');
  wrap.style.cssText='position:relative;';
  var sel=document.createElement('select');
  sel.style.cssText=[
    'width:100%;box-sizing:border-box;padding:12px 40px 12px 16px;',
    'border:1.5px solid #e5e7eb;border-radius:10px;font-size:14px;',
    'font-family:"Satoshi",sans-serif;color:#374151;background:#fff;',
    'appearance:none;-webkit-appearance:none;cursor:pointer;outline:none;'
  ].join('');
  var def=document.createElement('option');
  def.value='';def.textContent=placeholder;
  sel.appendChild(def);
  options.forEach(function(o){
    var opt=document.createElement('option');
    opt.value=o;opt.textContent=o;
    if(current===o)opt.selected=true;
    sel.appendChild(opt);
  });
  sel.onchange=function(){onChange(this.value||null);};
  var arrow=document.createElement('div');
  arrow.innerHTML='<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 4l4 4 4-4" stroke="#9ca3af" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  arrow.style.cssText='position:absolute;right:14px;top:50%;transform:translateY(-50%);pointer-events:none;';
  wrap.appendChild(sel);wrap.appendChild(arrow);
  return wrap;
}

/* ── Render modal body ───────────────────────────────── */
function renderModalBody(){
  var body=modal.querySelector('#__cwmbody');
  body.innerHTML='';

  /* Listing Status */
  body.appendChild(sectionLabel('LISTING STATUS'));
  var sRow=document.createElement('div');sRow.style.cssText='display:flex;gap:8px;flex-wrap:wrap;';
  ['For Sale','For Rent','Land'].forEach(function(s){
    sRow.appendChild(pill(s,tempFilters.status===s,function(){
      tempFilters.status=tempFilters.status===s?null:s;
      renderModalBody();
    }));
  });
  body.appendChild(sRow);
  body.appendChild(sep());

  /* Property Type */
  body.appendChild(sectionLabel('PROPERTY TYPE'));
  body.appendChild(styledSelect('Select property types',getUniqueTypes(),tempFilters.type,function(v){tempFilters.type=v;}));
  body.appendChild(sep());

  /* Property ID */
  body.appendChild(sectionLabel('PROPERTY ID'));
  var idWrap=document.createElement('div');idWrap.style.cssText='position:relative;';
  var searchIco=document.createElement('div');
  searchIco.innerHTML='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2.2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>';
  searchIco.style.cssText='position:absolute;left:14px;top:50%;transform:translateY(-50%);pointer-events:none;';
  var idInp=document.createElement('input');
  idInp.type='text';idInp.placeholder='e.g. CW08501';idInp.value=tempFilters.propertyId||'';
  idInp.style.cssText=[
    'width:100%;box-sizing:border-box;padding:12px 16px 12px 42px;',
    'border:1.5px solid #e5e7eb;border-radius:10px;font-size:14px;',
    'font-family:"Satoshi",sans-serif;color:#374151;outline:none;'
  ].join('');
  idInp.oninput=function(){tempFilters.propertyId=this.value.trim();};
  idWrap.appendChild(searchIco);idWrap.appendChild(idInp);
  body.appendChild(idWrap);
  body.appendChild(sep());

  /* Bedrooms */
  body.appendChild(sectionLabel('BEDROOMS'));
  var bRow=document.createElement('div');bRow.style.cssText='display:flex;gap:8px;flex-wrap:wrap;';
  [['1–2 Beds','1-2'],['3–5 Beds','3-5'],['6–10 Beds','6-10'],['11+ Beds','11+']].forEach(function(pair){
    bRow.appendChild(pill(pair[0],tempFilters.bedrooms===pair[1],function(){
      tempFilters.bedrooms=tempFilters.bedrooms===pair[1]?null:pair[1];
      renderModalBody();
    }));
  });
  body.appendChild(bRow);
  body.appendChild(sep());

  /* Price Range */
  body.appendChild(sectionLabel('PRICE RANGE'));
  var pGrid=document.createElement('div');pGrid.style.cssText='display:flex;gap:8px;flex-wrap:wrap;';
  PRICE_RANGES.forEach(function(range){
    var isActive=tempFilters.priceRange&&tempFilters.priceRange.min===range.min;
    (function(r,a){
      pGrid.appendChild(pill(r.label,a,function(){
        tempFilters.priceRange=a?null:{min:r.min,max:r.max};
        renderModalBody();
      }));
    })(range,isActive);
  });
  body.appendChild(pGrid);
}

/* ── Open / close modal ──────────────────────────────── */
function openModal(){
  tempFilters=JSON.parse(JSON.stringify(activeFilters));
  overlay.style.display='flex';
  document.body.style.overflow='hidden';
  renderModalBody();
}

function closeModal(){
  overlay.style.display='none';
  document.body.style.overflow='';
}

/* ── Build UI ────────────────────────────────────────── */
function build(){
  if(document.getElementById('__cwfilterbar'))return;

  /* Find property grid */
  function hasPrice(el){return(el.textContent||'').indexOf('₦')!==-1;}
  var g=null;
  var cc=document.querySelectorAll('.framer-12de3j-container');
  if(cc.length>=1)g=cc[0].parentElement;
  if(!g){
    var best=null,bestScore=0;
    Array.from(document.querySelectorAll('div')).forEach(function(d){
      if(d.id==='__cwfilterbar')return;
      var score=Array.from(d.children).filter(hasPrice).length;
      if(score>bestScore){bestScore=score;best=d;}
    });
    if(bestScore>=1)g=best;
  }
  if(!g)return;

  grid=g;
  allCards=Array.from(grid.children);

  /* ── Filter bar ── */
  var bar=document.createElement('div');
  bar.id='__cwfilterbar';
  bar.style.cssText='display:flex;align-items:center;gap:12px;margin-bottom:20px;font-family:"Satoshi",sans-serif;';

  var filterBtn=document.createElement('button');
  filterBtn.type='button';
  filterBtn.innerHTML=[
    '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" ',
    'style="vertical-align:middle;margin-right:7px">',
    '<line x1="4" y1="6" x2="20" y2="6"/>',
    '<line x1="8" y1="12" x2="16" y2="12"/>',
    '<line x1="11" y1="18" x2="13" y2="18"/>',
    '</svg>Filters'
  ].join('');
  filterBtn.style.cssText=[
    'display:inline-flex;align-items:center;padding:10px 22px;',
    'background:'+BRAND+';color:#fff;border:none;border-radius:8px;',
    'font-size:14px;font-weight:600;font-family:"Satoshi",sans-serif;cursor:pointer;'
  ].join('');
  filterBtn.onclick=openModal;

  counterEl=document.createElement('div');
  counterEl.style.cssText='font-size:13px;color:#6b7280;font-family:"Satoshi",sans-serif;';

  bar.appendChild(filterBtn);
  bar.appendChild(counterEl);
  grid.parentNode.insertBefore(bar,grid);

  /* ── Modal overlay ── */
  overlay=document.createElement('div');
  overlay.style.cssText=[
    'display:none;position:fixed;inset:0;z-index:99999;',
    'background:rgba(0,0,0,.5);',
    'align-items:center;justify-content:center;padding:20px;'
  ].join('');
  overlay.onclick=function(e){if(e.target===overlay)closeModal();};
  document.body.appendChild(overlay);

  /* ── Modal card ── */
  modal=document.createElement('div');
  modal.style.cssText=[
    'background:#fff;border-radius:20px;width:100%;max-width:520px;',
    'max-height:88vh;display:flex;flex-direction:column;',
    'box-shadow:0 24px 64px rgba(0,0,0,.22);overflow:hidden;'
  ].join('');
  overlay.appendChild(modal);

  /* Modal header */
  var mhead=document.createElement('div');
  mhead.style.cssText='display:flex;align-items:center;justify-content:space-between;padding:22px 24px 18px;border-bottom:1px solid #f1f5f9;flex-shrink:0;';
  var mtitle=document.createElement('span');
  mtitle.textContent='Filters';
  mtitle.style.cssText='font-size:19px;font-weight:700;color:#111827;font-family:"Satoshi",sans-serif;';
  var mclose=document.createElement('button');
  mclose.type='button';mclose.innerHTML='&#x2715;';
  mclose.style.cssText='width:32px;height:32px;border-radius:50%;background:#f3f4f6;border:none;cursor:pointer;font-size:15px;color:#6b7280;display:flex;align-items:center;justify-content:center;';
  mclose.onclick=closeModal;
  mhead.appendChild(mtitle);mhead.appendChild(mclose);
  modal.appendChild(mhead);

  /* Modal body */
  var mbody=document.createElement('div');
  mbody.id='__cwmbody';
  mbody.style.cssText='padding:22px 24px 8px;overflow-y:auto;flex:1;';
  modal.appendChild(mbody);

  /* Modal footer */
  var mfoot=document.createElement('div');
  mfoot.style.cssText='display:flex;align-items:center;justify-content:space-between;padding:16px 24px;border-top:1px solid #f1f5f9;flex-shrink:0;';

  var clearBtn=document.createElement('button');
  clearBtn.type='button';clearBtn.textContent='Clear All';
  clearBtn.style.cssText='background:none;border:none;font-size:14px;color:#6b7280;cursor:pointer;font-family:"Satoshi",sans-serif;text-decoration:underline;padding:8px;';
  clearBtn.onclick=function(){
    tempFilters={status:null,type:null,agent:null,propertyId:'',bedrooms:null,priceRange:null};
    renderModalBody();
  };

  var applyBtn=document.createElement('button');
  applyBtn.type='button';applyBtn.textContent='Apply Filters';
  applyBtn.style.cssText='padding:12px 36px;background:'+BRAND+';color:#fff;border:none;border-radius:10px;font-size:15px;font-weight:600;font-family:"Satoshi",sans-serif;cursor:pointer;';
  applyBtn.onclick=function(){
    activeFilters=JSON.parse(JSON.stringify(tempFilters));
    applyFilters();
    closeModal();
  };

  mfoot.appendChild(clearBtn);mfoot.appendChild(applyBtn);
  modal.appendChild(mfoot);
}

/* ── Boot ────────────────────────────────────────────── */
function tryBuild(){
  build();
  if(!document.getElementById('__cwfilterbar')){
    var iv=setInterval(function(){
      build();
      if(document.getElementById('__cwfilterbar'))clearInterval(iv);
    },400);
    setTimeout(function(){clearInterval(iv);},10000);
  }
}
document.readyState==='loading'
  ?document.addEventListener('DOMContentLoaded',tryBuild)
  :tryBuild();
})();
