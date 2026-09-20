
/* =========================================================================
   界面层：侧边导航、顶栏、⌘K 命令面板、概览页「今日」工作台（两个版本共用）
   ========================================================================= */
const QZ_ICON={
  dash:'<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
  auto:'<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  agent:'<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1.1-4.4A8 8 0 1 1 21 12z"/><path d="M8.5 12h.01M12 12h.01M15.5 12h.01"/>',
  radar:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><path d="m12 12 6-6"/>',
  apps:'<rect x="3" y="4" width="5" height="16" rx="1.5"/><rect x="10" y="4" width="5" height="11" rx="1.5"/><rect x="17" y="4" width="4" height="7" rx="1.5"/>',
  resume:'<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
  abroad:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  star:'<path d="M6 3h12v18l-6-4-6 4z"/>',
  reviews:'<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 3h6v3H9zM9 13l2 2 4-4"/>',
  bank:'<path d="M4 5a2 2 0 0 1 2-2h13v15H6a2 2 0 0 0-2 2z"/><path d="M4 20a2 2 0 0 0 2 1h13v-3"/>',
  mock:'<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  profile:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  data:'<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  arrow:'<path d="M5 12h14M13 6l6 6-6 6"/>',
  cal:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  send:'<path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  download:'<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>',
  settings:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  dot:'<circle cx="12" cy="12" r="3"/>'
};
const QZ_GROUPS=[["我的",["profile","dash"]],["找岗位",["radar","auto"]],["投递",["resume","apps"]],["面试",["star","bank","reviews","mock"]],["工具",["agent","abroad","data"]]];
const QZ_LABEL={profile:"我的经历",dash:"今天",agent:"AI 顾问",radar:"职位雷达",auto:"岗位队列",resume:"简历工作台",apps:"投递进度",abroad:"届别与资格",data:"备份与隐私"};
function qzIcon(n,s){ return `<svg class="qi" viewBox="0 0 24 24" width="${s||18}" height="${s||18}" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${QZ_ICON[n]||QZ_ICON.dot}</svg>`; }
function qzNames(){ const m=Object.fromEntries(VIEWS); Object.keys(m).forEach(k=>{ if(QZ_LABEL[k]) m[k]=QZ_LABEL[k]; }); return m; }
function qzGroupOf(k){ const g=QZ_GROUPS.find(([,ks])=>ks.includes(k)); return g?g[0]:"更多"; }
function qzCur(){ const v=document.querySelector(".view.on"); return v?v.id.slice(2):"dash"; }

/* ---------- 侧边导航 ---------- */
function qzNav(){
  const box=document.getElementById("navlinks"); if(!box) return;
  const names=qzNames(), cur=qzCur(), used=new Set();
  const btn=k=>`<button data-v="${k}" class="${k===cur?"on":""}" onclick="go('${k}')">${qzIcon(k)}<span>${names[k]}</span>${k==="auto"?'<i class="qz-badge" id="qzBadgeAuto"></i>':""}</button>`;
  let html="";
  QZ_GROUPS.forEach(([g,ks])=>{ const items=ks.filter(k=>names[k]); if(!items.length) return; items.forEach(k=>used.add(k)); html+=`<div class="qz-grp">${g}</div>`+items.map(btn).join(""); });
  const rest=VIEWS.map(v=>v[0]).filter(k=>!used.has(k)); if(rest.length) html+=`<div class="qz-grp">更多</div>`+rest.map(btn).join("");
  box.innerHTML=html; qzBadges();
}
function qzBadges(){
  const b=document.getElementById("qzBadgeAuto"); if(!b||typeof apS!=="function") return;
  const n=apS().queue.filter(x=>["ready","opened","filled"].includes(x.status)).length; b.textContent=n||"";
}
function qzExtState(){
  const el=document.getElementById("qzExt"); if(!el) return;
  const on=typeof apExtReady==="function"&&apExtReady(), old=!on&&typeof agExtOn==="function"&&agExtOn();
  el.className="qz-ext"+(on?" on":""); el.innerHTML=`<i></i>${on?"Chrome 插件已连接":old?"插件需要更新":"未连接 Chrome 插件"}`;
}

/* ---------- 顶栏 ---------- */
function qzTop(){
  const wrap=document.querySelector(".wrap"); if(!wrap||document.getElementById("qzTop")) return;
  const d=document.createElement("div"); d.className="qz-top"; d.id="qzTop";
  d.innerHTML=`<div class="qz-crumb"><span id="qzGroup"></span><b id="qzTitle"></b></div>
    <button class="qz-search" onclick="qzCmd()" aria-label="搜索">${qzIcon("search",16)}<span>搜索岗位、页面或操作</span><kbd>${/Mac/.test(navigator.platform)?"⌘":"Ctrl"} K</kbd></button>`;
  wrap.prepend(d);
  const nr=document.querySelector(".navright");
  if(nr&&!document.getElementById("qzExt")){ const e=document.createElement("div"); e.id="qzExt"; nr.prepend(e); }
}
function qzSync(){
  const k=qzCur(), names=qzNames();
  const g=document.getElementById("qzGroup"), t=document.getElementById("qzTitle");
  if(g) g.textContent=qzGroupOf(k); if(t) t.textContent=names[k]||"";
  document.title=(names[k]?names[k]+" · ":"")+(document.title.split(" · ").pop()||"Offer");
  qzBadges(); qzExtState();
  if(k==="dash") qzToday();

}

/* ---------- ⌘K 命令面板 ---------- */
let QZC={items:[],sel:0};
function qzCmdItems(q){
  q=(q||"").trim().toLowerCase(); const out=[], names=qzNames();
  const hit=s=>!q||String(s).toLowerCase().includes(q);
  VIEWS.forEach(([k,n])=>{ if(hit(n)||hit(k)) out.push({g:"页面",ic:k,t:n,s:qzGroupOf(k),run:()=>go(k)}); });
  const acts=[
    ["立即刷新岗位（自动投递跑一轮）","auto",()=>{ go("auto"); if(typeof apRun==="function") apRun(); }],
    ["查看待你提交的网申","send",()=>{ go("auto"); AP.tab="ready"; renderAutopilot(); }],
    ["设置岗位来源和筛选条件","settings",()=>{ go("auto"); AP.tab="settings"; renderAutopilot(); }],
    ["粘贴 JD，生成一页简历","resume",()=>go("resume")],
    ["问 AI 助手","agent",()=>go("agent")],
    ["导出备份","download",()=>exportJSON()]
  ].filter(a=>names[a[1]]||!["auto","resume","agent"].includes(a[1]));
  acts.forEach(([t,ic,run])=>{ if(hit(t)) out.push({g:"操作",ic,t,run}); });
  const apps=(S.apps||[]).filter(a=>a.phase!=="实习期");
  apps.filter(a=>hit(a.company+" "+a.role+" "+(a.stage||""))).slice(0,q?20:6).forEach(a=>out.push({g:"投递看板",ic:"apps",t:`${a.company} · ${a.role}`,s:a.stage||"",
    run:()=>{ go("apps"); setTimeout(()=>{ if(typeof viewApp==="function") viewApp(a.id); else if(typeof openApp==="function") openApp(a.id); },60); }}));
  if(typeof apS==="function") apS().queue.filter(x=>x.status!=="dismissed"&&x.found&&hit(x.company+" "+x.role)).slice(0,q?20:5).forEach(x=>out.push({g:"最新岗位",ic:"radar",t:`${x.company} · ${x.role}`,s:x.score!=null?"匹配 "+x.score:"",
    run:()=>{ RD.tab="jobs"; RD.jq=x.company; go("radar"); }}));
  return out;
}
function qzCmd(){
  let m=document.getElementById("qzCmd");
  if(!m){ m=document.createElement("div"); m.id="qzCmd"; m.className="qz-cmd";
    m.innerHTML=`<div class="qz-cmd-box" role="dialog" aria-label="命令面板"><div class="qz-cmd-in">${qzIcon("search",18)}<input id="qzCmdIn" placeholder="搜索岗位、页面或操作…" autocomplete="off"></div><div class="qz-cmd-list" id="qzCmdList"></div>
      <div class="qz-cmd-foot"><span><kbd>↑</kbd> <kbd>↓</kbd> 选择</span><span><kbd>Enter</kbd> 打开</span><span><kbd>Esc</kbd> 关闭</span></div></div>`;
    document.body.appendChild(m);
    m.addEventListener("mousedown",e=>{ if(e.target===m) qzCmdClose(); });
    const inp=m.querySelector("input");
    inp.addEventListener("input",()=>{ QZC.sel=0; qzCmdDraw(); });
    inp.addEventListener("keydown",e=>{
      if(e.key==="ArrowDown"){ e.preventDefault(); QZC.sel=Math.min(QZC.sel+1,QZC.items.length-1); qzCmdDraw(); }
      if(e.key==="ArrowUp"){ e.preventDefault(); QZC.sel=Math.max(QZC.sel-1,0); qzCmdDraw(); }
      if(e.key==="Enter"){ e.preventDefault(); qzCmdRun(QZC.sel); }
      if(e.key==="Escape"){ e.preventDefault(); qzCmdClose(); }
    });
  }
  m.classList.add("on"); const inp=m.querySelector("input"); inp.value=""; QZC.sel=0; qzCmdDraw(); setTimeout(()=>inp.focus(),10);
}
function qzCmdClose(){ const m=document.getElementById("qzCmd"); if(m) m.classList.remove("on"); }
function qzCmdRun(i){ const it=QZC.items[i]; if(!it) return; qzCmdClose(); it.run(); }
function qzCmdDraw(){
  QZC.items=qzCmdItems(document.getElementById("qzCmdIn").value);
  let g="", html="";
  QZC.items.forEach((it,i)=>{ if(it.g!==g){ g=it.g; html+=`<div class="qz-cmd-g">${g}</div>`; }
    html+=`<div class="qz-cmd-it ${i===QZC.sel?"on":""}" onmousemove="if(QZC.sel!==${i}){QZC.sel=${i};qzCmdDraw()}" onclick="qzCmdRun(${i})">${qzIcon(it.ic,17)}<span>${esc(it.t)}</span>${it.s?`<small>${esc(it.s)}</small>`:""}</div>`; });
  const list=document.getElementById("qzCmdList");
  list.innerHTML=html||'<div class="qz-empty">没有找到，换个关键词试试</div>';
  const on=list.querySelector(".on"); if(on) on.scrollIntoView({block:"nearest"});
}
document.addEventListener("keydown",e=>{
  if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="k"){ e.preventDefault(); const m=document.getElementById("qzCmd"); if(m&&m.classList.contains("on")) qzCmdClose(); else qzCmd(); }
});

/* ---------- 今天：待处理清单 + 投递进度 + 近 14 天投递 ---------- */
function qzDayAgo(n){ const d=new Date(); d.setDate(d.getDate()-n); return qzDay(d); }
function qzToday(){
  const host=document.getElementById("v-dash"); if(!host) return;
  let el=document.getElementById("qzToday"); if(!el){ el=document.createElement("div"); el.id="qzToday"; host.prepend(el); }
  const names=qzNames(), has=k=>!!names[k], today=qzDay();
  const past=(S.apps||[]).filter(a=>a.phase==="实习期"||(!a.phase&&a.date&&a.date<"2026"));
  const apps=(S.apps||[]).filter(a=>!past.includes(a)).map(a=>a.stage?a:Object.assign({},a,{stage:"想投/收藏"}));
  const A=typeof apS==="function"?apS():{queue:[],sources:[],hours:0};
  const Q=A.queue||[], review=Q.filter(x=>x.status==="review"), ready=Q.filter(x=>["ready","opened","filled"].includes(x.status));
  const fresh=Q.filter(x=>x.found&&Date.now()-new Date(x.found).getTime()<864e5);
  const sent=apps.filter(a=>a.stage&&!["想投/收藏"].includes(a.stage));
  const live=apps.filter(a=>/笔试|测评|面/.test(a.stage||"")&&a.result!=="挂");
  const offer=apps.filter(a=>a.stage==="已发offer"||a.result==="offer");
  const ddl=apps.filter(a=>a.deadline&&a.deadline>=today&&a.stage==="想投/收藏").sort((a,b)=>a.deadline.localeCompare(b.deadline));
  /* 经历：个人版看「待确认」，通用版看经历条数 */
  const lib=(S.cv&&S.cv.lib)||((S.profile&&S.profile.exps)||[]).filter(e=>e.org);
  const todo=typeof cvTodo==="function"?lib.filter(e=>cvTodo(e).length).length:0;
  const q=s=>String(s).replace(/"/g,"&quot;");
  const nm=(()=>{ try{ return typeof qzProfName==="function"?qzProfName():""; }catch(e){ return ""; } })();
  const h=new Date().getHours(), hi=h<6?"夜深了":h<12?"早上好":h<18?"下午好":"晚上好";
  const dstr=new Date().toLocaleDateString("zh-CN",{month:"long",day:"numeric",weekday:"short"});

  /* 下一步：最多 4 件，按紧急程度 */
  const acts=[];
  if(!lib.length) acts.push({ic:"profile",t:"先填你的经历",d:"简历、筛选和面试准备都从这里取材",fn:"go('profile')"});
  if(review.length) acts.push({ic:"auto",t:`审核 ${review.length} 个匹配岗位`,d:"匹配度都在 80 以上，确认后生成简历",fn:"go('auto');AP.tab='review';renderAutopilot()"});
  if(ready.length) acts.push({ic:"send",t:`提交 ${ready.length} 份网申`,d:"简历已生成，网申页已准备好",fn:"go('auto');AP.tab='ready';renderAutopilot()"});
  ddl.filter(a=>a.deadline<=qzDayAgo(-3)).slice(0,2).forEach(a=>acts.push({ic:"cal",t:`${a.deadline===today?"今天":a.deadline.slice(5).replace("-","/")} 截止：${a.company}`,d:a.role+" · 还没投",fn:`go('resume');setTimeout(()=>rvOpenApp('${a.id}'),0)`}));
  live.slice(0,2).forEach(a=>acts.push({ic:"mock",t:`准备${a.stage}：${a.company}`,d:a.role,fn:has("mock")?"go('mock')":"go('apps')"}));
  if(todo) acts.push({ic:"profile",t:`确认 ${todo} 段经历的口径`,d:"统一简历、自我介绍和面试说法",fn:"go('profile')"});
  if(!A.sources.some(s=>s.on)) acts.push({ic:"radar",t:"选择要监控的公司",d:"平台会自己读取岗位并按匹配度筛选",fn:"go('radar')"});
  if(!acts.length) acts.push({ic:"resume",t:"粘贴一个 JD，生成一页简历",d:"或去职位雷达刷新岗位",fn:"go('resume')"});
  const first=typeof loadSample==="function"&&!lib.length&&!S.onboarded;
  const top=acts.filter(a=>!(first&&a.t==="先填你的经历")).slice(0,4);

  /* 全流程 */
  const flow=[["profile","经历",lib.length,todo?`${todo} 待确认`:"","go('profile')"],["radar","新岗位",fresh.length,"24 小时","RD.tab='jobs';go('radar')"],
    ["auto","待审核",review.length,"匹配 ≥80","go('auto');AP.tab='review';renderAutopilot()"],["send","待提交",ready.length,"","go('auto');AP.tab='ready';renderAutopilot()"],
    ["apps","已投递",sent.length,"","APV.f='active';go('apps')"],["mock","面试中",live.length,"","APV.f='active';go('apps')"],["star","Offer",offer.length,"","APV.f='offer';go('apps')"]];

  /* 值得看：待审核 + 待提交里匹配度最高的 */
  const best=[...review,...ready].sort((a,b)=>(b.score||0)-(a.score||0)).slice(0,5);
  const days=[...Array(14)].map((_,i)=>qzDayAgo(13-i)), cnt=days.map(d=>sent.filter(a=>a.date===d).length), max=Math.max(1,...cnt), sum=cnt.reduce((a,b)=>a+b,0);

  el.innerHTML=`
  <header class="td-hello"><h1>${hi}${nm&&!/档案$/.test(nm)?"，"+esc(nm):""}</h1>
    <p>${dstr} · ${top.length&&acts[0].t!=="粘贴一个 JD，生成一页简历"?`${acts.length} 件事等你处理`:"今天没有紧急的事"}${A.hours>0?` · 每 ${typeof apEvery==="function"?apEvery(A.hours):A.hours+" 小时"}自动刷新岗位`:""}</p></header>
  ${typeof loadSample==="function"&&!lib.length&&!S.onboarded?`<section class="td-first"><h2>第一次使用 Offer</h2><p>先看一份虚构的示例档案，或者直接填你自己的经历。</p>
    <div class="td-next"><button class="td-card is-lead" onclick="loadSample()"><span class="td-ic">${qzIcon("star",18)}</span><span class="td-tx"><b>载入示例看看效果</b><span>虚构的示例同学，随时可以清除</span></span>${qzIcon("arrow",16)}</button>
      <button class="td-card" onclick="S.onboarded=true;save();go('profile')"><span class="td-ic">${qzIcon("profile",18)}</span><span class="td-tx"><b>从空白开始填写</b><span>也可以把旧简历整段粘贴导入</span></span>${qzIcon("arrow",16)}</button></div></section>`:""}
  <section class="td-next" aria-label="下一步">${top.map((a,i)=>`<button class="td-card ${i===0?"is-lead":""}" onclick="${q(a.fn)}">
      <span class="td-ic">${qzIcon(a.ic,18)}</span><span class="td-tx"><b>${esc(a.t)}</b><span>${esc(a.d)}</span></span>${qzIcon("arrow",16)}</button>`).join("")}</section>
  <section class="td-flow" aria-label="求职流程">${flow.map(([ic,n,v,sub,fn],i)=>`<button class="td-step ${v?"has":""}" onclick="${q(fn)}"><span class="td-step-n">${qzIcon(ic,15)}${n}</span><b class="num">${v}</b>${sub?`<small>${esc(sub)}</small>`:"<small>&nbsp;</small>"}</button>${i<flow.length-1?'<i class="td-arrow" aria-hidden="true"></i>':""}`).join("")}</section>
  <div class="td-grid">
    <section class="td-panel"><div class="sec-row"><h2 class="sec-h">匹配度最高的新岗位</h2>${best.length?`<button class="btn sm ghost" onclick="go('auto')">全部</button>`:""}</div>
      ${best.length?`<ul class="td-jobs">${best.map(x=>`<li><button onclick="go('auto');AP.tab='${x.status==="review"?"review":"ready"}';renderAutopilot()"><span class="td-score ${x.score>=90?"hi":""}">${x.score||"–"}</span><span class="td-jt"><b>${esc(x.company)}</b><span>${esc(x.role)}</span></span><em>${x.status==="review"?"待审核":"待提交"}</em></button></li>`).join("")}</ul>`
        :`<div class="td-empty"><p>${A.sources.some(s=>s.on)?"这轮没有匹配度 80 以上的新岗位。":"还没有监控公司。"}</p><button class="btn sm" onclick="go('radar')">${A.sources.some(s=>s.on)?"刷新岗位":"去选公司"}</button></div>`}</section>
    <section class="td-panel"><div class="sec-row"><h2 class="sec-h">接下来</h2></div>
      ${ddl.length||live.length?`<ul class="td-jobs">${[...live.map(a=>({a,k:a.stage,cls:"live"})),...ddl.map(a=>({a,k:a.deadline.slice(5).replace("-","/")+" 截止",cls:""}))].slice(0,5).map(({a,k,cls})=>`<li><button onclick="${cls?"go('apps')":q(`go('resume');setTimeout(()=>rvOpenApp('${a.id}'),0)`)}"><span class="td-tag ${cls}">${esc(k)}</span><span class="td-jt"><b>${esc(a.company)}</b><span>${esc(a.role)}</span></span></button></li>`).join("")}</ul>`
        :`<div class="td-empty"><p>没有临近的截止日期或面试。</p></div>`}
      ${sum?`<div class="td-spark" role="img" aria-label="近 14 天投递 ${sum} 个"><span class="muted">近 14 天投递 ${sum} 个</span><div>${cnt.map((c,i)=>`<i style="height:${c?Math.max(12,c/max*100):4}%" title="${days[i].slice(5)} · ${c} 个"></i>`).join("")}</div></div>`:""}
    </section>
  </div>`;
}

/* ---------- 挂载 ---------- */
const QZ_LOGO='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#0F2744"/><path d="M22.4 9.6A9 9 0 1 0 25 16" fill="none" stroke="#FFFFFF" stroke-width="2.6" stroke-linecap="round"/><path d="M16.6 15.4 24.6 7.4M19.6 7.2h5.2v5.2" fill="none" stroke="#E2B865" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
function qzBrand(){
  const b=document.querySelector(".nav .brand"); if(!b||b.dataset.qz) return; b.dataset.qz="1";
  b.innerHTML=QZ_LOGO.replace("<svg ",'<svg class="qz-logo" ')+'<b class="qz-bn">Offer</b>';
  let l=document.querySelector("link[rel=icon]"); if(!l){ l=document.createElement("link"); l.rel="icon"; document.head.appendChild(l); }
  l.href="data:image/svg+xml,"+encodeURIComponent(QZ_LOGO);
}
function qzShell(){
  qzBrand(); qzTop(); qzNav();
  /* 页面切换写进浏览历史：浏览器的后退 / 前进、触控板左右滑都能用 */
  if(!window.__qzGo){
    window.__qzGo=go;
    window.go=function(v,fromHistory){
      const r=window.__qzGo(v); qzSync();
      try{ if(!fromHistory&&document.getElementById("v-"+v)&&(history.state||{}).v!==v) history.pushState({v},"","#"+v); }catch(e){}
      return r;
    };
    try{ const cur=qzCur(); history.replaceState({v:cur},"","#"+cur); }catch(e){}
    window.addEventListener("popstate",e=>{ const v=(e.state&&e.state.v)||(location.hash||"").replace(/^#/,""); if(v&&document.getElementById("v-"+v)) window.go(v,true); });
  }
  window.buildNav=qzNav;
  qzSync();
  window.addEventListener("message",e=>{ const d=e.data||{}; if(d.source==="qzzt-ext"&&d.type==="HELLO") setTimeout(()=>{ qzExtState(); qzBadges(); },50); });
  setInterval(()=>{ qzBadges(); qzExtState(); },5000);
}
if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",()=>setTimeout(qzShell,0)); else setTimeout(qzShell,0);
