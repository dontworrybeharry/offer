/* Offer 助手 · 后台
   平台（Offer页面）是「大脑」：决定看哪些岗位、打分、生成简历；
   这里是「手」：在后台标签页里打开招聘网站、读岗位、打开网申并自动填写。
   任何情况下都不点「投递 / 提交」按钮，遇到登录和验证码就停下来交给你。 */


const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const jitter=(a,b)=>Math.round(a+Math.random()*(b-a));
let lastOpen=0, workerTab=null;

/* 两次打开页面之间随机间隔几秒，像人一样慢慢看，避免触发网站风控 */
async function pace(){ const need=jitter(3000,7000), gap=Date.now()-lastOpen; if(gap<need) await sleep(need-gap); lastOpen=Date.now(); }

function waitLoad(tabId,timeout=30000){
  return new Promise(resolve=>{
    let done=false; const fin=v=>{ if(done) return; done=true; chrome.tabs.onUpdated.removeListener(fn); clearTimeout(t); resolve(v); };
    const fn=(id,info)=>{ if(id===tabId&&info.status==="complete") fin(true); };
    const t=setTimeout(()=>fin(false),timeout);
    chrome.tabs.onUpdated.addListener(fn);
    chrome.tabs.get(tabId).then(tab=>{ if(tab.status==="complete") fin(true); }).catch(()=>fin(false));
  });
}
/* 在页面里调用 page-tools.js 的函数（先注入一次文件，再按名字调用） */
async function call(tabId,name,args){
  const [probe]=await chrome.scripting.executeScript({target:{tabId},func:()=>typeof qzztPageState==="function"});
  if(!probe||!probe.result) await chrome.scripting.executeScript({target:{tabId},files:["page-tools.js"]});
  const [r]=await chrome.scripting.executeScript({target:{tabId},func:(n,a)=>self[n](...(a||[])),args:[name,args||[]]});
  return r?r.result:null;
}
/* 后台读取用的标签页不可见，很多单页应用（飞书招聘、Moka 等）会因此不渲染岗位内容。
   只对这个标签页：页面一开始加载就告诉它「你是可见的」，并让动画帧照常运行。你自己的标签页不受影响。 */
function qzztVisibleShim(){
  try{
    Object.defineProperty(Document.prototype,"visibilityState",{get:()=>"visible",configurable:true});
    Object.defineProperty(Document.prototype,"hidden",{get:()=>false,configurable:true});
    window.requestAnimationFrame=cb=>setTimeout(()=>cb(performance.now()),16);
    window.cancelAnimationFrame=id=>clearTimeout(id);
  }catch(e){}
}
chrome.webNavigation.onCommitted.addListener(d=>{
  if(d.frameId!==0||d.tabId!==workerTab) return;
  chrome.scripting.executeScript({target:{tabId:d.tabId},world:"MAIN",injectImmediately:true,func:qzztVisibleShim}).catch(()=>{});
});

/* 让标签页打开新网址，并等到「新页面」加载完成（避免读到上一个页面） */
function nav(tabId,url,timeout=30000){
  return new Promise(resolve=>{
    let started=false, done=false;
    const fin=v=>{ if(done) return; done=true; chrome.tabs.onUpdated.removeListener(fn); clearTimeout(t); resolve(v); };
    const fn=(id,info)=>{ if(id!==tabId) return; if(info.status==="loading"||info.url) started=true; if(started&&info.status==="complete") fin(true); };
    const t=setTimeout(()=>fin(false),timeout);
    chrome.tabs.onUpdated.addListener(fn);
    chrome.tabs.update(tabId,{url}).catch(()=>fin(false));
    /* 只改了 # 后面的单页应用路由时不会触发加载，给它几秒渲染 */
    setTimeout(()=>{ if(!started) fin(true); },8000);
  });
}
async function worker(url){
  await pace();
  if(!workerTab){ const {workerTab:w}=await chrome.storage.session.get("workerTab"); if(w){ try{ await chrome.tabs.get(w); workerTab=w; }catch(e){} } }
  if(workerTab){ try{ await chrome.tabs.get(workerTab); await nav(workerTab,url); }catch(e){ workerTab=null; } }
  if(!workerTab){ const t=await chrome.tabs.create({url:"about:blank",active:false}); workerTab=t.id; await chrome.storage.session.set({workerTab}); await nav(workerTab,url); }
  await sleep(2200);
  return workerTab;
}

/* ---------- 命令 ---------- */
const CMD={
  async scan({url,max}){
    max=max||20;
    const tab=await worker(url);
    let st=await call(tab,"qzztPageState"); if(st.blocked) return {blocked:st.blocked,url:st.url};
    await call(tab,"qzztScroll");
    let r=await call(tab,"qzztCollectLinks");
    if(r.links.length<2&&!r.cards){ await sleep(4000); await call(tab,"qzztScroll"); r=await call(tab,"qzztCollectLinks"); }   // 列表加载慢的网站再等一会
    if(r.links.length>=2||!r.cards) return {links:r.links.slice(0,max)};
    /* 没有链接的列表：逐个点开卡片，记下跳转到的地址再返回 */
    const links=[], n=Math.min(r.cards,max);
    for(let i=0;i<n;i++){
      const before=(await chrome.tabs.get(tab)).url;
      let popup=null; const onNew=t=>{ if(t.openerTabId===tab) popup=t.id; }; chrome.tabs.onCreated.addListener(onNew);
      /* 网站用 window.open 开新窗口时，后台点击会被拦截：先在页面里接住它要打开的地址 */
      await chrome.scripting.executeScript({target:{tabId:tab},world:"MAIN",func:()=>{ delete document.documentElement.dataset.qzztOpen; if(!window.__qzztOpen){ window.__qzztOpen=true; window.open=function(u){ try{ document.documentElement.dataset.qzztOpen=new URL(u,location.href).href; }catch(e){} return null; }; } }});
      const text=await call(tab,"qzztClickCard",[i]);
      await sleep(2500); chrome.tabs.onCreated.removeListener(onNew);
      const [op]=await chrome.scripting.executeScript({target:{tabId:tab},func:()=>document.documentElement.dataset.qzztOpen||""});
      if(op&&op.result){ links.push({url:op.result,text}); continue; }
      if(popup){ await waitLoad(popup,15000); const p=await chrome.tabs.get(popup); links.push({url:p.url,text}); await chrome.tabs.remove(popup); continue; }
      const now=(await chrome.tabs.get(tab)).url;
      if(now!==before){ links.push({url:now,text}); await pace(); await nav(tab,before); await sleep(2200); await call(tab,"qzztScroll"); }
    }
    return {links};
  },
  async extract({url}){
    const tab=await worker(url);
    for(let k=0;k<10;k++){
      const st=await call(tab,"qzztPageState"); if(st.blocked) return {blocked:st.blocked,url:st.url};
      const j=await call(tab,"qzztExtractJob");
      if(j&&j.jd&&j.jd.length>=80) return j;
      await sleep(1500);
    }
    const j=await call(tab,"qzztExtractJob"); return Object.assign(j||{url},{short:true});
  },
  /* 打开网申页并自动填写；之后你在这个标签页里每进入一个新表单页都会再填一次，看到「投递成功」就通知平台 */
  async prepare({jobId,url,profile,resume}){
    await pace();
    const t=await chrome.tabs.create({url,active:false});
    const {tracked={}}=await chrome.storage.session.get("tracked");
    tracked[t.id]={jobId,profile,resume}; await chrome.storage.session.set({tracked});
    try{ const g=await chrome.tabs.group({tabIds:[t.id],...(await groupId())}); await chrome.tabGroups.update(g,{title:"Offer · 待你提交",color:"blue"}); await chrome.storage.session.set({groupId:g}); }catch(e){}
    return {tabId:t.id};
  },
  async done(){ if(workerTab){ try{ await chrome.tabs.remove(workerTab); }catch(e){} workerTab=null; } return {ok:true}; },
  async schedule({hours}){
    await chrome.alarms.clear("qzzt-autopilot");
    if(hours>0) await chrome.alarms.create("qzzt-autopilot",{periodInMinutes:hours*60,delayInMinutes:hours*60});
    return {ok:true,hours};
  },
  async focus({tabId}){ try{ const t=await chrome.tabs.update(tabId,{active:true}); await chrome.windows.update(t.windowId,{focused:true}); return {ok:true}; }catch(e){ return {ok:false}; } },
  async notify({title,message}){ chrome.notifications.create({type:"basic",iconUrl:"icon.png",title,message}); return {ok:true}; }
};
async function groupId(){ const {groupId}=await chrome.storage.session.get("groupId"); if(!groupId) return {}; try{ await chrome.tabGroups.get(groupId); return {groupId}; }catch(e){ return {}; } }

chrome.runtime.onMessage.addListener((msg,sender,reply)=>{
  if(!msg||msg.type!=="AP"||!CMD[msg.cmd]) return;
  CMD[msg.cmd](msg.args||{}).then(r=>reply({ok:true,result:r}),e=>reply({ok:false,error:String(e&&e.message||e)}));
  return true;
});

/* ---------- 把事件交给平台（平台没开时先存着，打开后自动领取） ---------- */
async function emit(ev){
  const {apEvents=[]}=await chrome.storage.local.get("apEvents");
  apEvents.push(Object.assign({id:"e"+Date.now()+Math.random().toString(36).slice(2,6),at:new Date().toISOString()},ev));
  await chrome.storage.local.set({apEvents:apEvents.slice(-200)});
}

/* 被跟踪的网申标签页：每次加载完成就检查是否投递成功，否则自动填写空着的字段 */
chrome.tabs.onUpdated.addListener(async(tabId,info)=>{
  if(info.status!=="complete") return;
  const {tracked={}}=await chrome.storage.session.get("tracked"); const tr=tracked[tabId]; if(!tr) return;
  await sleep(1800);
  try{
    const st=await call(tabId,"qzztPageState");
    if(st.success&&tr.sawForm&&!st.applyBtn){ await emit({type:"SUBMITTED",jobId:tr.jobId,url:st.url}); delete tracked[tabId]; await chrome.storage.session.set({tracked}); return; }
    if(st.blocked){ await emit({type:"NEEDS_YOU",jobId:tr.jobId,reason:st.blocked}); return; }
    if(st.hasForm){ if(!tr.sawForm){ tr.sawForm=true; tracked[tabId]=tr; await chrome.storage.session.set({tracked}); } const r=await call(tabId,"qzztFillForm",[tr.profile,tr.resume]); if(r&&r.filled.length) await emit({type:"FILLED",jobId:tr.jobId,fields:[...new Set(r.filled)],url:st.url}); }
  }catch(e){}
});
chrome.tabs.onRemoved.addListener(async tabId=>{
  const {tracked={}}=await chrome.storage.session.get("tracked");
  if(tracked[tabId]){ await emit({type:"CLOSED",jobId:tracked[tabId].jobId}); delete tracked[tabId]; await chrome.storage.session.set({tracked}); }
  if(tabId===workerTab) workerTab=null;
});

/* 定时：到点让平台跑一轮；平台没开就在后台打开它 */
chrome.alarms.onAlarm.addListener(a=>{ if(a.name==="qzzt-autopilot") tick(); });
async function tick(){
  await emit({type:"RUN"});
  const {platformUrl=""}=await chrome.storage.local.get("platformUrl");
  if(!platformUrl) return;
  const base=platformUrl.split("#")[0];
  const tabs=await chrome.tabs.query({});
  if(tabs.some(t=>(t.url||"").split("#")[0]===base)) return;
  try{ await chrome.tabs.create({url:base,active:false}); }
  catch(e){ chrome.notifications.create({type:"basic",iconUrl:"icon.png",title:"Offer",message:"到了自动刷岗的时间，打开平台就会开始。"}); }
}
