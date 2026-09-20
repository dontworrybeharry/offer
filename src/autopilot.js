
/* =========================================================================
   自动投递：平台自己跑的循环
   岗位来源 → 插件在后台打开列表页收集岗位 → 逐个读取 JD → 规则打分 + 届别 / 城市 / 关键词筛选
   →（可选）AI 判断值不值得投、按 JD 改写要点、写求职动机 → 生成一页简历存历史
   → 插件打开网申页，你每进入一个表单页都自动填写 → 你检查后自己点提交 → 识别到「投递成功」自动记为已投递
   平台不会点「投递 / 提交」：秋招很多公司限制投递次数，投错无法撤回。
   ========================================================================= */
const AP={running:false,stop:false,step:"",log:[],tab:"ready",pending:{}};
function apS(){
  const d={sources:[],f:{minScore:60,include:"",exclude:"算法|研发|开发工程师|测试工程师|硬件|芯片|销售代表|客服|司机",cities:"",maxPerRun:60,perSource:15,srcPerRun:20,gradCheck:true},
    steps:{resume:false,open:false,ai:false,aiRewrite:false},hours:0,seen:{},queue:[],runs:[]};
  S.autopilot=S.autopilot||{};
  Object.keys(d).forEach(k=>{ if(S.autopilot[k]==null) S.autopilot[k]=d[k]; });
  Object.keys(d.f).forEach(k=>{ if(S.autopilot.f[k]==null) S.autopilot.f[k]=d.f[k]; });
  Object.keys(d.steps).forEach(k=>{ if(S.autopilot.steps[k]==null) S.autopilot.steps[k]=d.steps[k]; });
  S.autopilot.f.minScore=Math.max(80,Number(S.autopilot.f.minScore)||80);
  S.autopilot.steps.resume=false; S.autopilot.steps.open=false;
  { const f=S.autopilot.f||{}; if(f.maxPerRun===15&&f.perSource===5&&f.srcPerRun===8){ f.maxPerRun=60; f.perSource=15; f.srcPerRun=20; } }
  return S.autopilot;
}
function apExtVer(){ return document.documentElement.dataset.qzztExtVer||""; }
function apExtReady(){ return agExtOn()&&parseInt(apExtVer())>=2; }
function apItem(id){ return apS().queue.find(x=>x.id===id); }
function apNow(){ const d=new Date(); return String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0")+":"+String(d.getSeconds()).padStart(2,"0"); }
function apLog(text,kind){
  AP.log.push({t:apNow(),text,kind:kind||""}); AP.log=AP.log.slice(-300); AP.step=text;
  const box=document.getElementById("apLog"); if(box&&AP.tab==="log") box.innerHTML=apLogHTML();
  const st=document.getElementById("apStep"); if(st) st.textContent=text;
  const rs=document.getElementById("rdStep"); if(rs) rs.textContent=text;
}

/* ---------- 和插件通话 ---------- */
function apCall(cmd,args,timeout){
  return new Promise((resolve,reject)=>{
    const reqId="r"+Date.now()+Math.random().toString(36).slice(2,6);
    const t=setTimeout(()=>{ delete AP.pending[reqId]; reject(new Error("插件没有响应（"+cmd+"）：确认 Chrome 插件已启用，刷新本页面后再试")); },timeout||120000);
    AP.pending[reqId]=r=>{ clearTimeout(t); r.ok?resolve(r.result):reject(new Error(r.error||"插件出错")); };
    window.postMessage({source:"qzzt-page",type:"AP_REQ",reqId,cmd,args:args||{}},"*");
  });
}
window.addEventListener("message",e=>{
  const d=e.data||{}; if(d.source!=="qzzt-ext") return;
  if(d.type==="HELLO"&&d.ver){ document.documentElement.dataset.qzztExtVer=d.ver; if(apVisible()) renderAutopilot(); }
  if(d.type==="AP_RES"&&AP.pending[d.reqId]){ const f=AP.pending[d.reqId]; delete AP.pending[d.reqId]; f(d); }
  if(d.type==="AP_EVENTS"&&Array.isArray(d.events)) apOnEvents(d.events);
});
function apVisible(){ const v=document.getElementById("v-auto"); return v&&v.classList.contains("on"); }

/* ---------- 插件回报的事件 ---------- */
function apOnEvents(evs){
  let run=false, changed=false;
  evs.forEach(ev=>{
    if(ev.type==="RUN"){ run=true; return; }
    const it=apItem(ev.jobId); if(!it) return; changed=true;
    if(ev.type==="FILLED"){ it.status=it.status==="submitted"?it.status:"filled"; it.filled=[...new Set([...(it.filled||[]),...ev.fields])]; apLog(`${it.company} · ${it.role}：网申页已自动填写 ${ev.fields.length} 类字段`,"ok"); }
    if(ev.type==="NEEDS_YOU"){ it.needs=ev.reason==="captcha"?"网申页出现验证码，需要你手动完成":"网申页需要登录，登录后插件会继续自动填写"; apLog(`${it.company} · ${it.role}：${it.needs}`,"warn"); }
    if(ev.type==="SUBMITTED") apMarkSubmitted(it.id,true);
    if(ev.type==="CLOSED"&&it.status!=="submitted"){ it.tabId=null; if(it.status==="opened") it.status="ready"; }
  });
  window.postMessage({source:"qzzt-page",type:"AP_ACK",ids:evs.map(e=>e.id)},"*");
  if(changed){ save(); if(apVisible()) renderAutopilot(); }
  if(run&&apS().hours>0&&!AP.running) apRun({auto:true});
}

/* ---------- 判断一个岗位 ---------- */
function apRx(s){ s=(s||"").trim(); if(!s) return null; try{ return new RegExp(s.split(/[|｜,，、\s]+/).filter(Boolean).map(x=>x.replace(/[.*+?^${}()[\]\\]/g,"\\$&")).join("|"),"i"); }catch(e){ return null; } }
function apEvaluate(job){
  const A=apS(), f=A.f, text=job.role+"\n"+job.jd;
  const ex=apRx(f.exclude), inc=apRx(f.include), city=apRx(f.cities);
  if(ex&&ex.test(job.role)) return {pass:false,reason:`岗位名称含排除词「${job.role.match(ex)[0]}」`};
  if(inc&&!inc.test(text)) return {pass:false,reason:"不含你设置的关注关键词"};
  if(city&&(job.city||/(北京|上海|深圳|广州|杭州|成都|武汉|南京|西安|苏州|长沙|重庆|天津|厦门|香港)/.test(job.jd))&&!city.test(job.city+" "+job.jd)) return {pass:false,reason:`工作城市不在你的范围（${job.city||"JD 里的城市"}）`};
  if(f.gradCheck&&typeof RV_ELIG!=="undefined"){
    const el=RV_ELIG.find(x=>job.company&&(job.company.includes(x.co)||x.co.includes(job.company)));
    if(el){ const [st,lab]=rvEligOf(el,S.profile.degreeDate||""); if(st==="no") return {pass:false,reason:`届别窗口不符：${el.co} ${el.from} ~ ${el.to}，${lab}`}; }
  }
  RVFORCE={}; const a=rvAnalyze(job.company,job.role,job.jd);
  const risks=[];
  if(a.gradWarn) risks.push("JD 限定届别，提交前核对毕业时间口径");
  if(a.baseAbroad) risks.push("工作地可能在海外："+a.baseAbroad);
  a.skills.filter(s=>s.risk&&s.need).forEach(s=>risks.push(`${s.k} 要求熟练，你是「${s.mine}」`));
  const gaps=a.items.filter(x=>x.st==="gap").length;
  if(gaps) risks.push(`JD 里有 ${gaps} 条要求没有对应经历`);
  const ev=a.items.filter(x=>x.best).slice(0,2).map(x=>x.best.e.org.split("（")[0].split(" · ")[0]);
  const reason=`匹配度 ${a.score}（${rvVerdict(a.score)[0]}）· ${a.track.name.replace("版","")}${ev.length?" · 对得上："+[...new Set(ev)].join("、"):""}`;
  const dir=typeof QZ_DIRS!=="undefined"?QZ_DIRS.find(d=>d.id===apDirOfJob(job)):null;
  if(dir&&!dir.score){
    const hit=new RegExp(dir.kw).test(text);
    if(!hit) return {pass:false,score:a.score,track:dir.name,reason:`岗位内容和「${dir.name}」方向对不上`,risks};
    if(a.score<Math.max(80,f.minScore||80)) return {pass:false,score:a.score,track:dir.name,reason:`匹配度 ${a.score}，低于 80`,risks};
    return {pass:true,score:a.score,track:dir.name,reason:`${dir.name}岗位 · 匹配度 ${a.score} · 投递前到「届别与资格」核对报考条件`,risks:[...risks,...dir.checks.slice(0,2)]};
  }
  const min=Math.max(80,Number(f.minScore)||80);   // 经历与 JD 匹配度不到 80 的岗位不进入待审核
  if(a.score<min) return {pass:false,score:a.score,track:a.track.name,reason:`匹配度 ${a.score}，低于 ${min}`,risks};
  return {pass:true,score:a.score,track:a.track.name,reason,risks};
}
function apProfileBrief(){
  const L=[]; agEdu().forEach(e=>L.push(`教育：${e.org} ${e.role} ${e.period}`));
  L.push("学位授予："+(S.profile.degreeDate||"未填"));
  agLib().forEach(e=>L.push(`【${e.sec}】${e.org}｜${e.role}｜${e.period}：`+e.b.filter(b=>!b.need).map(b=>agT(b.h)).join("、")));
  agSkills().forEach(k=>L.push(`${k.h}：${k.t}`));
  return L.join("\n");
}
async function apAiJudge(it){
  const sys="你是严谨的校招求职顾问。只根据给出的求职者档案判断，不编造任何经历、数字或角色。只输出一个 JSON 对象，不要其他文字。";
  const user=`求职者档案：\n${apProfileBrief()}\n\n岗位：${it.company}｜${it.role}｜${it.city||""}\nJD：\n${it.jd.slice(0,3000)}\n\n平台规则打分：${it.reason}；风险：${(it.risks||[]).join("；")||"无"}\n\n请输出：{"apply":true或false,"reason":"一句话说明投或不投的理由","risks":["面试或网申要注意的点，最多3条"],"motive":"若 apply 为 true：写网申「为什么投递这个岗位」的回答，150 字以内，第一人称，只用档案里真实存在的经历，不写档案里没有的数字"}`;
  const j=agJSON(await agComplete(sys,user,1200));
  if(!j||typeof j.apply!=="boolean") throw new Error("AI 返回的格式不对");
  return j;
}
async function apAiRewrite(it){
  const sys="你是简历顾问。只能改写措辞让要点贴近 JD 的语言，不能添加原文没有的数字、项目、工具，不能把「参与 / 协助」拔高成「主导 / 负责」。只输出 JSON。";
  const user=`岗位：${it.company}｜${it.role}\nJD：\n${it.jd.slice(0,2500)}\n\n当前一页简历（每条要点有 id）：\n${JSON.stringify(agResumeView())}\n\n挑出最值得改的最多 4 条，输出：{"edits":[{"id":"要点 id","heading":"4 字左右小标题","text":"改写后的要点，长度与原文接近"}]}`;
  const j=agJSON(await agComplete(sys,user,1500));
  if(!j||!Array.isArray(j.edits)||!j.edits.length) return {accepted:0,rejected:0};
  const r=AG_RUN.rewrite_resume_bullets({company:it.company,role:it.role,jd:it.jd,edits:j.edits.slice(0,4)});
  const n=v=>typeof v==="number"?v:(v||[]).length;
  return {accepted:n(r.accepted),rejected:n(r.rejected)};
}

/* ---------- 生成简历、建投递记录 ---------- */
function apBuild(it){
  let a=S.apps.find(x=>x.phase!=="实习期"&&((it.url&&x.url===it.url)||(x.company===it.company&&x.role===it.role)));
  if(!a){ a={id:uid("a"),phase:"秋招",company:it.company,dept:"",role:it.role,city:it.city||"",channel:"官网",date:"",stage:"想投/收藏",result:"",jd:it.jd,url:it.url,note:`【${qzDay()} 自动投递发现】${it.reason}`}; S.apps.push(a); }
  if((a.jd||"").length<30) a.jd=it.jd;
  it.appId=a.id;
  RVAPP=a.id; RVMETA={url:it.url,channel:"官网",referral:"",deadline:a.deadline||"",city:it.city||""};
  RVFORCE={}; rvAnalyze(it.company,it.role,it.jd); rvBuild(it.company,it.role,it.jd);
  return a;
}
function apSaveResume(it,a){
  const h=rvHistSave(); if(!h) return null;
  h.appId=a.id; it.histId=h.id; a.resumeHist=h.id; a.match=RVJD.score; a.track=RVJD.track.name; a.resumeFile=h.file+".docx";
  if(it.motive){ a.note=(a.note?a.note+"\n\n":"")+`【网申回答 · ${qzDay()}】为什么投递：\n${it.motive}`; }
  save(); return h;
}
async function apResumeFile(h){
  const blob=rvDocxBlob(rvHistModel(h)); const buf=new Uint8Array(await blob.arrayBuffer());
  let s=""; for(let i=0;i<buf.length;i+=8192) s+=String.fromCharCode.apply(null,buf.subarray(i,i+8192));
  return {name:h.file+".docx",b64:btoa(s)};
}
async function apPrepare(it){
  const h=(S.resumeHist||[]).find(x=>x.id===it.histId);
  if(h&&it.company&&it.role){ RVFORCE={}; rvAnalyze(it.company,it.role,it.jd); }
  const profile=Object.assign(agFillData(),{motive:it.motive||""});
  const resume=h?await apResumeFile(h):null;
  const r=await apCall("prepare",{jobId:it.id,url:it.url,profile,resume},60000);
  it.tabId=r.tabId; it.status="opened"; save();
}

/* ---------- 主循环 ---------- */
async function apRun(opt){
  opt=opt||{}; const A=apS();
  if(AP.running) return;
  const all=A.sources.filter(s=>s.on&&s.url);
  const ext=apExtReady();
  if(!ext&&!all.some(s=>qzDirect(s.url))) return toast(agExtOn()?"插件版本太旧：重新加载 extension 文件夹后刷新本页":"自动刷岗需要 Chrome 插件，先安装并刷新本页");
  /* 轮流刷新：最久没看的来源排在前面，每轮只看其中几个，来源再多也不会一次把网站刷一遍 */
  /* 你手动点的刷新（full）：所有监控的公司都看，每家最多 50 个新岗位；定时刷新仍按设置轮流，避免频繁访问招聘网站 */
  const full=!!opt.full&&!opt.auto;
  let srcs=all.slice().sort((a,b)=>(a.last||"").localeCompare(b.last||"")).slice(0,(opt.all||full)?all.length:Math.max(1,A.f.srcPerRun||20));
  if(opt.only) srcs=A.sources.filter(s=>opt.only.includes(s.id));
  if(!all.length){ AP.tab="settings"; if(apVisible()) renderAutopilot(); return toast("先添加至少一个岗位来源"); }
  const useAI=A.steps.ai&&agReady();
  AP.running=true; AP.stop=false; AP.tab="log"; if(apVisible()) renderAutopilot();
  const run={at:new Date().toISOString(),found:0,fresh:0,matched:0,ready:0,blocked:0,auto:!!opt.auto};
  apLog(full?`开始全量刷新：${srcs.length} 家公司，每家最多读 50 个新岗位（读过的跳过）${useAI?"，AI 参与判断":""}`:`开始一轮：轮到 ${srcs.length} / ${all.length} 个来源，每轮最多看 ${A.f.maxPerRun} 个新岗位${useAI?"，AI 参与判断":""}`,"head");
  let budget=full?Infinity:A.f.maxPerRun;
  try{
    for(const src of srcs){
      if(AP.stop||budget<=0) break;
      AP.curSrc=src.id; if(typeof rdVisible==="function"&&rdVisible()) renderRadar();
      const direct=qzDirect(src.url);
      let r;
      if(direct){
        apLog(`读取「${src.name}」（${direct}接口，后端直读）…`);
        try{
          const seen=Object.keys(A.seen).filter(k=>{ try{ return new URL(k).host===new URL(src.url).host; }catch(e){ return false; } }).slice(-3000);
          const d=await qzApi("/jobs/fetch",{method:"POST",body:JSON.stringify({url:src.url,max:full?1000:300,skip:seen,grad_year:qzGradYear()})});
          r={links:(d.jobs||[]).map(j=>({url:j.url,text:j.title,jd:j.jd,city:j.city,direct:true}))};
        }catch(e){ apLog(`「${src.name}」读取失败：${e.message}`,"err"); continue; }
      }else{
        if(!ext){ apLog(`「${src.name}」需要 Chrome 插件，这次跳过`,"warn"); continue; }
        apLog(`打开「${src.name}」收集岗位…`);
        try{ r=await apCall("scan",{url:src.url,max:full?120:Math.max(budget*2,10)},600000); }
        catch(e){ apLog(`「${src.name}」打开失败：${e.message}`,"err"); continue; }
      }
      if(r.blocked){ run.blocked++; src.needs=r.blocked==="captcha"?"出现验证码":"需要登录"; apLog(`「${src.name}」${src.needs}：在 Chrome 里打开这个网址手动处理一次，下一轮会继续`,"warn"); continue; }
      src.needs=""; src.last=new Date().toISOString();
      const oldLinks=(r.links||[]).filter(l=>A.seen[l.url.split("#")[0]] && A.queue.some(q=>q.url===l.url.split("#")[0]&&["skip","error"].includes(q.status)));
      const newLinks=(r.links||[]).filter(l=>!A.seen[l.url.split("#")[0]]);
      const links=[...oldLinks,...newLinks];
      src.total=(r.links||[]).length; src.newN=links.length;
      let perSrc=direct?(full?1000:300):full?50:Math.max(1,A.f.perSource||15);   // 后端直读不用逐个打开网页，数量不设小上限
      run.found+=(r.links||[]).length;
      apLog(`「${src.name}」找到 ${(r.links||[]).length} 个岗位，其中新的 ${links.length} 个`);
      for(const l of links){
        if(AP.stop||budget<=0||perSrc<=0) break;
        if(!l.direct) budget--; perSrc--; run.fresh++;
        const key=l.url.split("#")[0]; A.seen[key]=qzDay();
        let job;
        if(l.direct) job={jd:l.jd||"",city:l.city||"",company:""};
        else{
          apLog(`读取：${l.text}`);
          try{ job=await apCall("extract",{url:l.url},90000); }
          catch(e){ apLog(`读取失败：${e.message}`,"err"); continue; }
        }
        const it={id:uid("q"),found:new Date().toISOString(),url:l.url,src:src.id,company:src.company||job.company||"",role:(l.text||job.role||"").slice(0,40),city:job.city||"",jd:job.jd||"",at:new Date().toISOString(),status:"",risks:[]};
        if(!it.company) it.company=(new URL(l.url)).hostname.replace(/^www\./,"");
        A.queue.unshift(it);
        if(job.blocked){ it.status="blocked"; it.needs=job.blocked==="captcha"?"岗位页出现验证码":"岗位页需要登录"; run.blocked++; apLog(`${it.role}：${it.needs}`,"warn"); save(); continue; }
        if(l.direct&&it.jd.length<80){ it.status="skip"; it.reason="官网没有提供 JD（多为海外或英文岗位），点原链接查看"; continue; }
        if(it.jd.length<80){ it.status="error"; it.reason="没读到完整 JD"; apLog(`${it.role}：没读到完整 JD，放进「需要你处理」`,"warn"); save(); continue; }
        const ev=apEvaluate(it); Object.assign(it,{score:ev.score,track:ev.track,reason:ev.reason,risks:ev.risks||[]});
        if(!ev.pass){ it.status="skip"; if(l.direct) it.jd=""; else apLog(`跳过 ${it.role}：${ev.reason}`); continue; }   // 跳过的岗位不存 JD，省空间（点原链接可以看）
        if(useAI){
          try{ apLog(`AI 判断 ${it.role}…`); const j=await apAiJudge(it);
            it.ai=j.reason; if(Array.isArray(j.risks)) it.risks=[...it.risks,...j.risks.map(x=>"AI："+x)].slice(0,6);
            if(!j.apply){ it.status="skip"; it.reason="AI 判断不建议投："+j.reason; apLog(`跳过 ${it.role}：${it.reason}`); save(); continue; }
            it.motive=(j.motive||"").trim();
          }catch(e){ apLog(`AI 判断失败，按规则继续：${e.message}`,"warn"); }
        }
        run.matched++; it.status="review"; run.review=(run.review||0)+1;
        save(); apLog(`✓ ${it.company} · ${it.role}：${it.reason}，已放入待审核，不会自动投递`,"ok");
        save(); if(apVisible()&&AP.tab!=="log") renderAutopilot();
      }
      save(); if(typeof rdVisible==="function"&&rdVisible()) renderRadar();
    }
  }finally{
    if(apExtReady()) try{ await apCall("done",{},15000); }catch(e){}
    const keys=Object.keys(A.seen); if(keys.length>3000) keys.slice(0,keys.length-3000).forEach(k=>delete A.seen[k]);
    A.lastRun=run.at; A.runs.unshift(run); A.runs=A.runs.slice(0,30);
    { const keep=A.queue.filter(x=>x.status!=="skip"), sk=A.queue.filter(x=>x.status==="skip"); A.queue=[...keep.slice(0,600),...sk.slice(0,Math.max(0,1500-Math.min(600,keep.length)))].sort((a,b)=>String(b.found||"").localeCompare(String(a.found||""))); }
    AP.running=false; AP.curSrc=""; save(); if(typeof rdVisible==="function"&&rdVisible()) renderRadar();
    const msg=`看了 ${run.fresh} 个新岗位，匹配 ${run.matched} 个，${run.ready} 个已备好等你提交${run.blocked?`，${run.blocked} 处需要你登录或验证`:""}`;
    apLog((AP.stop?"已停止：":"本轮完成：")+msg,"head");
    if(run.ready||run.blocked) apCall("notify",{title:"Offer · 自动刷岗",message:msg},10000).catch(()=>{});
    if(apVisible()) renderAutopilot();
  }
}
function apStop(){ AP.stop=true; apLog("收到停止指令，处理完当前岗位就停","warn"); }

/* 不用插件也能跑的部分：把看板里「想投/收藏」且有 JD 的岗位，按同样规则判断、生成简历 */
async function apProcessBoard(){
  const A=apS(), useAI=A.steps.ai&&agReady();
  const apps=S.apps.filter(a=>a.phase!=="实习期"&&a.stage==="想投/收藏"&&(a.jd||"").length>=80&&!a.resumeHist);
  if(!apps.length) return toast("看板里没有待处理的岗位（想投/收藏、有 JD、还没生成简历）");
  AP.running=true; AP.tab="log"; renderAutopilot(); apLog(`处理看板里的 ${apps.length} 个想投岗位`,"head");
  let ok=0;
  for(const a of apps){
    if(AP.stop) break;
    const it={id:uid("q"),url:a.url||"",company:a.company,role:a.role,city:a.city||"",jd:a.jd,at:new Date().toISOString(),status:"",risks:[],fromBoard:true};
    A.queue.unshift(it);
    const ev=apEvaluate(it); Object.assign(it,{score:ev.score,track:ev.track,reason:ev.reason,risks:ev.risks||[]});
    if(!ev.pass){ it.status="skip"; apLog(`跳过 ${it.company} · ${it.role}：${ev.reason}`); continue; }
    if(useAI){ try{ const j=await apAiJudge(it); it.ai=j.reason; it.motive=(j.motive||"").trim(); if(!j.apply){ it.status="skip"; it.reason="AI 判断不建议投："+j.reason; apLog(`跳过 ${it.company} · ${it.role}：${it.reason}`); continue; } }catch(e){ apLog("AI 判断失败，按规则继续："+e.message,"warn"); } }
    const app=apBuild(it);
    if(useAI&&A.steps.aiRewrite){ try{ await apAiRewrite(it); }catch(e){} }
    apSaveResume(it,app); it.status="ready"; ok++;
    apLog(`✓ ${it.company} · ${it.role}：${it.reason}，简历已生成`,"ok");
  }
  AP.running=false; AP.stop=false; save(); apLog(`完成：${ok} 个岗位已备好简历`,"head"); renderAutopilot();
}

/* ---------- 手动操作 ---------- */
async function apOpen(id){
  const it=apItem(id); if(!it) return;
  if(!it.url) return toast("这个岗位没有投递链接，去投递看板补上");
  if(apExtReady()){
    if(it.tabId){ const r=await apCall("focus",{tabId:it.tabId}).catch(()=>({ok:false})); if(r.ok) return; }
    try{ await apPrepare(it); toast("已打开，页面加载后自动填写"); await apCall("focus",{tabId:it.tabId}); }catch(e){ toast(e.message); }
  } else window.open(it.url,"_blank","noopener");
  renderAutopilot();
}
async function apOpenAll(){
  const list=apS().queue.filter(x=>x.status==="ready"&&x.url&&!x.tabId);
  if(!list.length) return toast("没有需要打开的网申页");
  if(!apExtReady()) return toast("需要 Chrome 插件");
  toast(`正在打开 ${list.length} 个网申页…`);
  for(const it of list){ try{ await apPrepare(it); }catch(e){ toast(e.message); break; } }
  renderAutopilot();
}
function apMarkSubmitted(id,auto){
  const it=apItem(id); if(!it) return;
  it.status="submitted"; it.submittedAt=new Date().toISOString(); it.tabId=null;
  const a=S.apps.find(x=>x.id===it.appId);
  if(a){ if(a.stage==="想投/收藏") a.stage="已投递"; a.date=a.date||qzDay();
    const h=(S.resumeHist||[]).find(x=>x.id===it.histId);
    if(h){ a.resumeHist=h.id; a.resumeText=rvModelText(rvHistModel(h)); a.resumeFile=h.file+".docx"; }
    if(!/【.*投递】/.test(a.note||"")) a.note=(a.note?a.note+"\n":"")+`【${a.date} 投递】${auto?"插件识别到投递成功":"你确认已提交"}，匹配度 ${it.score||""}`; }
  save(); apLog(`${it.company} · ${it.role}：${auto?"识别到投递成功，":""}已记为已投递`,"ok");
  if(!auto) toast("已记为已投递，投递看板同步更新");
  if(apVisible()) renderAutopilot();
}
function apDismiss(id){ const it=apItem(id); if(!it) return; it.status="dismissed"; save(); renderAutopilot(); }
function apPromote(id){
  const it=apItem(id); if(!it) return;
  if((it.jd||"").length<80) return toast("没有完整 JD：打开岗位页复制 JD，用「简历工作台」生成");
  const a=apBuild(it); apSaveResume(it,a); it.status="ready"; it.reason=(it.reason||"")+"（你手动加入）"; save(); AP.tab="ready"; renderAutopilot(); toast("已生成简历，放进「待你提交」");
}
function apAccept(id){
  const it=apItem(id); if(!it) return;
  if((it.jd||"").length<80) return toast("没有完整 JD，暂时不能生成对齐简历");
  const a=apBuild(it); apSaveResume(it,a); it.status="ready"; save(); AP.tab="ready"; renderAutopilot(); toast("已加入投递，并生成对应 JD 简历");
}
function apEditResume(id){ const it=apItem(id); if(!it||!it.histId) return; go("resume"); RVHIST=it.histId; renderResumeHome(); }

/* ---------- 设置 ---------- */
function apSet(path,val){ const A=apS(); const [a,b]=path.split("."); if(b) A[a][b]=val; else A[a]=val; save(); }
function apAddSource(){
  const g=id=>(document.getElementById(id)||{}).value||"";
  let url=g("apSrcUrl").trim(), name=g("apSrcName").trim(), company=g("apSrcCo").trim();
  if(!/^https?:\/\//.test(url)) return toast("填完整的网址（https:// 开头）");
  if(!name) name=company?company+"校招":(new URL(url)).hostname;
  apS().sources.push({id:uid("s"),name,company,url,on:true}); save(); renderAutopilot(); toast("已添加来源");
}
function apPreset(i){
  const x=RV_ELIG[i]; if(!x) return;
  const el=id=>document.getElementById(id);
  el("apSrcCo").value=x.co; el("apSrcName").value=x.co+"校招"; el("apSrcUrl").value=x.url;
  window.open(x.url,"_blank","noopener");
  toast("官网已打开：筛选好岗位类别和城市后，把地址栏的网址粘到「列表页网址」再添加");
}
async function apSchedule(h){
  apSet("hours",+h);
  if(apExtReady()){ try{ await apCall("schedule",{hours:+h}); toast(+h?`已开启：每 ${apEvery(+h)}自动刷新一次（Chrome 开着就会运行）`:"已关闭定时"); }catch(e){ toast(e.message); } }
  else toast("定时需要 Chrome 插件");
}
function apResetSeen(){ if(!confirm("清空「看过的岗位」记录？下一轮会把来源里的岗位重新看一遍。")) return; apS().seen={}; save(); renderAutopilot(); toast("已清空"); }

/* ---------- 页面 ---------- */
function apLogHTML(){ return AP.log.length?AP.log.slice().reverse().map(l=>`<div class="apx-log ${l.kind}"><span>${l.t}</span><div>${esc(l.text)}</div></div>`).join(""):'<div class="muted">还没有运行记录</div>'; }
function apCard(it){
  let acts="";
  if(it.status==="review") acts=`<button class="btn sm pri" onclick="apAccept('${it.id}')">加入投递</button><button class="btn sm ghost" onclick="apDismiss('${it.id}')">不考虑</button>`;
  if(["ready","opened","filled"].includes(it.status)) acts=`<button class="btn sm ${it.status==="ready"?"pri":""}" onclick="apOpen('${it.id}')">${it.status==="ready"?"打开网申":"再次打开"}</button><button class="btn sm ghost" onclick="apMarkSubmitted('${it.id}',false)">我已提交</button><button class="btn sm ghost" onclick="apDismiss('${it.id}')">不投了</button>`;
  if(it.status==="blocked"||it.status==="error") acts=`<button class="btn sm" onclick="apPromote('${it.id}')">重试</button><button class="btn sm ghost" onclick="apDismiss('${it.id}')">忽略</button>`;
  if(it.status==="submitted"&&it.histId) acts=`<button class="btn sm ghost" onclick="apEditResume('${it.id}')">投递用的简历</button>`;
  const state={review:"待审核",ready:"简历已生成",opened:"网申页已打开",filled:"已自动填写",submitted:"已投递",blocked:"需要处理",error:"需要处理"}[it.status]||"";
  const why=String(it.reason||"").replace(/^匹配度\s*\d+[^·]*·\s*/,"").trim();
  const risks=(it.status==="skip"?[]:(it.risks||[])).slice(0,3), needs=it.needs||((it.status==="error"||it.status==="blocked")?it.reason:"");
  const sc=it.score, cls=sc>=90?"hi":sc>=80?"ok":"lo";
  const more=[it.histId?`<button class="lnk" onclick="apEditResume('${it.id}')">看简历</button>`:"",`<button class="lnk" onclick="apAskAI('${it.id}')">问 AI</button>`,it.url?`<a class="lnk" href="${esc(it.url)}" target="_blank" rel="noopener">岗位原文</a>`:""].filter(Boolean).join("");
  return `<li class="job qj">
    <div class="qj-score ${cls}" title="经历与 JD 的匹配度">${sc!=null?`<b class="num">${sc}</b><span>匹配</span>`:"<b>–</b>"}</div>
    <div class="qj-main">
      <div class="qj-t"><b>${esc(it.company)}</b><span>${esc(it.role)}</span></div>
      <div class="qj-f">${[it.city&&esc(String(it.city).split(/[、,]/).slice(0,3).join("、")),state&&`<span class="qj-st s-${it.status}">${state}</span>`,it.found&&esc(typeof rdAgo==="function"?rdAgo(it.found):"")].filter(Boolean).join('<i aria-hidden="true">·</i>')}</div>
      ${why&&it.status!=="skip"?`<p class="qj-why">${esc(why)}</p>`:""}
      ${needs?`<p class="qj-need">${esc(needs)}</p>`:""}
      ${risks.length?`<div class="qj-risk">${risks.map(r=>`<span>${esc(r)}</span>`).join("")}</div>`:""}
      ${(it.filled||[]).length&&it.status!=="submitted"?`<p class="qj-why">已自动填写：${esc(it.filled.join("、"))}。下拉框和日期请检查。</p>`:""}
      ${it.motive&&it.status!=="skip"&&it.status!=="submitted"?`<details class="job-d"><summary>AI 写的「为什么投递」</summary><p>${esc(it.motive)}</p><button class="btn sm ghost" onclick="navigator.clipboard.writeText(apItem('${it.id}').motive).then(()=>toast('已复制'))">复制</button></details>`:""}
      <div class="qj-more">${more}</div>
    </div>
    <div class="job-a qj-a">${acts}</div></li>`;
}
function renderAutopilot(){
  const box=document.getElementById("autoHome"); if(!box) return;
  const A=apS(), Q=A.queue, ext=apExtReady(), ai=agReady();
  const by=s=>Q.filter(x=>(Array.isArray(s)?s:[s]).includes(x.status));
  const review=by("review"), ready=by(["ready","opened","filled"]), needs=by(["blocked","error"]), skip=by("skip"), done=by("submitted");
  const last=A.runs[0];
  const fresh=Q.filter(x=>x.found&&Date.now()-new Date(x.found).getTime()<864e5&&x.status!=="dismissed");
  if(AP.tab==="feed"||AP.tab==="skip") AP.tab="ready";
  const tabs=[["review",`待审核 ${review.length}`],["ready",`待你提交 ${ready.length}`],["needs",`需要你处理 ${needs.length}`],["done",`已投递 ${done.length}`],["log","运行日志"],["settings","设置"]];
  const list=AP.tab==="review"?review:AP.tab==="ready"?ready:AP.tab==="needs"?needs:AP.tab==="skip"?skip:AP.tab==="done"?done:null;
  const empty={review:"匹配到的岗位会先放在这里，由你决定是否加入投递。",ready:"还没有备好的岗位。请先在待审核中选择岗位。",needs:"没有需要你处理的。",skip:"没有跳过的岗位。",done:"还没有通过自动投递提交的岗位。"}[AP.tab];
  AP._first=ready[0];
  const nextAt=last&&A.hours>0?qzTime(new Date(new Date(last.at).getTime()+A.hours*3600e3).toISOString()).slice(11):"";
  box.innerHTML=`
  <header class="pg-h"><div><h1>岗位队列</h1><p>审核新岗位，生成简历，打开网申。</p>
    <p>${ext?"Chrome 插件已连接":"未连接 Chrome 插件"} · ${ai?(A.steps.ai?`AI 参与判断（${esc(agPName(agProvider()))}）`:"AI 已连接，未参与判断"):"只用规则判断"} · 监控 ${A.sources.filter(s=>s.on).length} 家公司${last?` · 上次刷新 ${esc(qzTime(last.at).slice(11))}，新岗位 ${last.fresh}、备好 ${last.ready}`:""}${nextAt?`，下次约 ${esc(nextAt)}`:""}</p></div>
    <div class="pg-act">
      ${AP.running?`<span class="run-note" role="status" id="apStep">${esc(AP.step)}</span><button class="btn" onclick="apStop()">停止</button>`
        :`<label class="inline-sel">自动刷新 <select class="inp" onchange="apSchedule(this.value)">${[[0,"关闭"],[0.5,"每 30 分钟"],[1,"每 1 小时"],[3,"每 3 小时"],[6,"每 6 小时"],[12,"每 12 小时"],[24,"每天"]].map(([v,n])=>`<option value="${v}" ${+A.hours===v?"selected":""}>${n}</option>`).join("")}</select></label>
          <button class="btn" onclick="apProcessBoard()" title="不需要插件：把看板里想投的岗位批量判断并生成简历">处理看板岗位</button>
          <button class="btn pri" onclick="apRun({full:true})">立即刷新全部</button>`}
    </div></header>
  ${ext?"":`<p class="notice">${qzIcon("data",16)}<span>${typeof qzDirect==="function"&&A.sources.some(x=>x.on&&qzDirect(x.url))?"腾讯、快手、网易等由后端直读的公司不需要插件；其他公司刷新和网申填写需要 Chrome 插件。":"刷新岗位和网申填写需要 Chrome 插件。"}<a href="javascript:agExtHelp()">安装方法</a></span></p>`}
  <nav class="tabs" role="tablist">${tabs.map(([k,n])=>`<button role="tab" aria-selected="${AP.tab===k}" class="${AP.tab===k?"on":""}" onclick="AP.tab='${k}';renderAutopilot()">${n}</button>`).join("")}</nav>
  ${list?(list.length?`<ul class="jobs">${list.map(apCard).join("")}</ul>`:`<div class="empty-block"><p>${empty}</p>${AP.tab==="ready"?`<button class="btn" onclick="go('radar')">去职位雷达选公司</button>`:""}</div>`):""}
  ${AP.tab==="ready"&&ready.some(x=>!x.tabId&&x.url)&&ready.length>1?`<div class="list-foot"><button class="btn sm ghost" onclick="apOpenAll()">打开全部 ${ready.length} 个网申页</button></div>`:""}
  ${AP.tab==="feed"?apFeedHTML():""}
  ${AP.tab==="log"?`<div class="log" id="apLog">${apLogHTML()}</div>`:""}
  ${AP.tab==="settings"?apSettingsHTML():""}`;
}
function apSettingsHTML(){
  const A=apS(), f=A.f, ai=agReady();
  const presets=(typeof RV_ELIG!=="undefined"?RV_ELIG:[]).map((x,i)=>[x,i]).filter(([x])=>x.url);
  return `<div class="grid g2 apx-set">
  <div class="card pad" style="grid-column:1/-1;display:flex;align-items:center;gap:14px;flex-wrap:wrap"><div style="flex:1;min-width:240px"><div class="rvx-h" style="margin:0 0 2px">监控哪些公司</div><div class="muted">在「职位雷达」里浏览 ${apSites().length} 家公司、点「监控」。这里只管筛选规则和自动化程度。</div></div><button class="btn pri" onclick="go('radar')">打开职位雷达</button></div>
  <div class="card pad">
    <div class="rvx-h">岗位来源</div>
    <div class="rvx-note" style="margin:0 0 10px">填公司校招官网或招聘网站的<b>岗位列表页</b>（先在网站上筛好职能和城市，再复制地址栏）。需要登录的网站，先在 Chrome 里登录一次。</div>
    ${A.sources.length?A.sources.map((s,i)=>`<div class="apx-src">
      <label class="rvx-switch"><input type="checkbox" ${s.on?"checked":""} onchange="apS().sources[${i}].on=this.checked;save()"></label>
      <div><b>${esc(s.name)}</b>${s.needs?` <span class="tag t-orange">${esc(s.needs)}</span>`:""}${s.last?` <span class="muted" style="font-size:12px">${esc(qzTime(s.last).slice(5))} 刷新 · 列表 ${s.total||0} 个 · 新 ${s.newN||0}</span>`:""}<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.url)}</a></div>
      <button class="btn sm" onclick="apS().sources.splice(${i},1);save();renderAutopilot()">删除</button></div>`).join(""):'<div class="muted" style="margin-bottom:8px">还没有来源</div>'}
    <div class="apx-add">
      <input class="inp" id="apSrcCo" placeholder="公司（写进简历文件名和看板）">
      <input class="inp" id="apSrcName" placeholder="来源名称（可不填）">
      <input class="inp" id="apSrcUrl" placeholder="列表页网址 https://…">
      <button class="btn pri" onclick="apAddSource()">添加</button>
    </div>
    ${presets.length?`<div class="rvx-note" style="margin-top:10px">常见校招官网（点开后筛选，再把网址粘回来）：</div><div class="apx-pre">${presets.map(([x,i])=>`<button class="btn sm" onclick="apPreset(${i})">${esc(x.co)}</button>`).join("")}</div>`:""}
  </div>
  <div class="card pad">
    <div class="rvx-h">筛选条件</div>
    <div class="apx-fs">
      <label>最低匹配度</label><input class="inp" type="number" min="80" max="100" value="${Math.max(80,f.minScore)}" onchange="this.value=Math.max(80,Math.min(100,+this.value||80));apSet('f.minScore',+this.value)">
      <label>每轮最多看几个新岗位</label><input class="inp" type="number" min="1" max="80" value="${f.maxPerRun}" onchange="apSet('f.maxPerRun',Math.max(1,+this.value||15))">
      <label>每个来源每轮最多几个</label><input class="inp" type="number" min="1" max="30" value="${f.perSource}" onchange="apSet('f.perSource',Math.max(1,+this.value||5))">
      <label>每轮轮到几个来源</label><input class="inp" type="number" min="1" max="80" value="${f.srcPerRun}" onchange="apSet('f.srcPerRun',Math.max(1,+this.value||8))">
      <label>关注关键词</label><input class="inp" value="${esc(f.include)}" placeholder="留空 = 不限，如：产品|运营|分析|海外" onchange="apSet('f.include',this.value)">
      <label>排除（岗位名称）</label><input class="inp" value="${esc(f.exclude)}" onchange="apSet('f.exclude',this.value)">
      <label>城市</label><input class="inp" value="${esc(f.cities)}" placeholder="留空 = 不限，如：深圳|上海|广州" onchange="apSet('f.cities',this.value)">
    </div>
    <label class="rvx-switch" style="margin-top:8px"><input type="checkbox" ${f.gradCheck?"checked":""} onchange="apSet('f.gradCheck',this.checked)"> 按学位授予日期排除届别窗口不符的公司</label>
    <div class="rvx-h" style="margin-top:16px">自动做到哪一步</div>
    <label class="rvx-switch"><input type="checkbox" ${A.steps.resume?"checked":""} onchange="apSet('steps.resume',this.checked)"> 为匹配的岗位生成一页简历（存进历史简历）</label>
    <label class="rvx-switch"><input type="checkbox" ${A.steps.open?"checked":""} onchange="apSet('steps.open',this.checked)"> 在 Chrome 里打开网申页，并在每个表单页自动填写、附上这份简历</label>
    <label class="rvx-switch"><input type="checkbox" ${A.steps.ai?"checked":""} ${ai?"":"disabled"} onchange="apSet('steps.ai',this.checked);renderAutopilot()"> AI 复核值不值得投，并写「为什么投递」${ai?"":`（先在 <a href="javascript:go('agent')">AI 助手</a> 连接）`}</label>
    <label class="rvx-switch"><input type="checkbox" ${A.steps.aiRewrite?"checked":""} ${ai&&A.steps.ai?"":"disabled"} onchange="apSet('steps.aiRewrite',this.checked)"> AI 按 JD 改写简历要点（仍受防编造拦截）</label>
    <div class="rvx-note" style="margin-top:10px">最后的「投递 / 提交」始终由你来点：很多公司限制投递次数，投错无法撤回。插件识别到「投递成功」页面后会自动记进投递看板。</div>
    <button class="btn sm" style="margin-top:10px" onclick="apResetSeen()">清空看过的岗位（${Object.keys(A.seen).length}）</button>
  </div></div>`;
}
function apEvery(h){ return h<1?Math.round(h*60)+" 分钟":h===24?"天":h+" 小时"; }
/* 平台打开时：如果定时刷新错过了（电脑睡眠、Chrome 关过），插件连上后补跑一轮 */
function apCatchUp(){
  const A=apS(); if(!(A.hours>0)||AP.running||!apExtReady()||!A.sources.some(s=>s.on)) return;
  const last=A.lastRun?new Date(A.lastRun).getTime():0;
  if(Date.now()-last>=A.hours*3600e3){ apLog("距离上次刷新已超过设定间隔，补跑一轮","head"); apRun({auto:true}); }
}
window.addEventListener("message",e=>{ const d=e.data||{}; if(d.source==="qzzt-ext"&&d.type==="HELLO"&&d.ver) setTimeout(apCatchUp,3000); });
if(/#autopilot-run/.test(location.hash)) setTimeout(()=>{ if(apS().hours>0) { go("auto"); apRun({auto:true}); } },2500);

/* ---------- 最新岗位动态 ---------- */
function apFeedHTML(){
  const A=apS(), list=A.queue.filter(x=>x.found&&x.status!=="dismissed").sort((a,b)=>b.found.localeCompare(a.found)).slice(0,120);
  if(!list.length) return `<div class="card pad muted">还没有发现岗位。去「设置 → 来源库」添加公司，点「立即跑一轮」或开启自动刷新。</div>`;
  const lab={skip:["已跳过","t-gray"],ready:["待你提交","t-blue"],opened:["网申已打开","t-blue"],filled:["已自动填写","t-blue"],submitted:["已投递","t-green"],blocked:["需要你处理","t-orange"],error:["需要你处理","t-orange"]};
  let day="";
  return `<div class="card pad apx-feed">${list.map(x=>{
    const d=qzTime(x.found), h=d.slice(0,10)!==day?`<div class="apx-day">${(day=d.slice(0,10))===qzDay()?"今天":day}</div>`:"";
    const [ln,lc]=lab[x.status]||["处理中","t-gray"], isNew=Date.now()-new Date(x.found).getTime()<864e5;
    return h+`<div class="apx-fi"><span class="apx-ft">${d.slice(11)}</span><b>${esc(x.company)}</b><span class="apx-fr">${x.url?`<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.role)}</a>`:esc(x.role)}</span>${isNew?'<i class="apx-new">新</i>':""}${x.city?`<span class="muted">${esc(x.city)}</span>`:""}${x.score!=null?`<span class="muted">匹配 ${x.score}</span>`:""}<span class="tag ${lc}">${ln}</span>${x.status==="skip"?`<button class="btn sm" onclick="apPromote('${x.id}')">还是要投</button>`:""}</div>`;
  }).join("")}</div>`;
}

/* ---------- 来源库：内置校招官网 + 线上更新 ---------- */
const AP_REMOTE="https://dontworrybeharry.github.io/campus-job-copilot/sites.json";
let AP_LIBCAT="全部";
function apDirOfJob(job){
  const site=apSites().find(x=>job.company&&rdMatch(x.co,job.company));
  return site&&typeof qzDirOf==="function"?qzDirOf(site.cat):"biz";
}
/* 后端能直接读取的招聘系统：以后端 /api/jobs/sources/direct 为准（启动时拉取），这里是离线时的备份 */
let QZ_DIRECT=[[/^https?:\/\/([^/]+\.(jobs\.feishu\.cn|jobs\.f\.mioffice\.cn)|campus\.dewu\.com)(\/|$)/i,"飞书招聘"],[/^https?:\/\/([^/]+\.zhiye\.com|hr-campus\.vivo\.com)(\/|$)/i,"北森"],[/^https?:\/\/join\.qq\.com(\/|$)/i,"腾讯招聘"],[/^https?:\/\/campus\.kuaishou\.cn(\/|$)/i,"快手校招"],[/^https?:\/\/campus(\.game)?\.163\.com(\/|$)/i,"网易校招"],[/^https?:\/\/jobs\.mihoyo\.com(\/|$)/i,"米哈游招聘"],[/^https?:\/\/(talent\.antgroup\.com|www\.ant-intl\.com)(\/|$)/i,"蚂蚁招聘"],[/^https?:\/\/lifeattiktok\.com(\/|$)/i,"TikTok 招聘"],[/^https?:\/\/(leihuo\.163\.com|xiaozhao\.leihuo\.netease\.com)(\/|$)/i,"网易雷火"]];
async function qzDirectSync(){ try{ const xs=await qzApi("/jobs/sources/direct"); if(Array.isArray(xs)&&xs.length) QZ_DIRECT=xs.map(x=>[new RegExp(x.pattern,"i"),x.system]); }catch(e){} }
setTimeout(()=>{ if(typeof QZ_BACKEND!=="undefined"&&QZ_BACKEND.online) qzDirectSync().then(()=>{ if(typeof rdVisible==="function"&&rdVisible()) renderRadar(); }); },1500);
/* 这个来源能不能由本机后端直接读取（不开网页、不用插件） */
function qzDirect(url){ if(typeof QZ_BACKEND==="undefined"||!QZ_BACKEND.online) return ""; const m=QZ_DIRECT.find(([re])=>re.test(url||"")); return m?m[1]:""; }
function qzGradYear(){ const d=(S.profile&&S.profile.degreeDate)||""; const y=parseInt(String(d).slice(0,4)); return y?(+String(d).slice(5,7)>=8?y+1:y):null; }
function apSites(){
  const base=[...(typeof QZ_SITES!=="undefined"?QZ_SITES:[]),...(typeof QZ_DIR_SITES!=="undefined"?QZ_DIR_SITES:[])], rem=(apS().remote||{}).sites||[];
  const m=new Map(); [...base,...rem].forEach(x=>{ if(x&&x.co&&x.url) m.set(x.co,x); });
  return [...m.values()];
}
async function apRefreshSites(force){
  const A=apS(), r=A.remote||{};
  if(!force&&r.at&&Date.now()-new Date(r.at).getTime()<864e5) return;
  try{
    const res=await fetch(AP_REMOTE+"?t="+Date.now(),{cache:"no-store"}); if(!res.ok) throw new Error(res.status);
    const j=await res.json(); if(!Array.isArray(j.sites)) throw new Error("格式不对");
    A.remote={at:new Date().toISOString(),ver:j.updated||"",sites:j.sites}; save();
    if(force){ toast(`来源库已更新：${j.sites.length} 家（${j.updated||""}）`); renderAutopilot(); }
  }catch(e){ A.remote=Object.assign({},r,{at:new Date().toISOString()}); save(); if(force) toast("暂时连不上线上来源库，先用内置的"); }
}
function apHasSite(x){ return apS().sources.some(s=>s.url===x.url||s.company===x.co); }
function apAddSite(co){
  const x=apSites().find(v=>v.co===co); if(!x) return;
  const A=apS();
  if(apHasSite(x)){ A.sources=A.sources.filter(s=>!(s.url===x.url||s.company===x.co)); }
  else A.sources.push({id:uid("s"),name:x.co+"校招",company:x.co.split(" / ")[0],url:x.url,on:true});
  save(); renderAutopilot();
}
function apAddCat(cat){
  const A=apS(), add=apSites().filter(x=>(cat==="全部"||x.cat===cat)&&x.auto!==false&&!apHasSite(x));
  add.forEach(x=>A.sources.push({id:uid("s"),name:x.co+"校招",company:x.co.split(" / ")[0],url:x.url,on:true}));
  save(); renderAutopilot(); toast(add.length?`已添加 ${add.length} 家`:"这一类已经全部添加");
}
function apLibraryHTML(){
  const A=apS(), sites=apSites(), cats=["全部",...new Set(sites.map(x=>x.cat))];
  const list=sites.filter(x=>AP_LIBCAT==="全部"||x.cat===AP_LIBCAT);
  const ver=(A.remote&&A.remote.ver)||(typeof QZ_SITES_VER!=="undefined"?QZ_SITES_VER:"");
  return `<div class="apx-libh"><div class="rvx-h" style="margin:0">来源库 · ${sites.length} 家</div>
      <span class="muted" style="font-size:12px">${ver?`更新于 ${esc(ver)}`:""}</span>
      <button class="btn sm" onclick="apRefreshSites(true)">检查更新</button>
      <button class="btn sm pri" onclick="apAddCat(AP_LIBCAT)">添加「${esc(AP_LIBCAT)}」里能自动收集的</button></div>
    <div class="rvx-note" style="margin:4px 0 8px">点公司加入 / 移出监控。<b>绿色</b>：实测能自动收集岗位；<b>橙色</b>：页面需要先在网站上选职能或登录，点开后筛好，再把列表页网址加到下面的「岗位来源」。</div>
    <div class="apx-cats">${cats.map(c=>`<button class="${c===AP_LIBCAT?"on":""}" onclick="AP_LIBCAT='${esc(c)}';renderAutopilot()">${esc(c)} ${c==="全部"?sites.length:sites.filter(x=>x.cat===c).length}</button>`).join("")}</div>
    <div class="apx-lib">${list.map(x=>{ const on=apHasSite(x);
      return `<button class="apx-co ${on?"on":""} ${x.auto===false?"man":"auto"}" title="${esc(x.note||x.url)}" onclick="${x.auto===false&&!on?`window.open('${esc(x.url)}','_blank','noopener');toast('这家需要先在官网筛选或登录：筛好后把列表页网址加到「岗位来源」')`:`apAddSite('${esc(x.co)}')`}">${on?"✓ ":""}${esc(x.co)}</button>`; }).join("")}</div>`;
}
setTimeout(()=>{ try{ apRefreshSites(false); }catch(e){} },4000);

/* 把某个岗位交给 AI 助手：判断风险、准备网申开放题和面试 */
function apAskAI(id){
  const it=apItem(id); if(!it) return;
  agAsk(`帮我准备这个岗位：先说匹配度和最大的风险，再写网申「为什么投递」（150 字内，只用我的真实经历），最后给 5 道最可能的面试题和回答要点。${it.appId?"岗位记录 id："+it.appId+"\n":""}公司：${it.company}\n岗位：${it.role}\nJD：\n${(it.jd||"").slice(0,3000)}`);
}
