
/* =========================================================================
   本机后端同步（两个版本共用）
   · 页面由后端提供（http://127.0.0.1:8765）时自动启用；双击本地 HTML（file://）时仍是离线模式
   · 第一次连接：后端没有这份档案 → 把浏览器里的数据存进去；有 → 以后端为准
   · 每次 save()：照常写本地，再在 0.6 秒内同步到后端（带版本号，多窗口不互相覆盖）
   · 其他窗口 / 浏览器 / 插件改了数据：通过实时事件推送，本页自动载入并刷新
   ========================================================================= */
const QZAPI={on:false,ws:(typeof KEY!=="undefined"?KEY:"default"),version:0,timer:null,busy:false,again:false,applying:false,
  client:Math.random().toString(36).slice(2,10),es:null,err:""};

/* 给 AI 等功能调用后端接口用的小工具（两个版本共用）；是否在线只看 QZAPI */
const QZ_API=(location.protocol==="http:"||location.protocol==="https:")?location.origin+"/api":"http://127.0.0.1:8765/api";
const QZ_BACKEND={get online(){ return QZAPI.on; }};
async function qzApi(path,opts={}){
  const res=await fetch(QZ_API+path,{...opts,headers:{"content-type":"application/json",...(opts.headers||{})}});
  if(!res.ok){ let d=""; try{ d=(await res.json()).detail||""; }catch(_){} throw new Error(d||`后端请求失败（${res.status}）`); }
  return res.status===204?null:res.json();
}

function qzApiUrl(p,extra){ return `/api/${p}?ws=${encodeURIComponent(QZAPI.ws)}${extra||""}`; }

async function qzApiInit(){
  if(!/^https?:$/.test(location.protocol)) return;
  try{
    const h=await fetch("/api/health",{cache:"no-store"}); if(!h.ok) return;
    const hj=await h.json(); if(hj.app!=="qzzt-backend") return;
  }catch(e){ return; }
  QZAPI.on=true;
  const r=await fetch(qzApiUrl("state"),{cache:"no-store"}); const j=await r.json();
  if(j.state){ QZAPI.version=j.version; qzApiApply(j.state,false); }
  else{ await qzApiPush(true); toast("已把这个浏览器里的数据存进本机后端，之后所有浏览器共用一份"); }
  qzApiSubscribe(); qzApiStatus();
}

/* 载入后端数据：写回本地 → 走一遍原来的 load()（含版本迁移）→ 刷新当前页，保持滚动位置 */
function qzApiApply(state,notify){
  QZAPI.applying=true;
  try{
    const before=JSON.stringify(state);
    try{ localStorage.setItem(KEY,before); }catch(e){}
    if(typeof load==="function") load(); else S=state;
    const cur=(document.querySelector(".view.on")||{id:"v-dash"}).id.slice(2), y=window.scrollY;
    if(typeof go==="function"){ go(cur); setTimeout(()=>window.scrollTo(0,y),0); }
    /* 载入远端数据后不自动回推：多个窗口版本不一致时会互相改写、来回推送。
       只有本机迁移确实改了数据、并且这一轮还没回推过时，才推一次。 */
    if(JSON.stringify(S)!==before&&QZAPI.pushedFor!==QZAPI.version&&(QZAPI.applies||0)<3){ QZAPI.pushedFor=QZAPI.version; qzApiSchedule(); }
    QZAPI.applies=(QZAPI.applies||0)+1; clearTimeout(QZAPI.applyTimer); QZAPI.applyTimer=setTimeout(()=>{ QZAPI.applies=0; QZAPI.warned=false; },20000);
    if(QZAPI.applies>=3&&!QZAPI.warned){ QZAPI.warned=true; QZAPI.err="多个 Offer 窗口在互相覆盖：只留一个窗口，其余关掉后刷新"; }
    if(notify) qzApiStatus();   // 静默刷新：只更新侧栏状态，不再弹提示
  }finally{ QZAPI.applying=false; }
}

function qzApiSchedule(){ if(!QZAPI.on) return; clearTimeout(QZAPI.timer); QZAPI.timer=setTimeout(()=>qzApiPush(false),600); }

async function qzApiPush(force){
  if(QZAPI.busy){ QZAPI.again=true; return; }
  QZAPI.busy=true;
  try{
    const r=await fetch(qzApiUrl("state","&client="+QZAPI.client),{method:"PUT",headers:{"content-type":"application/json"},
      body:JSON.stringify({state:S,base_version:force?null:QZAPI.version})});
    if(r.status===409){
      const s=await (await fetch(qzApiUrl("state"),{cache:"no-store"})).json();
      QZAPI.version=s.version; if(s.state) qzApiApply(s.state,false);
      QZAPI.err="另一个窗口刚改过，已载入最新版本"; qzApiStatus(); setTimeout(()=>{ if(QZAPI.err.startsWith("另一个窗口")){ QZAPI.err=""; qzApiStatus(); } },5000);
    }else if(r.ok){ QZAPI.version=(await r.json()).version; QZAPI.err=""; QZAPI.at=new Date().toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit"}); }
    else QZAPI.err="同步失败（"+r.status+"）";
  }catch(e){ QZAPI.err="连不上本机后端"; }
  finally{
    QZAPI.busy=false; qzApiStatus();
    if(QZAPI.again){ QZAPI.again=false; qzApiPush(false); }
  }
}

function qzApiSubscribe(){
  if(!window.EventSource) return;
  const es=new EventSource(qzApiUrl("events")); QZAPI.es=es;
  es.onmessage=async e=>{
    let d; try{ d=JSON.parse(e.data); }catch(_){ return; }
    if(d.type!=="state"||d.client===QZAPI.client||d.version<=QZAPI.version) return;
    const s=await (await fetch(qzApiUrl("state"),{cache:"no-store"})).json();
    if(s.version>QZAPI.version&&s.state){ QZAPI.version=s.version; clearTimeout(QZAPI.timer); qzApiApply(s.state,true); }
  };
  es.onerror=()=>{ QZAPI.err=es.readyState===2?"实时同步已断开":""; qzApiStatus(); };
  es.onopen=()=>{ QZAPI.err=""; qzApiStatus(); };
}

function qzApiStatus(){
  const nr=document.querySelector(".navright"); if(!nr||!QZAPI.on) return;
  let el=document.getElementById("qzApi");
  if(!el){ el=document.createElement("div"); el.id="qzApi"; nr.prepend(el); }
  el.className="qz-ext"+(QZAPI.err?"":" on");
  el.innerHTML=`<i></i>${QZAPI.err?esc(QZAPI.err):"本机后端 · 已同步"+(QZAPI.at?" "+QZAPI.at:"")}`;
  el.title=QZAPI.err?"":"数据保存在本机数据库，所有浏览器共用；其他窗口的修改会实时出现";
}

/* 挂到原来的 save() 上：本地照常保存，再同步后端 */
(function(){
  const orig=window.save;
  if(typeof orig!=="function"||orig.__qz) return;
  const wrapped=function(){ const r=orig.apply(this,arguments); if(QZAPI.on&&!QZAPI.applying) qzApiSchedule(); return r; };
  wrapped.__qz=true; window.save=wrapped;
})();
if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",()=>setTimeout(qzApiInit,50)); else setTimeout(qzApiInit,50);
