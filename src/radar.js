
/* =========================================================================
   职位雷达：所有公司、所有在招岗位，一处看全（两个版本共用）
   数据来自三处：来源库（50 家校招官网）、你自己加的来源、自动投递刷新到的岗位；
   个人版还会带上手写的「为什么适合你」分析。
   ========================================================================= */
let RD={tab:"co",cat:"全部",q:"",sort:"rec",dir:-1,jq:"",jst:"all",open:""};
function rdKey(s){ return String(s||"").split(/[（(\/·\s]/)[0].trim(); }
function rdMatch(a,b){ a=rdKey(a); b=rdKey(b); return !!a&&!!b&&(a.includes(b)||b.includes(a)); }
function rdCurated(co){ return typeof CAREER_RADAR!=="undefined"?CAREER_RADAR.find(c=>rdMatch(c.co,co)||c.co.split(/\s*\/\s*/).some(p=>rdMatch(p,co))):null; }
function rdCompanies(){
  const A=apS(), map=new Map();
  apSites().forEach(x=>map.set(rdKey(x.co),{co:x.co,cat:x.cat,url:x.url,auto:x.auto!==false||!!qzDirect(x.url),direct:qzDirect(x.url),note:x.note||""}));
  const known=name=>[...map.values()].some(x=>rdMatch(x.co,name)||String(name).split(/\s*\/\s*/).some(p=>rdMatch(x.co,p)));
  if(typeof CAREER_RADAR!=="undefined") CAREER_RADAR.forEach(c=>{ if(!known(c.co)) map.set(rdKey(c.co),{co:c.co.split(" / ").pop(),cat:"我的重点",url:c.url,auto:false,note:""}); });
  A.sources.forEach(s=>{ const n=s.company||s.name; if(!known(n)) map.set(rdKey(n),{co:n,cat:"我添加的",url:s.url,auto:true,direct:qzDirect(s.url),note:""}); });
  const now=Date.now();
  const dirs=typeof qzDirs==="function"?qzDirs():["biz"];
  return [...map.values()].map(c=>{
    const src=A.sources.find(s=>rdMatch(s.company||s.name,c.co)||s.url===c.url);
    const jobs=A.queue.filter(x=>x.status!=="dismissed"&&rdMatch(x.company,c.co));
    const cur=rdCurated(c.co);
    return Object.assign(c,{src,on:!!(src&&src.on),last:src&&src.last,needs:src&&src.needs,jobs,
      fresh:jobs.filter(x=>x.found&&now-new Date(x.found).getTime()<864e5).length,
      good:jobs.filter(x=>["ready","opened","filled","submitted"].includes(x.status)).length,
      fit:cur?cur.fit:null,cur,busy:AP.running&&AP.curSrc&&src&&AP.curSrc===src.id});
  }).filter(c=>c.on||c.cat==="我的重点"||c.cat==="我添加的"||typeof qzDirOf!=="function"||dirs.includes(qzDirOf(c.cat)));
}
function rdAgo(iso){ if(!iso) return ""; const m=Math.round((Date.now()-new Date(iso).getTime())/6e4); return m<1?"刚刚":m<60?m+" 分钟前":m<1440?Math.round(m/60)+" 小时前":Math.round(m/1440)+" 天前"; }
function rdMono(co){ return esc(rdKey(co).replace(/[^一-龥A-Za-z]/g,"").slice(0,1).toUpperCase()||"·"); }

function renderRadar(){
  const host=document.getElementById("v-radar"); if(!host) return;
  if(!document.getElementById("radarHome")) host.innerHTML='<div id="radarHome"></div>';
  const box=document.getElementById("radarHome");
  const all=rdCompanies(), A=apS(), ext=apExtReady();
  const jobs=A.queue.filter(x=>x.found&&x.status!=="dismissed");
  const mon=all.filter(c=>c.on).length, fresh=jobs.filter(x=>Date.now()-new Date(x.found).getTime()<864e5).length;
  box.innerHTML=`
  <header class="pg-h"><div><h1>职位雷达</h1>
    <p>${all.length} 家公司 · 监控 ${mon} 家 · 已发现 ${jobs.length} 个岗位${fresh?`，24 小时内新增 ${fresh} 个`:""} · ${A.hours>0?`每 ${apEvery(A.hours)}自动刷新`:"未开启自动刷新"}${A.lastRun?`，上次 ${rdAgo(A.lastRun)}`:""}</p></div>
    <div class="pg-act">${AP.running?`<span class="run-note" role="status" id="rdStep">${esc(AP.step)}</span><button class="btn" onclick="apStop()">停止</button>`:`${(()=>{ const vis=rdFilter(all).filter(c=>c.auto&&!c.on).length; return vis?`<button class="btn" onclick="rdWatchAll()" title="把当前筛选下所有能自动读取岗位的公司（现在是 ${vis} 家）加入监控，并马上刷新一遍">全部监控并刷新</button>`:""; })()}<button class="btn pri" onclick="rdRefreshAll()">立即刷新</button>`}</div></header>
  ${typeof qzDirPickerHTML==="function"?qzDirPickerHTML():""}
  ${ext?"":(()=>{ const nd=all.filter(c=>c.direct).length; return nd?`<p class="notice">${qzIcon("data",16)}<span>标「直读」的 ${nd} 家由本机后端读取，不需要插件；其余公司刷新需要 Chrome 插件。<a href="javascript:agExtHelp()">安装方法</a></span></p>`:`<p class="notice">${qzIcon("data",16)}<span>刷新需要 Chrome 插件。<a href="javascript:agExtHelp()">安装方法</a></span></p>`; })()}
  <nav class="tabs" role="tablist"><button role="tab" aria-selected="${RD.tab==="co"}" class="${RD.tab==="co"?"on":""}" onclick="RD.tab='co';renderRadar()">公司 <span class="num">${all.length}</span></button><button role="tab" aria-selected="${RD.tab==="jobs"}" class="${RD.tab==="jobs"?"on":""}" onclick="RD.tab='jobs';renderRadar()">全部岗位 <span class="num">${jobs.length}</span></button></nav>
  ${RD.tab==="co"?rdCoHTML(all):rdJobsHTML(jobs)}`;
}
function rdSortBy(k){ if(RD.sort===k) RD.dir=-RD.dir; else { RD.sort=k; RD.dir=k==="co"||k==="cat"?1:-1; } renderRadar(); }
function rdFilter(all){
  let list=all.filter(c=>RD.cat==="全部"||(RD.cat==="我监控的"?c.on:c.cat===RD.cat));
  if(RD.q) list=list.filter(c=>(c.co+c.cat+c.jobs.map(j=>j.role).join(" ")).toLowerCase().includes(RD.q.toLowerCase()));
  return list;
}
/* 一键：把当前列表里所有能自动读取的公司都加入监控，并马上刷新一遍 */
function rdWatchAll(){
  const A=apS(), list=rdFilter(rdCompanies()); let n=0, manual=0;
  list.forEach(c=>{ if(!c.auto){ manual++; return; } if(c.src){ if(!c.src.on){ c.src.on=true; n++; } } else { A.sources.push({id:uid("s"),name:c.co+"校招",company:rdKey(c.co),url:c.url,on:true}); n++; } });
  save();
  toast(`${n?`新监控 ${n} 家`:"这些公司都已在监控"}${manual?`；${manual} 家官网要先手动选岗位类别，已跳过`:""}`);
  if(!apExtReady()){ renderRadar(); return agExtHelp(); }
  apRun({noOpen:true,full:true});
}
function rdCoHTML(all){
  const cats=["全部","我监控的",...new Set(all.map(c=>c.cat))];
  let list=rdFilter(all);
  const val={co:c=>c.co,cat:c=>c.cat,fit:c=>c.fit||0,jobs:c=>c.jobs.length,fresh:c=>c.fresh,good:c=>c.good,last:c=>c.last||"",rec:c=>(c.on?1e6:0)+(c.fit||0)*100+(c.auto?50:0)+c.jobs.length};
  const f=val[RD.sort]||val.rec;
  list.sort((a,b)=>{ const x=f(a),y=f(b); return (typeof x==="string"?x.localeCompare(y,"zh"):x-y)*RD.dir||a.co.localeCompare(b.co,"zh"); });
  const th=(k,t,cls)=>`<th class="${cls||""}" aria-sort="${RD.sort===k?(RD.dir>0?"ascending":"descending"):"none"}"><button onclick="rdSortBy('${k}')">${t}${RD.sort===k?(RD.dir>0?" ↑":" ↓"):""}</button></th>`;
  const hasFit=all.some(c=>c.fit);
  const cols=hasFit?9:8;
  return `<div class="toolbar">
    <div class="seg" role="group" aria-label="按类别筛选">${cats.map(c=>`<button class="${c===RD.cat?"on":""}" onclick="RD.cat='${esc(c)}';RD.open='';renderRadar()">${esc(c)} <span class="num">${c==="全部"?all.length:c==="我监控的"?all.filter(x=>x.on).length:all.filter(x=>x.cat===c).length}</span></button>`).join("")}</div>
    <label class="search">${qzIcon("search",15)}<input value="${esc(RD.q)}" placeholder="搜公司或岗位" aria-label="搜公司或岗位" oninput="RD.q=this.value;clearTimeout(RD._t);RD._t=setTimeout(()=>{renderRadar();const i=document.querySelector('.search input');i.focus();i.setSelectionRange(i.value.length,i.value.length)},250)"></label>
    ${RD.cat!=="全部"&&RD.cat!=="我监控的"?`<button class="btn sm" onclick="apAddCat('${esc(RD.cat)}')">监控这一类</button>`:""}
  </div>
  <div class="tbl-wrap"><table class="tbl">
    <thead><tr>${th("co","公司")}${th("cat","类别","hide-sm")}${hasFit?th("fit","契合","num hide-sm"):""}<th>状态</th>${th("jobs","已发现","num")}${th("fresh","24h 新增","num hide-sm")}${th("good","值得投","num hide-sm")}${th("last","上次刷新","hide-sm")}<th class="act"><span class="sr">操作</span></th></tr></thead>
    <tbody>${list.map(c=>rdRow(c,hasFit,cols)).join("")||`<tr><td colspan="${cols}" class="empty-cell">没有匹配的公司，换个关键词或类别。</td></tr>`}</tbody>
  </table></div>
  <form class="add-row" onsubmit="event.preventDefault();rdAddCustom()"><span>没有你想投的公司？</span><input class="inp" id="rdNewCo" placeholder="公司名" aria-label="公司名"><input class="inp" id="rdNewUrl" placeholder="校招岗位列表页网址 https://…" aria-label="岗位列表页网址"><button class="btn sm">添加并监控</button></form>`;
}
function rdRow(c,hasFit,cols){
  const k=esc(c.co).replace(/'/g,"&#39;"), open=RD.open===c.co;
  const st=c.busy?`<span class="st st-busy"><i></i>刷新中</span>`:c.needs?`<span class="st st-warn"><i></i>${esc(c.needs)}</span>`:c.on?`<span class="st st-on"><i></i>监控中</span>`:(c.auto?`<span class="st st-off"><i></i>未监控</span>`:`<span class="st st-man" title="这家官网要先选好应聘项目 / 岗位类别（或登录）才显示岗位，插件读不到。展开这一行，把筛好后的网址贴进来就能监控">需手动选类别</span>`);
  return `<tr class="${open?"is-open":""} ${c.on?"is-on":""}" onclick="RD.open=RD.open==='${k}'?'':'${k}';renderRadar()" aria-expanded="${open}">
    <td class="co"><span class="rd-co"><span class="rd-mono" aria-hidden="true">${rdMono(c.co)}</span><b>${esc(c.co)}</b>${c.direct?`<span class="rd-direct" title="本机后端直接读取${esc(c.direct)}接口，不需要插件">直读</span>`:""}</span></td><td class="muted hide-sm nowrap">${esc(c.cat)}</td>${hasFit?`<td class="num hide-sm">${c.fit||"–"}</td>`:""}<td>${st}</td>
    <td class="num">${c.jobs.length||"–"}</td><td class="num hide-sm">${c.fresh||"–"}</td><td class="num hide-sm">${c.good||"–"}</td><td class="muted num hide-sm">${c.last?rdAgo(c.last):"–"}</td>
    <td class="act" onclick="event.stopPropagation()">${c.on?`<button class="btn sm" onclick="rdRefresh('${k}')" ${AP.running?"disabled":""}>刷新</button>`:c.auto?`<button class="btn sm" onclick="rdWatch('${k}')">监控</button>`:""}<a class="btn sm ghost" href="${esc(c.url)}" target="_blank" rel="noopener">官网</a></td></tr>
    ${open?`<tr class="detail"><td colspan="${cols}">${rdDetail(c)}</td></tr>`:""}`;
}
function rdDetail(c){
  const cur=c.cur, k=esc(c.co).replace(/'/g,"&#39;");
  const jobs=c.jobs.slice().sort((a,b)=>(b.found||"").localeCompare(a.found||"")).slice(0,40);
  return `<div class="dt">
    <div class="dt-main">
      ${jobs.length?`<table class="tbl tbl-in"><thead><tr><th>岗位</th><th>城市</th><th class="num">匹配</th><th>发现</th><th>结果</th></tr></thead><tbody>${jobs.map(x=>`<tr><td>${x.url?`<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.role)}</a>`:esc(x.role)}</td><td class="muted">${esc(x.city||"–")}</td><td class="num">${x.score!=null?x.score:"–"}</td><td class="muted num">${rdAgo(x.found)}</td><td class="muted">${esc(rdStatus(x))}</td></tr>`).join("")}</tbody></table>`
        :`<p class="muted">${c.on?"还没刷到岗位。点「刷新」读取这家的在招岗位。":c.auto?"点「监控」后，平台刷新时会读取这家的在招岗位。":"这家的岗位列表需要先在官网上选项目或职能。"}</p>`}
      ${!c.auto?`<div class="fix"><label for="rdFixUrl">筛好后的岗位列表页网址</label><div><input class="inp" id="rdFixUrl" placeholder="打开官网，选好项目和职能，复制地址栏"><button class="btn sm" onclick="rdFix('${k}')">保存并监控</button></div></div>`:""}
    </div>
    ${cur?`<div class="dt-side"><h3>为什么适合你</h3><p>${esc(cur.why||"")}</p>${(cur.roles||[]).length?`<h3>建议方向</h3><p>${cur.roles.map(esc).join("、")}</p>`:""}${cur.gate?`<h3>投递前核对</h3><p>${esc(cur.gate)}</p>`:""}</div>`:""}
    ${c.on?`<div class="dt-foot"><button class="btn sm ghost" onclick="rdUnwatch('${k}')">取消监控</button></div>`:""}
  </div>`;
}
function rdStatus(x){ return {review:"待你审核",skip:x.reason||"已跳过",ready:"值得投 · 简历已生成",opened:"网申已打开",filled:"网申已自动填写",submitted:"已投递",blocked:x.needs||"需要你处理",error:x.reason||"需要你处理"}[x.status]||"处理中"; }
function rdOpen(co){ RD.tab="co"; RD.open=co; go("radar"); }
/* 城市很多时只显示前 3 个，完整列表放在提示里 */
function rdCity(c){ const xs=String(c||"").split(/[、,，\s]+/).filter(Boolean).map(x=>x.replace(/^[^·]*·/,"").replace(/[市省]$/,"")); if(!xs.length) return "–"; const u=[...new Set(xs)]; return u.length>3?`<span title="${esc(u.join("、"))}">${esc(u.slice(0,3).join("、"))} 等 ${u.length} 地</span>`:esc(u.join("、")); }
function rdJobsHTML(jobs){
  const st={review:"待审核",good:"值得投",all:"全部",skip:"已跳过",needs:"需要处理",done:"已投递"};
  const is={review:x=>x.status==="review",good:x=>["ready","opened","filled"].includes(x.status),skip:x=>x.status==="skip",needs:x=>["blocked","error"].includes(x.status),done:x=>x.status==="submitted",all:()=>true};
  if(!jobs.length) return `<div class="empty-block"><h2>还没有发现岗位</h2><p>在「公司」里监控几家公司并刷新。平台会读取每个岗位的 JD，按你的经历打分，值得投的自动生成简历。</p><button class="btn" onclick="RD.tab='co';renderRadar()">选择公司</button></div>`;
  if(!RD.jstSet){ RD.jst=jobs.some(is.review)?"review":jobs.some(is.good)?"good":"all"; }
  let list=jobs.filter(is[RD.jst]||is.all);
  if(RD.jq) list=list.filter(x=>(x.company+x.role+(x.city||"")).toLowerCase().includes(RD.jq.toLowerCase()));
  const byScore=RD.jsort==="score";
  list.sort((a,b)=>byScore?(b.score||0)-(a.score||0):(b.found||"").localeCompare(a.found||""));
  return `<div class="toolbar">
    <div class="seg" role="group" aria-label="按结果筛选">${Object.entries(st).map(([k,n])=>`<button class="${RD.jst===k?"on":""}" onclick="RD.jst='${k}';RD.jstSet=1;renderRadar()">${n} <span class="num">${jobs.filter(is[k]).length}</span></button>`).join("")}</div>
    <label class="search">${qzIcon("search",15)}<input value="${esc(RD.jq)}" placeholder="搜公司、岗位、城市" aria-label="搜公司、岗位、城市" oninput="RD.jq=this.value;clearTimeout(RD._t);RD._t=setTimeout(()=>{renderRadar();const i=document.querySelector('.search input');i.focus();i.setSelectionRange(i.value.length,i.value.length)},250)"></label>
  </div>
  <div class="tbl-wrap"><table class="tbl"><thead><tr>
    <th class="hide-sm" aria-sort="${byScore?"none":"descending"}"><button onclick="RD.jsort='time';renderRadar()">发现${byScore?"":" ↓"}</button></th><th>公司</th><th>岗位</th><th class="hide-sm">城市</th>
    <th class="num" aria-sort="${byScore?"descending":"none"}"><button onclick="RD.jsort='score';renderRadar()">匹配${byScore?" ↓":""}</button></th><th>结果</th><th class="act"><span class="sr">操作</span></th></tr></thead><tbody>
  ${list.slice(0,300).map(x=>`<tr><td class="muted num nowrap hide-sm">${esc(rdAgo(x.found))}</td><td class="nowrap"><b>${esc(x.company)}</b></td><td>${x.url?`<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.role)}</a>`:esc(x.role)}</td><td class="muted hide-sm rd-city">${rdCity(x.city)}</td>
    <td class="num">${x.score!=null?`<span class="score ${x.score>=75?"hi":x.score>=55?"mid":""}">${x.score}</span>`:"–"}</td><td class="${is.good(x)?"":"muted"}">${esc(rdStatus(x))}</td>
    <td class="act">${x.status==="review"?`<button class="btn sm" onclick="go('auto')">去审核</button>`:x.status==="skip"?`<button class="btn sm ghost" onclick="apPromote('${x.id}');renderRadar()">还是要投</button>`:is.good(x)?`<button class="btn sm ghost" onclick="apAskAI('${x.id}')">问 AI</button><button class="btn sm" onclick="apOpen('${x.id}')">去网申</button>`:""}</td></tr>`).join("")||`<tr><td colspan="7" class="empty-cell">没有符合条件的岗位</td></tr>`}
  </tbody></table></div>`;
}
function rdWatch(co){ const c=rdCompanies().find(x=>x.co===co); if(!c) return; const A=apS();
  if(c.src){ c.src.on=true; } else A.sources.push({id:uid("s"),name:c.co+"校招",company:rdKey(c.co),url:c.url,on:true});
  save(); renderRadar(); toast(`已监控 ${c.co}，下次刷新会读取它的在招岗位`); }
function rdUnwatch(co){ const c=rdCompanies().find(x=>x.co===co); if(c&&c.src){ c.src.on=false; save(); renderRadar(); } }
function rdFix(co){ const url=(document.getElementById("rdFixUrl").value||"").trim(); if(!/^https?:\/\//.test(url)) return toast("粘贴完整网址（https:// 开头）");
  const c=rdCompanies().find(x=>x.co===co); const A=apS();
  if(c&&c.src){ c.src.url=url; c.src.on=true; } else A.sources.push({id:uid("s"),name:co+"校招",company:rdKey(co),url,on:true});
  save(); closeModal(); renderRadar(); toast("已保存，平台会用这个列表页刷新"); }
function rdAddCustom(){
  const co=(document.getElementById("rdNewCo").value||"").trim(), url=(document.getElementById("rdNewUrl").value||"").trim();
  if(!co) return toast("填公司名"); if(!/^https?:\/\//.test(url)) return toast("填完整的岗位列表页网址");
  apS().sources.push({id:uid("s"),name:co+"校招",company:co,url,on:true}); save(); renderRadar(); toast(`已添加 ${co}`);
}
function rdRefresh(co){
  const c=rdCompanies().find(x=>x.co===co); if(!c||!c.src) return;
  if(!apExtReady()) return agExtHelp();
  apRun({only:[c.src.id],noOpen:true});
}
function rdRefreshAll(){
  if(!apExtReady()) return agExtHelp();
  if(!apS().sources.some(s=>s.on)) return rdWatchAll();
  apRun({noOpen:true,full:true});
}
function rdVisible(){ const v=document.getElementById("v-radar"); return v&&v.classList.contains("on"); }
