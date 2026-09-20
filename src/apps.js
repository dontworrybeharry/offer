
/* =========================================================================
   投递进度（两个版本共用，替换原来的横向看板 / 时间线）
   · 一个岗位 = 一条投递档案：阶段、这一轮的结果（待定 / 通过 / 未通过）、投递用的简历、复盘
   · 三种视图：卡片（自动换行，不横向滚动）、表格、动态
   · 投递时把当时的简历冻结一份存进档案（a.resumeSnap），之后怎么改简历都不影响这份
   ========================================================================= */
const AP_FLOW=["已投递","笔试/测评","一面","二面","三面/交叉面","HR面","已发offer"];
const AP_STEP={"已投递":"投递","笔试/测评":"笔试","一面":"一面","二面":"二面","三面/交叉面":"三面","HR面":"HR 面","已发offer":"Offer"};
let APV={view:"card",f:"active",q:""};
try{ const v=localStorage.getItem("qz_apps_view"); if(v) APV.view=v; }catch(e){}

function apPast(a){ return a.phase==="实习期"||(!a.phase&&a.date&&a.date<"2026"); }
/* 这条投递现在处于什么结果：wish 想投 · active 进行中 · offer · fail 未通过 · quit 放弃 */
function apOutcome(a){
  if(a.stage==="已发offer"||a.result==="offer") return "offer";
  if(a.result==="放弃") return "quit";
  if(a.result==="挂"||a.stage==="已结束") return "fail";
  if(!a.stage||a.stage==="想投/收藏") return "wish";
  return "active";
}
function apCurStatus(a){ return a.st||"pending"; }   // 当前这一轮：pending 待定 · pass 通过 · fail 未通过
function apLastAt(a){ const h=a.hist||[]; return (h.length?h[h.length-1].at:"")||a.date||""; }

/* ---------- 冻结投递用的简历 ---------- */
function qzFreezeResume(a,h){
  if(!a||!h||!h.model) return;
  if(a.resumeSnap&&a.resumeSnap.id===h.id) return;
  a.resumeHist=h.id; a.resumeFile=h.file+".docx";
  a.resumeSnap={id:h.id,at:new Date().toISOString(),file:h.file,company:h.company,role:h.role,model:JSON.parse(JSON.stringify(h.model))};
  try{ a.resumeText=rvModelText(rvHistModel(h)); }catch(e){}
}
function apSnapModel(a){
  const s=a.resumeSnap; if(!s) return null;
  const m=JSON.parse(JSON.stringify(s.model)); try{ m.photo=m.photo&&rvPhoto()?rvPhoto():""; }catch(e){}
  return m;
}
function apResumeOpen(id){
  const a=S.apps.find(x=>x.id===id); if(!a) return;
  const h=(S.resumeHist||[]).find(x=>x.id===a.resumeHist);
  if(!a.resumeSnap&&h&&a.stage!=="想投/收藏") { qzFreezeResume(a,h); save(); }
  const s=a.resumeSnap, m=s?apSnapModel(a):(h?rvHistModel(h):null);
  if(!m){ return toast("这条投递还没有绑定简历"); }
  const text=(()=>{ try{ return rvModelText(m); }catch(e){ return a.resumeText||""; } })();
  const changed=s&&h&&JSON.stringify(h.model)!==JSON.stringify(s.model);
  openModal(`投递用的简历 · ${esc(a.company)}`,
    `<dl class="ap-kv"><div><dt>文件</dt><dd>${esc((s||h).file)}.docx</dd></div>
      <div><dt>${s?"投递时冻结":"最近保存"}</dt><dd>${esc(qzTime((s||h).at))}</dd></div>
      <div><dt>对应岗位</dt><dd>${esc((s||h).company)} · ${esc((s||h).role)}</dd></div></dl>
    ${changed?`<p class="notice"><span>简历工作台里这一版后来改过；这里显示的是投递当时的内容。</span></p>`:""}
    ${s?"":`<p class="notice"><span>还没投递，这是目前绑定的版本；标记「已投递」时会自动冻结一份。</span></p>`}
    <pre class="ap-cv">${esc(text)}</pre>`,
    `<button class="btn" onclick="closeModal()">关闭</button>${h?`<button class="btn" onclick="closeModal();go('resume');RVHIST='${h.id}';renderResumeHome()">在简历工作台打开</button>`:""}<button class="btn" onclick="apResumeExport('${a.id}','pdf')">存为 PDF</button><button class="btn pri" onclick="apResumeExport('${a.id}','docx')">导出 Word</button>`,true);
}
function apResumeExport(id,kind){
  const a=S.apps.find(x=>x.id===id); if(!a) return;
  const h=(S.resumeHist||[]).find(x=>x.id===a.resumeHist);
  const m=a.resumeSnap?apSnapModel(a):(h?rvHistModel(h):null), file=(a.resumeSnap||h||{}).file||"简历";
  if(!m) return;
  if(kind==="pdf") rvPrintModel(m,file); else rvDownloadModel(m,file);
}
function apMakeResume(id){ go("resume"); setTimeout(()=>rvOpenApp(id),0); }

/* ---------- 改阶段 / 结果 ---------- */
function apHist(a,stage,st){ a.hist=a.hist||[]; a.hist.push({stage,st,at:new Date().toISOString()}); }
function apSetStatus(id,st){
  const a=S.apps.find(x=>x.id===id); if(!a) return;
  const cur=a.stage;
  if(st!=="pending"&&!AP_FLOW.includes(cur)) return toast("先把阶段改成正在进行的一轮");
  if(st==="pass"){
    apHist(a,cur,"pass");
    const i=AP_FLOW.indexOf(cur), next=AP_FLOW[Math.min(i+1,AP_FLOW.length-1)];
    a.stage=next; a.st="pending"; a.result=next==="已发offer"?"offer":"";
    toast(next==="已发offer"?`${a.company}：拿到 Offer`:`${a.company}：${AP_STEP[cur]||cur} 通过，进入${AP_STEP[next]||next}`);
  }else if(st==="fail"){
    apHist(a,cur,"fail"); a.failAt=cur; a.stage="已结束"; a.result="挂"; a.st="fail";
    toast(`${a.company}：${AP_STEP[cur]||cur} 未通过，已归入「已结束」。记得写复盘`);
  }else{ a.st="pending"; }
  save(); renderApps(); if(typeof renderDash==="function") try{ renderDash(); }catch(e){}
}
function apSetStage(id,stage){
  const a=S.apps.find(x=>x.id===id); if(!a) return;
  const was=a.stage; a.stage=stage; a.st="pending";
  if(stage==="已发offer") a.result="offer"; else if(stage!=="已结束") { a.result=""; a.failAt=""; }
  if(was==="想投/收藏"&&stage!=="想投/收藏"){
    a.date=a.date||qzDay();
    const h=(S.resumeHist||[]).find(x=>x.id===a.resumeHist); if(h) qzFreezeResume(a,h);
  }
  apHist(a,stage,"set"); save(); renderApps();
}
function apReopen(id){ const a=S.apps.find(x=>x.id===id); if(!a) return; a.stage=a.failAt||"已投递"; a.result=""; a.st="pending"; a.failAt=""; save(); renderApps(); }

/* ---------- 渲染 ---------- */
function apStepper(a){
  const o=apOutcome(a), at=o==="fail"?(a.failAt||""):a.stage, idx=AP_FLOW.indexOf(at);
  const passed=new Set((a.hist||[]).filter(h=>h.st==="pass").map(h=>h.stage));
  return `<ol class="ap-steps" aria-label="进度">${AP_FLOW.map((s,i)=>{
    let c=""; if(o==="offer") c="done";
    else if(i<idx) c=passed.has(s)||i<idx?"done":"";
    else if(i===idx) c=o==="fail"?"fail":"cur";
    return `<li class="${c}" title="${esc(s)}"><i></i><span>${AP_STEP[s]}</span></li>`; }).join("")}</ol>`;
}
function apStatusCtl(a){
  const o=apOutcome(a);
  if(o==="offer") return `<span class="ap-badge ok">已拿 Offer</span>`;
  if(o==="fail") return `<span class="ap-badge bad">${esc(AP_STEP[a.failAt]||a.failAt||"")}${a.failAt?" ":""}未通过</span><button class="btn sm ghost" onclick="apReopen('${a.id}')">撤销</button>`;
  if(o==="quit") return `<span class="ap-badge">已放弃</span>`;
  if(o==="wish") return `<button class="btn sm" onclick="apSetStage('${a.id}','已投递')">标记已投递</button>`;
  const st=apCurStatus(a), lab=AP_STEP[a.stage]||a.stage;
  return `<div class="seg ap-seg" role="group" aria-label="${esc(lab)}的结果">
    <button class="${st==="pending"?"on":""}" onclick="apSetStatus('${a.id}','pending')">待定</button>
    <button class="${st==="pass"?"on":""}" onclick="apSetStatus('${a.id}','pass')">通过</button>
    <button class="${st==="fail"?"on":""} is-bad" onclick="apSetStatus('${a.id}','fail')">未通过</button></div>`;
}
function apResumeChip(a){
  if(a.resumeSnap) return `<button class="ap-cvchip" onclick="apResumeOpen('${a.id}')" title="投递时冻结的版本，之后改简历不影响">简历：${esc(a.resumeSnap.file)} · ${esc(qzDay(new Date(a.resumeSnap.at)).slice(5))} 冻结</button>`;
  if(a.resumeHist&&(S.resumeHist||[]).some(x=>x.id===a.resumeHist)) return `<button class="ap-cvchip" onclick="apResumeOpen('${a.id}')">简历：已绑定，投递时冻结</button>`;
  return `<button class="ap-cvchip is-empty" onclick="apMakeResume('${a.id}')">${(a.jd||"").length>30?"按 JD 生成简历":"还没有简历 · 去生成"}</button>`;
}
function apMeta(a){
  const bits=[];
  if(a.date&&a.stage!=="想投/收藏") bits.push("投递 "+esc(String(a.date).slice(0,10)));
  if(a.deadline) bits.push(`<span class="${a.stage==="想投/收藏"&&a.deadline<=qzDay(new Date(Date.now()+3*864e5))?"ap-due":""}">截止 ${esc(a.deadline.slice(5))}</span>`);
  if(a.city) bits.push(esc(a.city)); if(a.channel) bits.push(esc(a.channel)); if(a.match) bits.push("匹配 "+esc(a.match));
  const nr=(S.reviews||[]).filter(r=>r.appId===a.id).length; if(nr) bits.push(`<a href="javascript:go('reviews')">复盘 ${nr}</a>`);
  return bits.join(" · ");
}
function apAppCard(a){
  const o=apOutcome(a);
  return `<article class="ap-card is-${o}">
    <header><div><h3>${esc(a.company)}</h3><p>${esc(a.dept?a.dept+" · ":"")}${esc(a.role)}</p></div>
      <button class="btn sm ghost" onclick="openApp('${a.id}')" aria-label="编辑 ${esc(a.company)}">编辑</button></header>
    ${o==="wish"?"":apStepper(a)}
    <div class="ap-now">${o==="active"?`<span class="ap-cur">当前：${esc(AP_STEP[a.stage]||a.stage)}</span>`:""}${apStatusCtl(a)}</div>
    <p class="ap-meta">${apMeta(a)||"&nbsp;"}</p>
    <footer>${apResumeChip(a)}</footer>
  </article>`;
}
function apRow(a){
  const o=apOutcome(a);
  return `<tr class="is-${o}"><td><b>${esc(a.company)}</b><div class="muted">${esc(a.role)}</div></td>
    <td><select class="inp sm" aria-label="阶段" onchange="apSetStage('${a.id}',this.value)">${STAGES.map(s=>`<option ${s===a.stage?"selected":""}>${s}</option>`).join("")}</select></td>
    <td>${apStatusCtl(a)}</td>
    <td class="num hide-sm">${esc(a.date&&a.stage!=="想投/收藏"?String(a.date).slice(5,10):"–")}</td>
    <td class="num hide-sm">${esc(a.deadline?a.deadline.slice(5):"–")}</td>
    <td>${apResumeChip(a)}</td>
    <td class="act"><button class="btn sm ghost" onclick="openApp('${a.id}')">编辑</button></td></tr>`;
}
function apFeed(list){
  const ev=[]; list.forEach(a=>(a.hist||[]).forEach(h=>ev.push({a,h})));
  list.forEach(a=>{ if(!(a.hist||[]).length&&a.date&&a.stage!=="想投/收藏") ev.push({a,h:{stage:"已投递",st:"set",at:String(a.date)}}); });
  ev.sort((x,y)=>String(y.h.at).localeCompare(String(x.h.at)));
  if(!ev.length) return `<p class="muted">还没有动态。改阶段、标记通过或未通过后会记在这里。</p>`;
  const word={pass:"通过",fail:"未通过",set:"进入"};
  return `<ol class="ap-feed">${ev.slice(0,80).map(({a,h})=>`<li><time>${esc(String(h.at).slice(0,10))}</time><span><b>${esc(a.company)}</b> · ${esc(a.role)}：${word[h.st]||""}${h.st==="set"?"「"+esc(h.stage)+"」":"「"+esc(AP_STEP[h.stage]||h.stage)+"」"}</span></li>`).join("")}</ol>`;
}
function renderApps(){
  const v=document.getElementById("v-apps"); if(!v) return;
  let box=document.getElementById("appsHome");
  if(!box){ box=document.createElement("div"); box.id="appsHome"; v.appendChild(box); }
  // 旧版的看板 / 列表 / 阶段条不再使用
  ["kanbanWrap","listWrap","appPhaseBar"].forEach(id=>{ const el=document.getElementById(id); if(el) el.style.display="none"; });
  const ph=v.querySelector(".pagehead"); if(ph&&!ph.dataset.ap){ ph.dataset.ap=1; ph.innerHTML=`<div><h1>投递进度</h1><p id="apFacts"></p></div><div class="pg-act"><button class="btn pri" onclick="openApp()">新增投递</button></div>`; }
  const all=(S.apps||[]), cur=all.filter(a=>!apPast(a)), past=all.filter(apPast);
  const by=k=>cur.filter(a=>apOutcome(a)===k);
  const F=[["active","进行中",by("active")],["wish","想投",by("wish")],["offer","Offer",by("offer")],["ended","已结束",[...by("fail"),...by("quit")]],["all","全部",cur]];
  if(past.length) F.push(["past","往期实习",past]);
  const f=F.find(x=>x[0]===APV.f)||F[0];
  let list=f[2]; if(APV.q){ const q=APV.q.toLowerCase(); list=list.filter(a=>(a.company+a.role+(a.city||"")).toLowerCase().includes(q)); }
  list=list.slice().sort((a,b)=>{ const r={active:0,wish:1,offer:2,fail:3,quit:4}; return (r[apOutcome(a)]-r[apOutcome(b)])||String(apLastAt(b)).localeCompare(String(apLastAt(a))); });
  const sent=cur.filter(a=>apOutcome(a)!=="wish").length, intv=by("active").filter(a=>!["已投递","笔试/测评"].includes(a.stage)).length;
  const facts=document.getElementById("apFacts");
  if(facts) facts.textContent=cur.length?`本季 ${cur.length} 个岗位：已投 ${sent} 个，面试中 ${intv} 个，Offer ${by("offer").length} 个，未通过 ${by("fail").length} 个。每一轮出结果后点「通过」或「未通过」，阶段会自动往下走。`:`本季（2026 秋招）还没有投递记录${past.length?`；2024–2025 年投实习的 ${past.length} 条在「往期实习」里`:""}。`;
  // 漏斗条：各阶段占比，一眼看出卡在哪
  const seg=[["wish","想投",by("wish").length],["sent","已投递 / 笔试",by("active").filter(a=>["已投递","笔试/测评"].includes(a.stage)).length],["intv","面试中",intv],["offer","Offer",by("offer").length],["fail","已结束",by("fail").length+by("quit").length]];
  const tot=seg.reduce((n,s)=>n+s[2],0)||1;
  box.innerHTML=`
    ${cur.length?`<div class="ap-bar" role="img" aria-label="${seg.map(s=>s[1]+" "+s[2]).join("，")}">${seg.filter(s=>s[2]).map(s=>`<i class="b-${s[0]}" style="flex:${s[2]}" title="${s[1]} ${s[2]}"></i>`).join("")}</div>
    <ul class="ap-legend">${seg.map(s=>`<li><i class="b-${s[0]}"></i>${s[1]} <b class="num">${s[2]}</b></li>`).join("")}</ul>`:""}
    <div class="ap-tools">
      <div class="seg" role="group" aria-label="筛选">${F.map(([k,n,l])=>`<button class="${k===f[0]?"on":""}" onclick="APV.f='${k}';renderApps()">${n} <span class="num">${l.length}</span></button>`).join("")}</div>
      <label class="search">${typeof qzIcon==="function"?qzIcon("search",15):""}<input value="${esc(APV.q)}" placeholder="搜公司、岗位、城市" aria-label="搜公司、岗位、城市" oninput="APV.q=this.value;clearTimeout(APV._t);APV._t=setTimeout(()=>{renderApps();const i=document.querySelector('#appsHome .search input');i.focus();i.setSelectionRange(i.value.length,i.value.length)},250)"></label>
      <nav class="tabs ap-views" role="tablist">${[["card","卡片"],["table","表格"],["feed","动态"]].map(([k,n])=>`<button role="tab" aria-selected="${APV.view===k}" class="${APV.view===k?"on":""}" onclick="APV.view='${k}';try{localStorage.setItem('qz_apps_view','${k}')}catch(e){};renderApps()">${n}</button>`).join("")}</nav>
    </div>
    ${f[0]==="past"?`<p class="muted ap-note">往期实习投递只作档案和面试语料，不计入本季进度。</p>`:""}
    ${!list.length?(APV.q||f[0]!=="active"?`<div class="empty-block"><p>${APV.q?"没有匹配的投递。":"这里还没有记录。"}</p></div>`:(()=>{ const Q=(typeof apS==="function"?apS().queue:[]), rv=Q.filter(x=>x.status==="review").length, rd=Q.filter(x=>["ready","opened","filled"].includes(x.status)).length;
        return `<div class="ap-empty"><p>还没有进行中的投递。</p><div class="td-next">
          <button class="td-card is-lead" onclick="go('auto');AP.tab='${rd?"ready":"review"}';renderAutopilot()"><span class="td-ic">${qzIcon("auto",18)}</span><span class="td-tx"><b>${rd?`提交 ${rd} 份备好的网申`:rv?`审核 ${rv} 个匹配岗位`:"去岗位队列找岗位"}</b><span>投递后自动出现在这里，并冻结当时的简历</span></span>${qzIcon("arrow",16)}</button>
          <button class="td-card" onclick="openApp()"><span class="td-ic">${qzIcon("plus",18)}</span><span class="td-tx"><b>手动新增一条</b><span>在别处投的岗位也可以记进来</span></span>${qzIcon("arrow",16)}</button>
          ${past.length?`<button class="td-card" onclick="APV.f='past';renderApps()"><span class="td-ic">${qzIcon("apps",18)}</span><span class="td-tx"><b>看往期实习 ${past.length} 条</b><span>只作档案，不计入本季</span></span>${qzIcon("arrow",16)}</button>`:""}
        </div></div>`; })())
      :APV.view==="table"?`<div class="tbl-wrap"><table class="tbl ap-tbl"><thead><tr><th>公司 / 岗位</th><th>阶段</th><th>这一轮</th><th class="num hide-sm">投递</th><th class="num hide-sm">截止</th><th>简历</th><th class="act"><span class="sr">操作</span></th></tr></thead><tbody>${list.map(apRow).join("")}</tbody></table></div>`
      :APV.view==="feed"?apFeed(list)
      :`<div class="ap-grid">${list.map(apAppCard).join("")}</div>`}`;
}
/* 投递时冻结简历：岗位队列确认投递、简历工作台「记进投递进度」都走这里 */
(function(){
  const wrap=(name,after)=>{ const o=window[name]; if(typeof o!=="function"||o.__ap) return; const w=function(){ const r=o.apply(this,arguments); try{ after.apply(this,arguments); }catch(e){} return r; }; w.__ap=true; window[name]=w; };
  wrap("apMarkSubmitted",function(id){ const it=(typeof apItem==="function")&&apItem(id); const a=it&&S.apps.find(x=>x.id===it.appId); const h=a&&(S.resumeHist||[]).find(x=>x.id===a.resumeHist); if(a&&h){ qzFreezeResume(a,h); save(); } });
  wrap("rvRecord",function(){ const a=typeof RVAPP!=="undefined"&&S.apps.find(x=>x.id===RVAPP); const h=a&&(S.resumeHist||[]).find(x=>x.id===a.resumeHist); if(a&&h&&a.stage!=="想投/收藏"){ qzFreezeResume(a,h); save(); } });
})();
(function(){ const og=window.go; if(typeof og!=="function"||og.__apps) return;
  const w=function(v){ const r=og.apply(this,arguments); if(v==="apps") renderApps(); return r; }; w.__apps=true; window.go=w; })();
