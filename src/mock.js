
/* =========================================================================
   Mock 面试评分（两个版本共用）
   · 带评分要点的题库：宝洁八大问、通用行为面、结构化面试（考公 / 国企）、测评练习（北森风格原创题，有标准答案）
   · 提交后自动评分：
       测评题：对照标准答案判对错
       开放题：规则评分（结构 / 证据 / 要点覆盖 / 结果与反思，满分 100），只看写法，不判断经历真假
       已连接 AI：再按评分要点逐题点评（命中、缺失、怎么改）
   · 题目为本平台原创整理，不是任何公司或测评机构的真题
   ========================================================================= */
const MK_BANK=[
 /* ---- 宝洁八大问（行为面试经典框架；评分看：目标难度、个人行动、困难应对、量化结果、复盘） ---- */
 ...[
  ["pg1","描述一个你给自己定下有挑战的目标并最终达成的经历。","目标为什么有挑战（基线 vs 目标）|拆解计划与里程碑|你本人的关键行动|遇到的最大困难及如何克服|可量化的结果|复盘：学到什么","目标|挑战|计划|拆解|困难|结果|提升|达成"],
  ["pg2","举一个你在团队中主动承担领导角色、推动大家完成重要任务的例子。","你不是被指派而是主动站出来|如何统一目标与分工|如何调动不同意见的成员|推进中的关键决策|团队结果与你的贡献|复盘","主动|分工|推动|协调|意见|决策|团队|结果"],
  ["pg3","描述一次你需要收集信息、找出关键问题并提出解决方案的经历。","问题背景与影响|信息来源（数据、访谈、调研）|如何从信息里定位根因|方案与取舍|执行后的效果|复盘","信息|数据|调研|原因|根因|方案|分析|效果"],
  ["pg4","举例说明你如何用事实和数据说服他人、推动一个决定。","当时各方立场|你收集了什么事实和数据|如何组织论据、预判反对意见|最终决定与结果|对你的启发","数据|事实|说服|论据|反对|决定|结果"],
  ["pg5","讲一次你与背景、立场不同的人合作完成目标的经历。","差异具体是什么|你如何理解对方的目标|建立信任 / 沟通的具体做法|分歧如何解决|合作结果","合作|沟通|分歧|理解|信任|目标|结果"],
  ["pg6","描述一个你提出新想法并对结果产生重要影响的例子。","原来的做法和问题|你的新想法从哪里来|如何验证 / 说服他人采用|落地过程|带来的可量化改变","创新|想法|改进|验证|落地|提升|效果"],
  ["pg7","讲一次你在资源或时间有限时，评估形势、确定优先级并行动的经历。","约束条件（时间、人、钱）|你用什么标准排优先级|放弃了什么、为什么|执行与结果|复盘","优先级|时间|资源|取舍|判断|执行|结果"],
  ["pg8","举例说明你为了完成目标，快速学习一项新技能或新知识。","为什么需要学|学习方法与节奏|如何检验学会了|用在了哪里、带来什么结果|迁移到别的场景","学习|掌握|方法|练习|应用|结果"],
 ].map(([id,q,rub,kw])=>({id:"mk-"+id,co:"经典题库",track:"宝洁八大问",round:"一面",type:"行为面",q,rubric:rub.split("|"),kw:kw.split("|"),hint:"STAR：情境 → 任务 → 你的行动（占一半篇幅）→ 可量化结果 → 复盘。评分看："+rub.split("|").join("、")+"。"})),
 /* ---- 通用行为面 ---- */
 ...[
  ["b1","请用 1 分钟做个自我介绍。","一句话定位（我是谁、想做什么）|两段最相关的经历，各带一个事实或数字|能力关键词|为什么适合这个岗位","我是|经历|负责|能力|岗位|数字"],
  ["b2","为什么选择我们公司和这个岗位？","对公司业务的具体了解（产品、数据、近期动态）|岗位要做什么|你的经历 / 能力与岗位的对应|长期动机","业务|产品|岗位|经历|匹配|发展"],
  ["b3","讲一次你失败的经历，你从中学到了什么？","真实的失败，不是伪装的优点|你的责任占多少|当时如何止损|具体学到了什么|之后如何改进并验证","失败|原因|责任|改进|学到|之后"],
  ["b4","你最大的缺点是什么？","真实且与岗位不致命的缺点|具体例子|正在采取的改进措施|改进的效果","缺点|例子|改进|现在|效果"],
  ["b5","讲一次你在高压或截止时间很紧的情况下完成任务的经历。","压力来源与时间|如何拆解和排优先级|情绪与沟通管理|结果与复盘","压力|截止|优先级|拆解|沟通|结果"],
  ["b6","你未来 3 到 5 年的职业规划是什么？","短期（1 年）具体目标|中期能力积累|与公司 / 岗位成长路径的对应|已经在做的准备","规划|目标|能力|岗位|准备"],
 ].map(([id,q,rub,kw])=>({id:"mk-"+id,co:"经典题库",track:"通用行为面",round:"一面",type:"行为面",q,rubric:rub.split("|"),kw:kw.split("|"),hint:"评分看："+rub.split("|").join("、")+"。"})),
 /* ---- 结构化面试（考公 / 国企 / 银行；按常见评分要素） ---- */
 ...[
  ["s1","综合分析","近年来不少年轻人选择「慢就业」，毕业后不急于工作。对此你怎么看？","明确表态|多角度分析原因（个人、家庭、社会、政策）|辩证看待利弊|提出可操作的对策|落到自身","观点|原因|一方面|另一方面|对策|建议|我"],
  ["s2","计划组织","单位让你组织一次面向社区老年人的防电信诈骗宣传活动，你会怎么做？","明确目的和对象|前期调研（常见骗局、老人需求）|活动形式与内容设计|人员分工与资源|应急预案|效果评估与后续","调研|目的|形式|分工|预案|宣传|总结|反馈"],
  ["s3","应急应变","你在窗口值班，一位群众因材料不全无法办理而情绪激动、大声吵闹，你怎么处理？","先稳定情绪、维持秩序|耐心倾听并解释政策|给出可行的补救办法|事后反思与流程改进","安抚|倾听|解释|政策|办法|秩序|改进"],
  ["s4","人际关系","你提出的方案在会上被同事当众否定，而你认为自己的方案更好，你怎么办？","保持冷静、以工作为重|先反思自身方案不足|会后私下沟通了解原因|用事实完善方案|以团队结果为目标","冷静|反思|沟通|理解|完善|团队"],
 ].map(([id,dim,q,rub,kw])=>({id:"mk-"+id,co:"经典题库",track:"结构化面试",round:"结构化",type:dim,q,rubric:rub.split("|"),kw:kw.split("|"),hint:"常见评分要素："+rub.split("|").join("、")+"。答题时先亮观点 / 目标，再分点展开，最后落到自己的做法。"})),
 /* ---- 测评练习（北森等在线测评的常见题型；原创题，有标准答案） ---- */
 ...[
  ["t1","数字推理","2，6，12，20，30，（ ）",["40","42","44","48"],1,"相邻两项差为 4、6、8、10，下一个差 12，30+12=42。也可看作 n(n+1)。"],
  ["t2","数字推理","3，7，15，31，（ ）",["62","63","64","65"],1,"每项 ×2+1：31×2+1=63。"],
  ["t3","数字推理","2，3，5，9，17，（ ）",["31","32","33","34"],2,"差为 1、2、4、8，下一个差 16，17+16=33。"],
  ["t4","数字推理","100，81，64，49，（ ）",["35","36","38","40"],1,"依次为 10²、9²、8²、7²，下一项 6²=36。"],
  ["t5","资料分析","某公司 2025 年营收 120 亿元，同比增长 20%，则 2024 年营收约为多少亿元？",["96","100","104","144"],1,"基期 = 现期 ÷ (1+增长率) = 120 ÷ 1.2 = 100。常见错误是用 120×(1−20%)=96。"],
  ["t6","资料分析","某平台用户数 2024 年为 500 万，2025 年为 650 万，增长率是多少？",["23%","30%","35%","150%"],1,"(650−500) ÷ 500 = 30%。"],
  ["t7","资料分析","某部门支出占总支出的 25%，总支出 480 万元；另一部门比它多 30 万元，另一部门支出是多少万元？",["120","140","150","160"],2,"480×25%=120，120+30=150。"],
  ["t8","逻辑判断","所有参加培训的人都通过了考核，小王没有通过考核。由此可以推出：",["小王参加了培训","小王没有参加培训","有人参加培训但没通过","无法判断"],1,"「参加培训 → 通过考核」，逆否命题：没通过 → 没参加。"],
  ["t9","逻辑判断","如果明天下雨，比赛就取消。比赛没有取消。由此可以推出：",["明天下雨了","明天没有下雨","明天可能下雨","无法判断"],1,"否定后件推出否定前件：比赛没取消 → 没下雨。"],
  ["t10","言语理解","他做事一向______，接到任务当天就拿出了方案。",["优柔寡断","雷厉风行","犹豫不决","瞻前顾后"],1,"「当天就拿出方案」说明做事果断迅速，选「雷厉风行」。"],
 ].map(([id,ty,q,opts,ans,why])=>({id:"mk-"+id,co:"经典题库",track:"测评练习",round:"在线测评",type:ty,q,options:opts,answer:ans,why,hint:"单选题。选完后提交时自动判分，并给出解析。"})),
];

/* ---------- 把题库并进 Mock 的题源 ---------- */
function mkEnsureBank(){
  if(typeof S==="undefined"||!S) return;
  const q=S.questions; if(!Array.isArray(q)) return;
  const have=new Set(q.map(x=>x.id)); MK_BANK.forEach(x=>{ if(!have.has(x.id)) q.push(x); });
}
function mkQ(id){ return MK_BANK.find(x=>x.id===id)||((S.questions||[]).find(x=>x.id===id))||{}; }

/* ---------- 规则评分：只看写法和要点覆盖 ---------- */
function mkRuleScore(q,ans){
  const t=String(ans||"").trim();
  if(q.options) { const pick="ABCD".indexOf(t.slice(0,1)); const ok=pick===q.answer;
    return {score:pick<0?0:ok?100:0,by:"key",ok,pick,dims:[],hits:[],misses:[],tip:q.why||""}; }
  if(!t) return {score:0,by:"rule",dims:[],hits:[],misses:q.rubric||[],tip:"没有作答。"};
  const n=t.replace(/\s/g,"").length;
  const first=(t.split(/[。！？\n]/)[0]||"");
  const enumerate=/(首先|其次|最后|第一|第二|一是|二是|1[.、）)]|2[.、）)])/.test(t);
  const star=[/(当时|背景|那时|情境)/,/(任务|目标|负责|需要)/,/(我(先|就|于是|主动|提出|设计|组织|推动|分析|整理|联系|协调|搭建|负责))/,/(结果|最终|最后|提升|增长|达成|完成|实现)/].filter(r=>r.test(t)).length;
  const nums=(t.match(/\d+(\.\d+)?\s*(%|万|千|百|个|人|天|周|次|倍|家|条|篇|亿|元)?/g)||[]).length;
  const acts=(t.match(/我(先|就|于是|主动|提出|设计|组织|推动|分析|整理|联系|协调|搭建|负责|发现|决定|说服|复盘)/g)||[]).length;
  const kw=q.kw||[], hitKw=kw.filter(k=>t.includes(k));
  const reflect=/(学到|反思|复盘|如果重来|下次|意识到|收获|改进)/.test(t);
  const structural=q.track==="结构化面试";
  const dS=Math.min(25,(first.length&&first.length<=60?8:3)+(enumerate?9:0)+(structural?0:star*2)+(structural&&/(我认为|我觉得|我会|首先)/.test(first)?6:0));
  const dE=Math.min(25,(structural?Math.min(15,hitKw.length*3):Math.min(12,nums*4))+Math.min(13,acts*4));
  const dK=kw.length?Math.round(30*Math.min(1,hitKw.length/Math.max(3,Math.ceil(kw.length*0.6)))):15;
  const dR=Math.min(20,(reflect?10:0)+(/(结果|最终|提升|增长|达成|实现|效果)/.test(t)?10:0));
  let score=dS+dE+dK+dR;
  if(n<80) score=Math.min(score,40); else if(n>900) score-=8;
  score=Math.max(0,Math.min(100,Math.round(score)));
  const misses=[];
  if(!(first.length&&first.length<=60)) misses.push("开头没有一句话亮明结论 / 观点");
  if(!structural&&star<3) misses.push("情境、任务、行动、结果没讲全");
  if(!structural&&nums===0) misses.push("没有任何数字或可验证的事实");
  if(!structural&&acts<2) misses.push("「我」具体做了什么讲得太少");
  if(!reflect) misses.push("缺少复盘或反思");
  if(n<80) misses.push("太短（不到 80 字），面试里通常要讲 1–2 分钟");
  if(n>900) misses.push("太长，控制在 2 分钟以内");
  const hits=[]; if(enumerate) hits.push("分点清楚"); if(nums) hits.push(`有 ${nums} 处数字 / 事实`); if(acts>=2) hits.push("个人行动具体"); if(reflect) hits.push("有复盘");
  if(hitKw.length) hits.push("覆盖要点词："+hitKw.slice(0,6).join("、"));
  return {score,by:"rule",dims:[["结构",dS,25],["证据",dE,25],["要点覆盖",dK,30],["结果与反思",dR,20]],hits,misses,tip:""};
}
async function mkAiScore(q,ans){
  const sys="你是严格、公正的校招面试官。只根据题目、评分要点和候选人回答打分，不替候选人编造经历。只输出一个 JSON 对象。";
  const user=`题目：${q.q}\n评分要点：${(q.rubric||[]).join("；")}\n候选人回答：\n${String(ans).slice(0,2500)}\n\n输出：{"score":0到100的整数,"hits":["答到的要点，最多4条"],"misses":["缺失或薄弱的要点，最多4条"],"tip":"最关键的一条修改建议，60字以内"}`;
  const j=agJSON(await agComplete(sys,user,600));
  if(!j||typeof j.score!=="number") throw new Error("AI 返回格式不对");
  return {score:Math.max(0,Math.min(100,Math.round(j.score))),hits:j.hits||[],misses:j.misses||[],tip:j.tip||""};
}
function mkAvg(rec){ const xs=(rec.items||[]).filter(i=>i.ev&&i.ans&&i.ans.trim()).map(i=>(i.ev.ai?i.ev.ai.score:i.ev.score)); return xs.length?Math.round(xs.reduce((a,b)=>a+b,0)/xs.length):null; }
function mkLevel(s){ return s==null?["未评分",""]:s>=80?["优秀","ok"]:s>=65?["良好","ok"]:s>=50?["及格","warn"]:["需加强","bad"]; }

/* ---------- 作答页：测评题显示选项 ---------- */
function mkPick(i){ const el=document.getElementById("mkAns"); el.value="ABCD"[i]; document.querySelectorAll("#mkOpts button").forEach((b,k)=>b.classList.toggle("on",k===i)); }
function mkDecorate(){
  if(!MK) return; const q=mkQ(MK.qs[MK.i].id), ta=document.getElementById("mkAns"); if(!ta) return;
  let box=document.getElementById("mkOpts"); if(box) box.remove();
  const lab=document.querySelector('label[for="mkAns"]')||ta.previousElementSibling;
  if(q.options){
    ta.style.display="none"; if(lab&&lab.tagName==="LABEL") lab.style.display="none";
    const cur="ABCD".indexOf((ta.value||"").slice(0,1));
    ta.insertAdjacentHTML("beforebegin",`<div id="mkOpts" class="mk-opts" role="radiogroup" aria-label="选项">${q.options.map((o,i)=>`<button type="button" role="radio" aria-checked="${i===cur}" class="${i===cur?"on":""}" onclick="mkPick(${i})"><b>${"ABCD"[i]}</b>${esc(o)}</button>`).join("")}</div>`);
  }else{ ta.style.display=""; if(lab&&lab.tagName==="LABEL") lab.style.display=""; }
}

/* ---------- 提交：评分 + 报告 ---------- */
async function mkFinish(){
  clearInterval(mkTimerId);
  const rec={id:uid("m"),date:new Date().toLocaleString("zh-CN"),meta:MK.meta,mins:Math.max(1,Math.round((Date.now()-MK.start)/60000)),items:MK.items};
  rec.items.forEach(it=>{ it.ev=mkRuleScore(mkQ(it.id),it.ans); });
  S.mocks.push(rec); save();
  document.getElementById("mockRun").style.display="none";
  const rep=document.getElementById("mockReport"); rep.style.display=""; rep.innerHTML=reportHTML(rec); window.scrollTo({top:0});
  if(typeof renderDash==="function") try{ renderDash(); }catch(e){}
  const ai=typeof agReady==="function"&&agReady();
  if(!ai) return;
  const open=rec.items.filter(it=>!mkQ(it.id).options&&it.ans&&it.ans.trim());
  for(let k=0;k<open.length;k++){
    const it=open[k]; const st=document.getElementById("mkAiState"); if(st) st.textContent=`AI 正在点评第 ${k+1} / ${open.length} 题…`;
    try{ it.ev.ai=await mkAiScore(mkQ(it.id),it.ans); }catch(e){ it.ev.aiErr=e.message; }
    save(); if(document.getElementById("mockReport").style.display!=="none") rep.innerHTML=reportHTML(rec);
  }
  const st=document.getElementById("mkAiState"); if(st) st.textContent="";
}
function mkEvalHTML(it){
  const q=mkQ(it.id), ev=it.ev||mkRuleScore(q,it.ans);
  if(q.options){
    const pick="ABCD".indexOf(String(it.ans||"").slice(0,1));
    return `<div class="mk-ev"><p><span class="ap-badge ${ev.ok?"ok":"bad"}">${pick<0?"未作答":ev.ok?"正确":"错误"}</span> 你的选择：${pick<0?"—":"ABCD"[pick]+"．"+esc(q.options[pick])} · 正确答案：${"ABCD"[q.answer]}．${esc(q.options[q.answer])}</p><p class="muted">${esc(q.why||"")}</p></div>`;
  }
  const s=ev.ai?ev.ai.score:ev.score, [lv,cls]=mkLevel(it.ans&&it.ans.trim()?s:null);
  return `<div class="mk-ev">
    <p class="mk-ev-h"><b class="num">${it.ans&&it.ans.trim()?s:"—"}</b><span class="ap-badge ${cls}">${lv}</span><span class="muted">${ev.ai?"AI 按评分要点打分":"规则评分：只看结构、证据和要点覆盖"}</span></p>
    ${(ev.dims||[]).length&&it.ans&&it.ans.trim()?`<ul class="mk-dims">${ev.dims.map(([n,v,m])=>`<li><span>${n}</span><i><b style="width:${Math.round(v/m*100)}%"></b></i><em class="num">${v}/${m}</em></li>`).join("")}</ul>`:""}
    ${ev.ai?`${ev.ai.hits.length?`<p><b>答到了：</b>${ev.ai.hits.map(esc).join("；")}</p>`:""}${ev.ai.misses.length?`<p class="mk-miss"><b>缺失：</b>${ev.ai.misses.map(esc).join("；")}</p>`:""}${ev.ai.tip?`<p><b>怎么改：</b>${esc(ev.ai.tip)}</p>`:""}`
      :`${ev.hits.length?`<p><b>做得好：</b>${ev.hits.map(esc).join("；")}</p>`:""}${ev.misses.length?`<p class="mk-miss"><b>要改：</b>${ev.misses.map(esc).join("；")}</p>`:""}`}
    ${ev.aiErr?`<p class="muted">AI 点评失败：${esc(ev.aiErr)}</p>`:""}
    ${(q.rubric||[]).length?`<details><summary>评分要点</summary><ol>${q.rubric.map(r=>`<li>${esc(r)}</li>`).join("")}</ol></details>`:""}
  </div>`;
}
function mkReport(rec){
  const avg=mkAvg(rec), [lv,cls]=mkLevel(avg);
  const objs=rec.items.filter(i=>mkQ(i.id).options), right=objs.filter(i=>i.ev&&i.ev.ok).length;
  const answered=rec.items.filter(i=>i.ans&&i.ans.trim()).length;
  const ai=typeof agReady==="function"&&agReady();
  return `<header class="pg-h"><div><h1>Mock 报告</h1>
      <p>${esc(rec.meta.co)} · ${esc(rec.meta.track)} · ${esc(rec.meta.round)} · ${esc(rec.date)} · 用时约 ${rec.mins} 分钟 · 作答 ${answered}/${rec.items.length} 题${objs.length?` · 测评题答对 ${right}/${objs.length}`:""}</p></div>
      <div class="pg-act"><button class="btn" onclick="backToMockSetup()">再来一轮</button><button class="btn pri" onclick="window.print()">存为 PDF</button></div></header>
    <section class="mk-sum"><div><span class="muted">综合得分</span><b class="num">${avg==null?"—":avg}</b><span class="ap-badge ${cls}">${lv}</span></div>
      <p class="muted" id="mkAiState">${ai?"":"现在是规则评分：检查结构、证据、要点覆盖和复盘，不判断内容真假。连接 AI 后会按评分要点逐题点评。"}</p></section>
    <ol class="mk-items">${rec.items.map((i,n)=>`<li><h3>${n+1}. ${esc(i.q)}</h3>
      ${mkQ(i.id).options?"":`<div class="ablock"><h4 class="h5">你的回答</h4><div class="body">${nl2(i.ans)||'<span class="muted">未作答</span>'}</div></div>`}
      ${mkEvalHTML(i)}
      ${mkQ(i.id).options?"":`<details><summary>参考框架</summary><p>${nl2(mkQ(i.id).hint||"—")}</p></details>`}</li>`).join("")}</ol>`;
}
function mkHistory(){
  const box=document.getElementById("mockHistory"); if(!box) return;
  const h=[...(S.mocks||[])].reverse();
  box.innerHTML=h.length?`<table class="tbl"><thead><tr><th>时间</th><th>题源</th><th class="num">题数</th><th class="num">得分</th><th class="act"><span class="sr">操作</span></th></tr></thead><tbody>${h.map(m=>{ const a=mkAvg(m); return `<tr><td class="nowrap">${esc(m.date)}</td><td>${esc(m.meta.co)} · ${esc(m.meta.track)}</td><td class="num">${m.items.length}</td><td class="num">${a==null?"—":a}</td><td class="act"><button class="btn sm" onclick="viewMock('${m.id}')">查看</button><button class="btn sm ghost" onclick="delMock('${m.id}')">删除</button></td></tr>`; }).join("")}</tbody></table>`
    :`<p class="muted">还没有记录。选好题源开始第一轮，提交后自动评分。</p>`;
}

/* ---------- 开始页：题库卡片（一键开始），自定义筛选收进折叠区 ---------- */
const MK_TRACK_INFO={"宝洁八大问":["star","经典行为面试，STAR 结构"],"通用行为面":["agent","自我介绍、失败经历、职业规划"],"结构化面试":["reviews","考公 / 国企 / 银行常见题型"],"测评练习":["data","数字推理、资料分析、逻辑，自动判分"]};
function mkQuick(track){
  mkEnsureBank(); const pool=(S.questions||[]).filter(q=>track==="__weak"?false:(q.track===track));
  if(!pool.length) return toast("这个题库还没有题");
  const n=Math.min(track==="测评练习"?10:8,pool.length), list=[...pool].sort(()=>Math.random()-.5).slice(0,n);
  const t=document.getElementById("mkTime"); if(t) t.value=track==="测评练习"?"90":"150";
  startMockWith(list,{co:"经典题库",track,round:track==="测评练习"?"在线测评":"一面"});
}
function mkDecorateSetup(){
  const setup=document.getElementById("mockSetup"); if(!setup) return;
  mkEnsureBank();
  const qs=S.questions||[], tracks=[...new Set(qs.map(q=>q.track).filter(Boolean))];
  const order=["宝洁八大问","通用行为面","结构化面试","测评练习"], rest=tracks.filter(t=>!order.includes(t)).sort((a,b)=>qs.filter(q=>q.track===b).length-qs.filter(q=>q.track===a).length).slice(0,4);
  const cards=[...order.filter(t=>tracks.includes(t)),...rest];
  const hist=S.mocks||[], last=hist[hist.length-1], la=last?mkAvg(last):null;
  const dims={}; hist.slice(-5).forEach(m=>(m.items||[]).forEach(i=>((i.ev&&i.ev.dims)||[]).forEach(([n,v,mx])=>{ if(i.ans&&i.ans.trim()){ dims[n]=dims[n]||[0,0]; dims[n][0]+=v/mx; dims[n][1]++; } })));
  const weak=Object.entries(dims).map(([n,[a,c]])=>[n,Math.round(a/c*100)]).sort((a,b)=>a[1]-b[1]);
  let box=document.getElementById("mkTracks");
  if(!box){ box=document.createElement("div"); box.id="mkTracks"; const ph=setup.querySelector(".pagehead"); (ph||setup.firstChild).after?ph.after(box):setup.prepend(box); }
  box.innerHTML=`${weak.length?`<section class="mk-weak"><div><b>最近 5 轮</b>${la!=null?`<span>上一轮 ${la} 分</span>`:""}</div><ul>${weak.map(([n,v])=>`<li><span>${esc(n)}</span><i><b style="width:${v}%"></b></i><em class="num">${v}%</em></li>`).join("")}</ul><p class="muted">${weak[0][1]<60?`最弱的是「${esc(weak[0][0])}」，下一轮重点练。`:"各项都在及格线以上。"}</p></section>`:""}
    <div class="sec-row"><h2 class="sec-h">选一个题库开始</h2><span class="muted">每轮 8 题，限时作答，提交后自动评分</span></div>
    <div class="mk-cards">${cards.map((t,i)=>{ const n=qs.filter(q=>q.track===t).length, info=MK_TRACK_INFO[t]||["bank",qs.filter(q=>q.track===t).map(q=>q.co).filter((x,j,a)=>x&&a.indexOf(x)===j).slice(0,3).join("、")+" 面经"];
      return `<button class="td-card ${i===0?"is-lead":""}" onclick="mkQuick('${esc(t)}')"><span class="td-ic">${qzIcon(info[0],18)}</span><span class="td-tx"><b>${esc(t)} <span class="num mk-n">${n} 题</span></b><span>${esc(info[1])}</span></span>${qzIcon("arrow",16)}</button>`; }).join("")}</div>`;
  const sel=document.getElementById("mkCompany"), form=sel&&(sel.closest(".mk-setup")||sel.closest(".card"));
  if(form&&!form.closest("details.mk-custom")){ const d=document.createElement("details"); d.className="mk-custom"; d.innerHTML="<summary>自定义组合：按公司、方向、轮次、题型筛选</summary>"; form.parentNode.insertBefore(d,form); d.appendChild(form); }
  const hc=document.getElementById("mockHistory"), card=hc&&hc.closest(".card"); if(card) card.classList.add("mk-histcard");
}

/* 覆盖原来的实现（放在页面全部脚本加载之后） */
(function(){
  const apply=()=>{
    window.finishMock=mkFinish; window.reportHTML=mkReport; window.renderMockHistory=mkHistory;
    const os=window.showQ; if(typeof os==="function"&&!os.__mk){ const w=function(){ const r=os.apply(this,arguments); mkDecorate(); return r; }; w.__mk=true; window.showQ=w; }
    const ol=window.load; if(typeof ol==="function"&&!ol.__mk){ const w=function(){ const r=ol.apply(this,arguments); mkEnsureBank(); return r; }; w.__mk=true; window.load=w; }
    const of=window.fillMockSelects; if(typeof of==="function"&&!of.__mk){ const w=function(){ mkEnsureBank(); const r=of.apply(this,arguments); try{ mkDecorateSetup(); }catch(e){} return r; }; w.__mk=true; window.fillMockSelects=w; }
    mkEnsureBank();
  };
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",apply); else apply();
})();
