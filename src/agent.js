
/* =========================================================================
   AI 助手：直接调用大模型接口（免费的智谱 GLM / Gemini，低价的 DeepSeek，或 Claude / ChatGPT），让模型通过「工具」操作平台本身
   —— 读经历、分析 JD、生成与改写简历、整理网申字段、管理投递、检查届别。
   · API Key 只存在本机浏览器（单独的 localStorage 键，不进备份文件）
   · 请求从浏览器直接发往 Anthropic / OpenAI，不经过任何第三方服务器
   · 所有改写仍经过平台的真实性拦截（不加原文没有的数字、不拔高角色）
   ========================================================================= */
const AG_KEYS="qzzt_ai_keys_v1";
const AG_PROVIDERS={
  zhipu:{name:"智谱 GLM",badge:"免费",base:"https://open.bigmodel.cn/api/paas/v4",defModel:"glm-4-flash",models:["glm-4-flash","glm-4-flash-250414","glm-4.5-flash","glm-4-plus"],keyHint:"一串字母数字，中间有一个点",console:"https://open.bigmodel.cn/usercenter/apikeys",
    tip:"手机号注册即可，国内网络直接用。GLM-4-Flash 免费调用；免费模型能力比 Claude / GPT 弱，复杂任务可以分几步让它做。"},
  gemini:{name:"Gemini",badge:"免费额度",base:"https://generativelanguage.googleapis.com/v1beta/openai",defModel:"gemini-2.5-flash",models:["gemini-2.5-flash","gemini-2.5-pro"],keyHint:"AIza…",console:"https://aistudio.google.com/apikey",
    tip:"用 Google 账号在 AI Studio 免费创建，每天有次数上限；国内需要能访问 Google 的网络。免费额度下 Google 可能用对话内容改进产品。"},
  deepseek:{name:"DeepSeek",badge:"低价",base:"https://api.deepseek.com",defModel:"deepseek-chat",models:["deepseek-chat"],keyHint:"sk-…",console:"https://platform.deepseek.com/api_keys",
    tip:"手机号注册，支付宝 / 微信充值，按用量计费，价格很低，充几块钱就能用很久。"},
  anthropic:{name:"Claude",badge:"付费",defModel:"claude-opus-5",keyHint:"sk-ant-…",console:"https://console.anthropic.com/settings/keys",
    tip:"效果最好的一档，按用量计费；Claude Pro 会员不包含 API。"},
  openai:{name:"ChatGPT",badge:"付费",base:"https://api.openai.com/v1",defModel:"gpt-5",keyHint:"sk-…",console:"https://platform.openai.com/api-keys",
    tip:"按用量计费；ChatGPT Plus 会员不包含 API。"},
  custom:{name:"自定义 API",badge:"兼容 OpenAI",base:"",defModel:"",models:[],keyHint:"服务商给的 Key（本机模型可以随便填）",console:"",
    tip:"任何兼容 OpenAI 接口的服务都能填，比如硅基流动（https://api.siliconflow.cn/v1）、OpenRouter（https://openrouter.ai/api/v1）、本机 Ollama（http://localhost:11434/v1）。"}
};
let AGT="";          // 当前对话 id
let AGBUSY=false;
let AGSETTINGS=false;

let AG_MEM=null;   // 浏览器禁止本地存储时（部分 Safari 设置），退回本次打开期间的内存
function agCfg(){ try{ const v=localStorage.getItem(AG_KEYS); return v?JSON.parse(v):(AG_MEM||{}); }catch(e){ return AG_MEM||{}; } }
function agSetCfg(c){ AG_MEM=c; try{ localStorage.setItem(AG_KEYS, JSON.stringify(c)); }catch(e){} }
function agProvider(){ return "custom"; }
function agBase(p){ p=p||agProvider(); return ((agCfg().bases||{})[p]||AG_PROVIDERS[p].base||"").replace(/\/+$/,""); }
function agKey(p){ return (agCfg().keys||{})[p||agProvider()]||""; }
function agModel(p){ p=p||agProvider(); return (agCfg().models||{})[p]||AG_PROVIDERS[p].defModel; }
function agReady(){ const p=agProvider(); return !!agKey()&&(p!=="custom"||(!!agBase(p)&&!!agModel(p))); }
function agPName(p){ return (AG_PROVIDERS[p]||{name:p||"AI"}).name; }

/* ---------------- 个人档案与新建档案的读取差异在这里抹平 ---------------- */
function agLib(){ return (typeof rvLib==="function"?rvLib():RV_LIB).filter(e=>!e.gate||(S.profile&&S.profile[e.gate])); }
function agEdu(){ return typeof RV_EDU!=="undefined"?RV_EDU:(S.profile.edu||[]); }
function agSkills(){ return typeof RV_SKILL!=="undefined"?RV_SKILL:(S.profile.skills||[]); }
function agAwards(){ return typeof RV_AWARDS!=="undefined"?RV_AWARDS.map(a=>({n:a[0],l:a[1],t:a[2]})):(S.profile.awards||[]); }
function agBasic(){ return typeof RV_BASIC!=="undefined"?Object.fromEntries(RV_BASIC):{姓名:S.profile.name,手机:S.profile.phone,邮箱:S.profile.email}; }
function agT(v){ return typeof v==="object"&&v?(v._||Object.values(v)[0]):v; }

/* ---------------- 工具定义 ---------------- */
const AG_TOOLS=[
 {name:"get_profile",description:"读取求职者档案：基本信息、教育背景、全部经历与每条简历要点（含要点 id）、技能、奖项、学位授予日期。写任何简历内容或网申回答之前必须先调用。",
  params:{type:"object",properties:{},required:[]}},
 {name:"list_applications",description:"列出投递进度里的岗位（公司、岗位、阶段、截止日期、匹配度）。",
  params:{type:"object",properties:{stage:{type:"string",description:"可选，只看某个阶段，如 已投递"}},required:[]}},
 {name:"save_application",description:"新增或更新投递进度里的岗位。更新时传 id。",
  params:{type:"object",properties:{id:{type:"string"},company:{type:"string"},role:{type:"string"},jd:{type:"string"},stage:{type:"string",enum:["想投/收藏","已投递","笔试/测评","一面","二面","三面/交叉面","HR面","已发offer","已结束"]},deadline:{type:"string",description:"YYYY-MM-DD"},city:{type:"string"},url:{type:"string"},note:{type:"string",description:"追加到备注"}},required:[]}},
 {name:"analyze_jd",description:"用平台规则分析 JD：岗位方向、匹配度、JD 每条要求对应的经历证据或缺口、硬技能对照、必备能力覆盖、届别与海外业务信号。",
  params:{type:"object",properties:{company:{type:"string"},role:{type:"string"},jd:{type:"string"}},required:["company","role","jd"]}},
 {name:"build_resume",description:"按 JD 生成严格一页的简历（自动挑选经历与要点、排版、防孤字），并存为一个历史版本。返回每条要点的 id 与文字、一页占用。",
  params:{type:"object",properties:{company:{type:"string"},role:{type:"string"},jd:{type:"string"},app_id:{type:"string",description:"可选，关联的投递 id"}},required:["company","role","jd"]}},
 {name:"rewrite_resume_bullets",description:"改写当前岗位简历里的要点（用 build_resume 返回的 id）。可以换成 JD 的语言、突出可迁移能力；平台会拒绝原文没有的数字和角色拔高。改完自动重新排版并存新版本。",
  params:{type:"object",properties:{company:{type:"string"},role:{type:"string"},jd:{type:"string"},edits:{type:"array",items:{type:"object",properties:{id:{type:"string"},heading:{type:"string"},text:{type:"string"}},required:["id","heading","text"]}}},required:["company","role","jd","edits"]}},
 {name:"get_application_fields",description:"取得网申常见字段的填写内容（基本信息、各段经历的描述、奖项、技能），描述按该 JD 的相关度排序。写网申开放题前可先调用。",
  params:{type:"object",properties:{company:{type:"string"},role:{type:"string"},jd:{type:"string"}},required:["company","role","jd"]}},
 {name:"check_eligibility",description:"按学位授予日期，逐家判断 2027 届校招毕业时间窗口是否覆盖求职者，并列出国内 base 的海外业务岗位方向。",
  params:{type:"object",properties:{company:{type:"string",description:"可选，只看某家公司"}},required:[]}},
 {name:"save_note",description:"把分析、面试准备、复盘、网申回答等内容存到某条投递下，之后在看板里查看。",
  params:{type:"object",properties:{app_id:{type:"string"},kind:{type:"string",enum:["JD分析","面试准备","面试复盘","网申回答","其他"]},content:{type:"string"}},required:["app_id","kind","content"]}},
 {name:"autopilot_status",description:"查看「自动投递」的状态：岗位来源、筛选条件、待提交 / 需要处理 / 已跳过的岗位和最近几轮运行结果。",
  params:{type:"object",properties:{},required:[]}},
 {name:"autopilot_run",description:"让「自动投递」在后台立即跑一轮（需要 Chrome 插件）：收集新岗位、筛选、生成简历、打开网申并自动填写。不会替用户提交。",
  params:{type:"object",properties:{},required:[]}},
 {name:"list_resume_history",description:"列出已保存的历史简历版本。",
  params:{type:"object",properties:{company:{type:"string"}},required:[]}}
];

function agEnsureBuilt(company, role, jd){
  if(!(RVJD&&RVJD.company===company&&RVJD.role===role&&RVJD.jd===jd&&RV&&RV.secs&&RV.company===company&&RV.role===role)){
    RVFORCE={}; rvAnalyze(company, role, jd); rvBuild(company, role, jd);
  }
}
function agResumeView(){
  return RV.secs.map(s=>({section:s.sec,items:s.items.map(e=>({org:e.org,role:e.role,period:e.period,
    bullets:e.show.map(b=>({id:e.id+":"+(b.g&&typeof b.g==="string"&&typeof rvLib==="function"?b.g:b.i),heading:b.h,text:b.t}))}))}));
}
const AG_RUN={
  get_profile(){
    return {basic:agBasic(),degree_date:S.profile.degreeDate||"",
      education:agEdu().map(e=>({school:e.org,degree:e.role,period:e.period,[e.h||"补充"]:e.t})),
      experiences:agLib().map(e=>({id:e.id,section:e.sec,org:e.org,role:e.role,period:e.period,note:e.check||"",
        bullets:e.b.map((b,i)=>({id:e.id+":"+(typeof rvLib==="function"?b.g:i),heading:agT(b.h),text:agT(b.t),only_when_jd_mentions:b.need||undefined}))})),
      skills:agSkills().map(k=>({[k.h]:k.t})),awards:agAwards()};
  },
  list_applications({stage}={}){
    return (S.apps||[]).filter(a=>a.phase!=="实习期"&&(!stage||a.stage===stage)).map(a=>({id:a.id,company:a.company,role:a.role,stage:a.stage,deadline:a.deadline||"",match:a.match||"",date:a.date||"",has_jd:(a.jd||"").length>30}));
  },
  save_application(x){
    let a=x.id?S.apps.find(v=>v.id===x.id):null;
    if(!a){ if(!x.company||!x.role) return {error:"新增岗位需要 company 和 role"}; a={id:uid("a"),phase:"秋招",company:x.company,role:x.role,stage:"想投/收藏",date:"",jd:"",note:""}; S.apps.push(a); }
    ["company","role","jd","stage","deadline","city","url"].forEach(k=>{ if(x[k]) a[k]=x[k]; });
    if(x.note) a.note=(a.note?a.note+"\n":"")+x.note;
    if(a.stage!=="想投/收藏"&&!a.date) a.date=qzDay();
    save(); return {ok:true,id:a.id,stage:a.stage};
  },
  analyze_jd({company,role,jd}){
    const a=rvAnalyze(company,role,jd); rvBuild(company,role,jd);
    const lab={ok:"有证据",weak:"弱证据",gap:"缺口",soft:"软素质",base:"基本条件"};
    return {track:a.track.name,match_score:a.score,verdict:rvVerdict(a.score)[0],
      requirements:a.items.map(x=>({type:{duty:"职责",req:"要求",plus:"加分"}[x.kind],text:x.t,status:lab[x.st],evidence:x.best?`${x.best.e.org} · ${agT(x.best.b.h)}`:""})),
      hard_skills:a.skills.map(s=>({skill:s.k,jd_requires_proficiency:s.need,candidate:s.mine,how_to_close_gap:s.risk?s.fix:""})),
      must_have_capabilities:Object.keys(a.need).map(c=>({capability:RV_CAPS[c].n,covered:!!(RV.cov||{})[c]})),
      graduation_year_limited:a.gradWarn,overseas_signals:a.abroad,overseas_work_location:a.baseAbroad||""};
  },
  build_resume({company,role,jd,app_id}){
    RVAPP=app_id||""; RVFORCE={}; rvAnalyze(company,role,jd); rvBuild(company,role,jd);
    const h=rvHistSave(), au=rvAudit();
    return {history_id:h&&h.id,fill_percent:Math.round(RV.ratio*100),resume:agResumeView(),
      audit:au.items.map(i=>(i[0]?"✓ ":"! ")+i[1]),bullets_without_numbers:au.noRes,__card:{type:"resume",hist:h&&h.id,company,role}};
  },
  rewrite_resume_bullets({company,role,jd,edits}){
    agEnsureBuilt(company,role,jd);
    const text=(edits||[]).map(e=>`[${e.id}] ${e.heading}｜${e.text}`).join("\n");
    const r=rvApplyRewrite(text);
    rvBuild(company,role,jd); const h=rvHistSave();
    return {accepted:r.ok,rejected:r.bad,fill_percent:Math.round(RV.ratio*100),resume:agResumeView(),__card:{type:"resume",hist:h&&h.id,company,role}};
  },
  get_application_fields({company,role,jd}){
    agEnsureBuilt(company,role,jd);
    const secs={}; RV.sc.entries.slice().sort((a,b)=>b.score-a.score).forEach(e=>{ (secs[e.sec]=secs[e.sec]||[]).push({org:e.org,role:e.role,period:e.period,description:rvDesc(e)}); });
    return {basic:agBasic(),degree_date:S.profile.degreeDate||"",experiences:secs,awards:agAwards(),skills:agSkills()};
  },
  check_eligibility({company}={}){
    const deg=S.profile.degreeDate||"";
    return {degree_date:deg||"未填写",
      companies:RV_ELIG.filter(x=>!company||x.co.includes(company)).map(x=>({company:x.co,window:x.from?`${x.from} ~ ${x.to}`:(x.win||""),status:rvEligOf(x,deg)[1],note:x.note,source:x.srcN})),
      domestic_base_overseas_roles:RV_OUTBOUND.map(o=>({company:o.co,base:o.base,roles:o.role,evidence_level:o.lv}))};
  },
  save_note({app_id,kind,content}){
    const a=S.apps.find(x=>x.id===app_id); if(!a) return {error:"找不到这条投递，先用 list_applications 查 id"};
    if(kind==="JD分析") a.aiAnalysis=content;
    else a.note=(a.note?a.note+"\n\n":"")+`【${kind} · ${qzDay()}】\n${content}`;
    save(); return {ok:true};
  },
  autopilot_status(){
    const A=apS(), pick=s=>A.queue.filter(x=>s.includes(x.status)).slice(0,15).map(x=>({company:x.company,role:x.role,score:x.score,reason:x.needs||x.reason,risks:x.risks,url:x.url}));
    return {chrome_extension:apExtReady(),sources:A.sources.map(s=>({name:s.name,url:s.url,on:s.on,needs:s.needs||""})),filters:A.f,steps:A.steps,schedule_hours:A.hours,
      ready_to_submit:pick(["ready","opened","filled"]),needs_user:pick(["blocked","error"]),skipped:pick(["skip"]),submitted:pick(["submitted"]),recent_runs:A.runs.slice(0,5)};
  },
  autopilot_run(){
    if(!apExtReady()) return {error:"没有连接 Chrome 插件 2.0，无法自动打开招聘网站；可以让用户安装插件，或用「处理看板里想投的岗位」"};
    if(!apS().sources.some(s=>s.on)) return {error:"还没有岗位来源，请用户在「自动投递 → 设置」里添加"};
    if(AP.running) return {ok:true,note:"已经在运行"};
    apRun(); return {ok:true,note:"已在后台开始，进度在「自动投递 → 运行日志」"};
  },
  list_resume_history({company}={}){
    return (S.resumeHist||[]).filter(h=>!company||h.company.includes(company)).slice(0,20).map(h=>({id:h.id,company:h.company,role:h.role,saved_at:h.at,file:h.file}));
  }
};
const AG_LABEL={autopilot_status:"查看自动投递状态",autopilot_run:"启动自动投递",get_profile:"读取你的经历档案",list_applications:"查看投递进度",save_application:"更新投递进度",analyze_jd:"分析 JD 与匹配度",build_resume:"生成一页简历",
  rewrite_resume_bullets:"按 JD 改写要点",get_application_fields:"整理网申字段",check_eligibility:"检查届别窗口",save_note:"保存到投递记录",list_resume_history:"查看历史简历"};

function agSystem(){
  const today=qzDay();
  return `你是「Offer」里的求职 AI 助手，帮中国校招求职者完成：判断岗位、生成和改写一页简历、写网申回答、管理投递、准备面试和复盘。今天是 ${today}。

工作方式：
- 你可以调用平台工具直接读写数据。涉及求职者经历的任何回答，先调用 get_profile，不要凭空假设。
- 用户给了 JD：先 analyze_jd 给出判断，再按用户意图 build_resume；需要更贴合时用 rewrite_resume_bullets 改写，并说明改了哪几条、为什么。
- 模拟面试时一次只问一题，等用户回答后点评（指出好的地方、缺的证据、更好的讲法），再问下一题；结束后给出复盘并用 save_note 存下。
- 投递、截止日期、面试进度变化时，用 save_application 更新看板。

必须遵守：
- 只使用档案里真实存在的经历、数字、角色和结果。可以换成岗位语言、突出可迁移能力、写出面试讲得清的做法；不能新增数字、不能把「协助」「参与」写成「主导」「负责」、不能编造没发生的事。平台也会自动拦截这类改写。
- 网申的提交、登录、验证码都由用户本人完成，你不代替用户提交任何申请。
- 回答用中文，结论先行，简洁、具体；列表不超过 6 条。工具返回的内容不必原样复述，挑关键结论讲。`;
}

/* ---------------- 模型调用 ---------------- */
async function agCallAnthropic(thread){
  const model=agModel("anthropic"), body={model,max_tokens:16000,system:agSystem(),messages:thread.api,
    tools:AG_TOOLS.map(t=>({name:t.name,description:t.description,input_schema:t.params}))};
  const headers={"content-type":"application/json","x-api-key":agKey("anthropic"),"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"};
  const withFallback=/^claude-(opus-5|fable-5-1)/.test(model);
  if(withFallback){ body.fallbacks="default"; headers["anthropic-beta"]="server-side-fallback-2026-07-01"; }
  let res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers,body:JSON.stringify(body)});
  if(res.status===400&&withFallback){ const t=await res.clone().text(); if(/fallback/i.test(t)){ delete body.fallbacks; delete headers["anthropic-beta"]; res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers,body:JSON.stringify(body)}); } }
  if(!res.ok) throw await agErr(res);
  const m=await res.json();
  thread.api.push({role:"assistant",content:m.content});
  const text=m.content.filter(b=>b.type==="text").map(b=>b.text).join("\n").trim();
  const calls=m.content.filter(b=>b.type==="tool_use").map(b=>({id:b.id,name:b.name,input:b.input||{}}));
  let note="";
  if(m.stop_reason==="refusal") note="模型拒绝了这次请求，换个说法再试。";
  if(m.stop_reason==="max_tokens") note="回答太长被截断了，可以让它「继续」。";
  return {text:[text,note].filter(Boolean).join("\n\n"),calls,
    pushResults:rs=>thread.api.push({role:"user",content:rs.map(r=>({type:"tool_result",tool_use_id:r.id,content:r.content,is_error:!!r.error}))})};
}
/* ChatGPT、智谱、Gemini、DeepSeek 以及其他兼容服务都走 OpenAI 格式 */
function agCompatTools(p){
  return AG_TOOLS.map(t=>{ const f={name:t.name,description:t.description};
    if(p==="openai"||Object.keys(t.params.properties||{}).length){ f.parameters=Object.assign({},t.params); if(p!=="openai"&&!(f.parameters.required||[]).length) delete f.parameters.required; }
    return {type:"function",function:f}; });
}
async function agCallOpenAI(thread){
  const p=thread.provider||"openai", base=agBase(p);
  if(!base) throw new Error("没有填写接口地址，去设置里补上。");
  const body={model:agModel(p),messages:[{role:"system",content:agSystem()},...thread.api],tools:agCompatTools(p)};
  const res=await fetch(base+"/chat/completions",{method:"POST",headers:{"content-type":"application/json","authorization":"Bearer "+agKey(p)},body:JSON.stringify(body)});
  if(!res.ok) throw await agErr(res);
  const j=await res.json(); if(!j.choices||!j.choices[0]) throw new Error("返回格式不对："+JSON.stringify(j).slice(0,200));
  const msg=j.choices[0].message||{};
  const keep={role:"assistant",content:msg.content||""}; if(msg.tool_calls&&msg.tool_calls.length) keep.tool_calls=msg.tool_calls.map(c=>({id:c.id,type:"function",function:{name:c.function.name,arguments:c.function.arguments||"{}"}}));
  thread.api.push(keep);
  const calls=(msg.tool_calls||[]).map(c=>{ let input={}; try{ input=JSON.parse(c.function.arguments||"{}"); }catch(e){ input={__bad:true}; } return {id:c.id,name:c.function.name,input}; });
  let note=""; if(j.choices[0].finish_reason==="length") note="回答太长被截断了，可以让它「继续」。";
  return {text:[(msg.content||"").trim(),note].filter(Boolean).join("\n\n"),calls,
    pushResults:rs=>rs.forEach(r=>thread.api.push({role:"tool",tool_call_id:r.id,content:r.content}))};
}
/* 一次性问答（不带工具）：自动投递里让 AI 判断岗位、改写简历、写开放题 */
async function agComplete(system,user,maxTokens){
  const p=agProvider(); maxTokens=maxTokens||2000;
  /* 优先走本机 FastAPI：API Key 不进入浏览器请求头，避免中文/非 ISO-8859-1 字符导致 fetch 直接失败。 */
  if(QZ_BACKEND.online){
    try{ const r=await qzApi("/ai/chat",{method:"POST",body:JSON.stringify({provider:p,model:agModel(p),system,messages:[{role:"user",content:user}],max_tokens:maxTokens})}); return r.text||""; }catch(e){ /* 后端未配置 Key 时继续走兼容接口 */ }
  }
  if(p==="anthropic"){
    const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"content-type":"application/json","x-api-key":agKey(p),"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
      body:JSON.stringify({model:agModel(p),max_tokens:maxTokens,system,messages:[{role:"user",content:user}]})});
    if(!res.ok) throw await agErr(res);
    return (await res.json()).content.filter(b=>b.type==="text").map(b=>b.text).join("\n");
  }
  const body={model:agModel(p),messages:[{role:"system",content:system},{role:"user",content:user}]};
  body[p==="openai"?"max_completion_tokens":"max_tokens"]=maxTokens;
  const res=await fetch(agBase(p)+"/chat/completions",{method:"POST",headers:{"content-type":"application/json","authorization":"Bearer "+agKey(p)},body:JSON.stringify(body)});
  if(!res.ok) throw await agErr(res);
  const j=await res.json(); return (((j.choices||[])[0]||{}).message||{}).content||"";
}
function agJSON(t){ const m=String(t||"").replace(/```(json)?/g,"").match(/\{[\s\S]*\}/); if(!m) return null; try{ return JSON.parse(m[0]); }catch(e){ return null; } }
async function agErr(res){
  let t=""; try{ const j=await res.json(); t=(j.error&&(j.error.message||j.error.type))||JSON.stringify(j); }catch(e){ t=res.statusText; }
  const hint=(res.status===401||(res.status===400&&/api[ _-]?key/i.test(t)))?"API Key 无效或已过期，去设置里重新填写。":res.status===403?"这个 Key 没有权限使用该模型。":res.status===404?"模型名称不对，去设置里重新选择模型。":res.status===429?"请求太频繁或额度用完了，稍后再试或检查账户余额。":res.status>=500?"服务暂时不可用，稍后再试。":"";
  return new Error(`${hint||"请求失败"}（${res.status}：${t}）`);
}

/* ---------------- 对话 ---------------- */
function agThreads(){ S.agentThreads=S.agentThreads||[]; return S.agentThreads; }
function agThread(){ return agThreads().find(t=>t.id===AGT); }
function agNewThread(){ const t={id:uid("t"),title:"新对话",provider:agProvider(),at:new Date().toISOString(),api:[],view:[]}; agThreads().unshift(t); S.agentThreads=agThreads().slice(0,30); AGT=t.id; save(); return t; }

async function agSend(text){
  text=(text||"").trim(); if(!text||AGBUSY) return;
  const job=qzztParseJob(text);
  if(job){ const a=agImportJob(job); text=`我抓取了一个岗位${a?"（已加入投递进度，id："+a.id+"）":"（看板里已有）"}，帮我判断值不值得投，再生成最合适的一页简历：\n公司：${job.company||"未识别"}\n岗位：${job.role||"未识别"}\n城市：${job.city||""}\n链接：${job.url||""}\nJD：\n${job.jd}`; }
  if(!agReady()){ AGSETTINGS=true; renderAgent(); return toast("先填写 API Key"); }
  let t=agThread(); if(!t||t.provider!==agProvider()) t=agNewThread();
  if(t.title==="新对话") t.title=text.replace(/\s+/g," ").slice(0,24);
  t.view.push({role:"user",text}); t.api.push({role:"user",content:text}); t.at=new Date().toISOString();
  AGBUSY=true; save(); renderAgent();
  try{
    for(let step=0;step<14;step++){
      const r=t.provider==="anthropic"?await agCallAnthropic(t):await agCallOpenAI(t);
      if(r.text) t.view.push({role:"assistant",text:r.text});
      if(!r.calls.length) break;
      const results=[];
      for(const c of r.calls){
        const item={role:"tool",name:c.name,label:AG_LABEL[c.name]||c.name,status:"running"}; t.view.push(item); renderAgent();
        let out;
        try{
          if(c.input&&c.input.__bad) throw new Error("工具参数不是合法 JSON");
          if(!AG_RUN[c.name]) throw new Error("没有这个工具");
          out=AG_RUN[c.name](c.input||{});
          if(out&&out.error) throw new Error(out.error);
          item.status="done";
          if(out&&out.__card){ t.view.push({role:"card",card:out.__card}); delete out.__card; }
          if(c.name==="analyze_jd") item.detail=`${out.track} · 匹配度 ${out.match_score}`;
          if(c.name==="build_resume"||c.name==="rewrite_resume_bullets") item.detail=`一页占用 ${out.fill_percent}%`+(out.rejected&&out.rejected.length?` · 拦截 ${out.rejected.length} 条`:"");
          results.push({id:c.id,content:JSON.stringify(out).slice(0,24000)});
        }catch(e){ item.status="error"; item.detail=e.message; results.push({id:c.id,content:"错误："+e.message,error:true}); }
        save();
      }
      r.pushResults(results); renderAgent();
    }
  }catch(e){
    t.view.push({role:"error",text:e.message+(/Failed to fetch|NetworkError/.test(e.message)?"\n网络请求被拦截：检查网络或代理，或确认这个 API 允许浏览器直接调用。":"")});
  }
  AGBUSY=false; t.at=new Date().toISOString(); save(); renderAgent();
}

/* ---------------- 设置 ---------------- */
async function agLoadModels(){
  const p=agProvider(), key=agKey(p); if(!key) return toast("先填写 API Key");
  const box=document.getElementById("agModelMsg"); if(box) box.textContent="正在连接…";
  try{
    let ids=[], fixed="";
    if(p==="anthropic"){
      const res=await fetch("https://api.anthropic.com/v1/models?limit=100",{headers:{"x-api-key":key,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"}});
      if(!res.ok) throw await agErr(res);
      ids=((await res.json()).data||[]).map(m=>m.id);
    }else{
      let base=agBase(p); if(!base) throw new Error("先填写接口地址");
      if(!/^https?:\/\//.test(base)) throw new Error("接口地址要以 https:// 开头");
      if(!agModel(p)) throw new Error("先填写模型名称");
      // 用一句最短的对话验证 Key 和模型（免费模型不花钱，付费模型只花极少一点）
      const ping=b=>fetch(b+"/chat/completions",{method:"POST",headers:{"content-type":"application/json","authorization":"Bearer "+key},body:JSON.stringify({model:agModel(p),messages:[{role:"user",content:"回复：好"}],[p==="openai"?"max_completion_tokens":"max_tokens"]:16})}).catch(()=>null);
      let res=await ping(base);
      // 很多服务商的地址要带 /v1（例如 https://api.xiaomimimo.com/v1）：没带时自动补上再试一次
      if((!res||res.status===404)&&!/\/v\d+[a-z]*$/i.test(base)){
        const r2=await ping(base+"/v1"); if(r2&&r2.status!==404){ res=r2; base+="/v1"; fixed=base; agSaveSetting("base",base); }
      }
      if(!res) throw new Error(`连不上 ${base}/chat/completions：检查接口地址（通常以 /v1 结尾，以服务商文档为准）和网络。`);
      /* 小米 MiMo：按量付费（sk-）和套餐（tp-）用不同地址，401 时自动换另一个地址再试 */
      if(!res.ok&&res.status===401&&/xiaomimimo\.com/.test(base)){
        const alts=[/^tp-/i.test(key)?"https://token-plan-cn.xiaomimimo.com/v1":"https://api.xiaomimimo.com/v1","https://token-plan-cn.xiaomimimo.com/v1","https://api.xiaomimimo.com/v1"].filter((x,i,a2)=>a2.indexOf(x)===i&&x!==base);
        for(const alt of alts){ const r2=await ping(alt); if(r2&&r2.ok){ res=r2; base=alt; fixed=alt; agSaveSetting("base",alt); break; } }
      }
      if(!res.ok&&res.status===401&&/xiaomimimo\.com/.test(base)){
        const tp=/^tp-/i.test(key), onPlan=/token-plan/i.test(base);
        throw new Error(tp&&!onPlan?"这是 MiMo Token Plan 的 Key（tp- 开头），要配套用套餐自己的接口地址：在 platform.xiaomimimo.com → Token Plan → 套餐管理里复制 Base URL（形如 https://token-plan-xxx.xiaomimimo.com/v1）填到上面。"
          :!tp&&onPlan?"Token Plan 的接口地址要配 tp- 开头的套餐 Key；按量付费的 Key 请把地址改成 https://api.xiaomimimo.com/v1。"
          :"MiMo 拒绝了这个 Key（401 Invalid API Key）：到 platform.xiaomimimo.com 确认 Key 完整复制、没有过期、账户有余额；Token Plan 的 Key（tp- 开头）要用套餐页给的 Base URL。");
      }
      if(!res.ok) throw await agErr(res);
      try{ const r2=await fetch(base+"/models",{headers:{authorization:"Bearer "+key}}); if(r2.ok) ids=((await r2.json()).data||[]).map(m=>(m.id||"").replace(/^models\//,"")).filter(Boolean); }catch(e){}
      if(p==="openai") ids=ids.filter(id=>/^(gpt-|o\d|chatgpt-)/.test(id)&&!/(audio|realtime|tts|transcribe|image|search|embedding)/.test(id)).sort().reverse();
      if(p==="gemini") ids=ids.filter(id=>/^gemini-/.test(id)&&!/(embedding|image|tts|audio|live)/.test(id)).sort().reverse();
      if(p==="zhipu") ids=ids.filter(id=>/^glm-/.test(id)&&!/(v|image|voice|video|embedding)/i.test(id.replace(/^glm-/,"")));
    }
    const c=agCfg(); c.modelList=c.modelList||{}; c.modelList[p]=ids; c.ok=c.ok||{}; c.ok[p]=true; agSetCfg(c);
    renderAgent(); const b2=document.getElementById("agModelMsg"); if(b2) b2.textContent=`连接成功，「${agModel(p)}」可以使用`+(fixed?`。接口地址已自动改成 ${fixed}`:"")+(ids.length?`（读到 ${ids.length} 个模型）`:"");
  }catch(e){ const b2=document.getElementById("agModelMsg"); if(b2) b2.textContent=/Failed to fetch|NetworkError|Load failed/.test(e.message)?"连不上：检查接口地址（通常以 /v1 结尾，以服务商文档为准）和网络":e.message; }
}
function agSaveSetting(field,val){
  const c=agCfg();
  if(field==="provider") c.provider=val;
  if(field==="key"){ c.keys=c.keys||{}; c.keys[agProvider()]=val.trim(); }
  if(field==="model"){ c.models=c.models||{}; c.models[agProvider()]=val; }
  if(field==="base"){ c.bases=c.bases||{}; c.bases[agProvider()]=val.trim(); }
  if(["key","model","base"].includes(field)&&c.ok) delete c.ok[agProvider()];
  agSetCfg(c);
  const p=agProvider();
  if(QZ_BACKEND.online&&["key","model","base"].includes(field)) qzApi("/ai/providers",{method:"PUT",body:JSON.stringify({provider:p,api_key:agKey(p),model:agModel(p),base_url:agBase(p)})}).catch(()=>{});
}
function agPickProvider(k){ agSaveSetting("provider",k); renderAgent(); }
/* 粘进来的 Key 属于另一家时自动切过去：sk-ant- 是 Claude，其余 sk- 开头是 ChatGPT */
function agKeyInput(v,pasted){
  v=(v||"").trim(); const cur=agProvider();
  // 只在很确定时自动切换：sk-ant- 是 Claude，AIza 是 Gemini；在 Claude / Gemini 下粘了其他 sk- 开头的，多半是 ChatGPT
  const guess=/^sk-ant-/.test(v)?"anthropic":/^AIza/.test(v)?"gemini":(/^sk-/.test(v)&&(cur==="anthropic"||cur==="gemini"||cur==="zhipu"))?"openai":"";
  if(guess&&guess!==cur){ const c=agCfg(); c.keys=c.keys||{}; c.keys[guess]=v; c.provider=guess; agSetCfg(c); renderAgent(); toast(`这是 ${agPName(guess)} 的 Key，已切换到 ${agPName(guess)}`+(guess==="openai"?"（DeepSeek 的 Key 也是 sk- 开头，是的话点回 DeepSeek 再粘贴）":"")); return; }
  agSaveSetting("key",v);
  const on=document.querySelector(".agx-set h2 .muted"); if(on) on.textContent=v?"已填写 Key":"未连接";
  if(pasted&&v) renderAgent();
}
function agSettingsHTML(){
  const p=agProvider(), P=AG_PROVIDERS[p], list=((agCfg().modelList||{})[p]||[]), cur=agModel(p);
  const opts=[...new Set([cur,...(P.models||[]),...list].filter(Boolean))];
  return `<section class="agx-set">
    <h2>连接 AI <span class="muted">${agKey(p)?"已填写 Key":"未连接"}</span></h2>
    <p class="rvx-note">${esc(P.tip)}</p>
    ${p==="custom"?`<label>接口地址（Base URL）</label>
    <input class="inp" placeholder="例如 https://api.siliconflow.cn/v1" value="${esc(agBase(p))}" oninput="agSaveSetting('base',this.value)" style="margin-bottom:10px">`:""}
    <label>API Key</label>
    <input class="inp" type="password" autocomplete="off" placeholder="${esc(P.keyHint)}" value="${esc(agKey(p))}" oninput="agKeyInput(this.value)" onpaste="setTimeout(()=>agKeyInput(this.value,true),0)">
    <div class="rvx-note" style="margin:4px 0 10px">${P.console?`在 <a href="${P.console}" target="_blank" rel="noopener">${P.name} 开发者后台</a> 创建。`:""}Key 只保存在这台电脑的浏览器里，不会写进备份文件；对话时你的经历会发送给你填写的服务商，用于生成回答。</div>
    <label>模型</label>
    <div style="display:flex;gap:8px"><input class="inp" list="agModelOpts" value="${esc(cur)}" placeholder="模型名称" onchange="agSaveSetting('model',this.value.trim())" onfocus="this.select()">
      <datalist id="agModelOpts">${opts.map(m=>`<option value="${esc(m)}">`).join("")}</datalist>
      <button class="btn" onclick="agSaveSetting('model',this.previousElementSibling.previousElementSibling.value.trim());agLoadModels()">测试连接</button></div>
    <div class="rvx-note" id="agModelMsg" style="margin-top:6px">点「测试连接」验证 Key 和模型${opts.length>1?"；点模型框可以从常用模型里选":""}</div>
    ${AGSETTINGS?`<button class="btn pri" onclick="AGSETTINGS=false;renderAgent()">完成</button>`:""}
  </section>`;
}

/* ---------------- 页面 ---------------- */
const AG_STARTERS=[
 ["判断岗位并生成简历","这是一个岗位的 JD，帮我判断值不值得投、缺什么，然后生成最合适的一页简历：\n公司：\n岗位：\nJD：\n"],
 ["今天该做什么","看一下我的投递进度和截止日期，告诉我今天最该做的 3 件事。"],
 ["模拟面试","我接下来要面试这个岗位，用我的真实经历给我做一场模拟面试，一次问一题：\n公司：\n岗位：\n"],
 ["写网申开放题","帮我写这个网申的开放题回答，控制在字数内：\n公司：\n岗位：\n题目：\n字数限制："],
 ["面试复盘","帮我复盘刚结束的面试，找出失分点并给下次的改进：\n公司 / 岗位：\n被问到的问题和我的回答："],
 ["届别与能投的公司","按我的学位授予时间，看看哪些公司的 2027 届校招我能投，还有哪些国内 base 的海外业务岗位值得看。"]
];
function renderAgent(){
  const box=document.getElementById("agentHome"); if(!box) return;
  const ts=agThreads(), t=agThread(), ready=agReady();
  const keepScroll=document.getElementById("agMsgs"); const atBottom=!keepScroll||keepScroll.scrollHeight-keepScroll.scrollTop-keepScroll.clientHeight<80;
  const draft=(document.getElementById("agInput")||{}).value||"";
  box.innerHTML=`
  <div class="agx">
    <aside class="agx-side">
      <button class="btn pri rvx-wide" style="margin-top:0" onclick="AGT='';renderAgent()">+ 新对话</button>
      <div class="card pad"><div class="rvx-h">对话记录</div>
        ${ts.length?ts.map(x=>`<div class="rvx-hist ${x.id===AGT?"on":""}" onclick="AGT='${x.id}';renderAgent()"><b>${esc(x.title)}</b><span>${agPName(x.provider)} · ${esc(qzTime(x.at).slice(5,10))}</span></div>`).join(""):'<div class="muted" style="font-size:13px">还没有对话</div>'}
      </div>
      <div class="card pad agx-mini">
        <div class="rvx-h">当前模型</div>
        <div class="agx-model">${ready?`<b>${esc(agModel())}</b><span>${(agCfg().ok||{})[agProvider()]?"已连接":"已填写，还没点「测试连接」"}</span>`:'<span class="muted">未连接：填接口地址、Key 和模型</span>'}</div>
        <button class="btn sm" onclick="AGSETTINGS=!AGSETTINGS;renderAgent()">${AGSETTINGS?"收起设置":"设置"}</button>
      </div>
      ${agExtCardHTML()}
    </aside>
    <section class="agx-main card">
      <div class="agx-msgs" id="agMsgs">
        ${(!ready||AGSETTINGS)?agSettingsHTML():""}
        ${t&&t.view.length?t.view.map(agItemHTML).join(""):agTasksHTML()}
        ${AGBUSY?'<div class="agx-typing"><i></i><i></i><i></i></div>':""}
      </div>
      <div class="agx-composer">
        <textarea id="agInput" class="inp" placeholder="${ready?"输入问题，或把 JD 整段粘贴进来（Enter 发送，Shift+Enter 换行）":"先在上方连接 AI（填接口地址、Key 和模型）"}" onkeydown="if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing){event.preventDefault();agSend(this.value);this.value='';}">${esc(draft)}</textarea>
        <button class="btn pri" ${AGBUSY?"disabled":""} onclick="const i=document.getElementById('agInput');agSend(i.value);i.value='';">${AGBUSY?"处理中…":"发送"}</button>
      </div>
    </section>
  </div>`;
  const m=document.getElementById("agMsgs"); if(m&&atBottom&&t&&t.view.length) m.scrollTop=m.scrollHeight;
}
/* AI 顾问的 6 件事：选一个岗位就能开始，不用自己写提示词 */
const AG_TASKS=[
 {ic:"radar",t:"这个岗位值不值得投",d:"匹配度、最大的风险、投不投、投之前先补什么",job:1,
  p:(j)=>`帮我判断这个岗位值不值得投：先用 analyze_jd 分析，再告诉我匹配度、最大的 2 个风险、建议投不投，以及投之前最该补的一件事。${agJobCtx(j)}`},
 {ic:"resume",t:"按 JD 改写简历",d:"改措辞贴合岗位，不编造数字，改完自动排成一页",job:1,
  p:(j)=>`按这个岗位改写我的一页简历：先 build_resume，再挑最值得改的要点用 rewrite_resume_bullets 改写（不加原文没有的数字，不拔高角色），最后说明改了什么。${agJobCtx(j)}`},
 {ic:"send",t:"写网申开放题",d:"按题目和字数写，只用你的真实经历",job:1,extra:"题目和字数，比如：为什么选择我们？（300 字）",
  p:(j,x)=>`帮我写这个网申的开放题，严格控制字数，只用我档案里的真实经历，写完存到这条投递的备注里：\n${x}\n${agJobCtx(j)}`},
 {ic:"mock",t:"模拟面试",d:"一次问一题，你答完给反馈和更好的说法",job:1,
  p:(j)=>`用这个岗位给我做一场模拟面试：先分析 JD 找出面试官最想验证的 3 件事，然后一次只问一题，等我回答后再给反馈和更好的说法。${agJobCtx(j)}`},
 {ic:"reviews",t:"面试复盘",d:"贴上被问到的问题和你的回答，找出失分点",job:1,extra:"被问到的问题和你当时的回答",
  p:(j,x)=>`帮我复盘这场面试：逐题指出面试官在验证什么、我哪里失分、下次怎么答，最后存成这条投递的面试复盘。\n${x}\n${agJobCtx(j)}`},
 {ic:"cal",t:"今天该做什么",d:"看投递进度、截止日期和面试，排出今天最该做的 3 件事",job:0,
  p:()=>"看一下我的投递进度、截止日期、待提交的网申和面试安排，告诉我今天最该做的 3 件事，每件说清楚为什么和具体做到什么程度。"}
];
function agJobCtx(a){ return a?`\n岗位记录 id：${a.id}\n公司：${a.company}\n岗位：${a.role}${(a.jd||"").length>30?"\nJD：\n"+a.jd.slice(0,3000):""}`:""; }
function agJobs(){ return (S.apps||[]).filter(a=>a.phase!=="实习期").sort((a,b)=>(b.date||b.deadline||"").localeCompare(a.date||a.deadline||"")); }
let AGT_SEL=0;
function agTasksHTML(){
  const jobs=agJobs(), ready=agReady(), x=AG_TASKS[AGT_SEL]||AG_TASKS[0], i=AGT_SEL;
  const opts=jobs.map(a=>`<option value="${a.id}">${esc(a.company)} · ${esc(a.role)}${a.stage?"（"+esc(a.stage)+"）":""}</option>`).join("");
  return `<div class="agt">
    <ul class="agt-list" role="listbox" aria-label="选择任务">${AG_TASKS.map((t,k)=>`<li role="option" aria-selected="${k===i}" class="${k===i?"on":""}" tabindex="0" onclick="AGT_SEL=${k};renderAgent()" onkeydown="if(event.key==='Enter'){AGT_SEL=${k};renderAgent()}"><b>${t.t}</b><span>${t.d}</span></li>`).join("")}</ul>
    <form class="agt-form" onsubmit="event.preventDefault();agRunTask(${i})">
      <h2>${x.t}</h2><p class="muted">${x.d}</p>
      ${x.job?(jobs.length?`<label for="agtJob${i}">岗位</label><select class="inp" id="agtJob${i}">${opts}</select>`:`<p class="notice">${typeof qzIcon==="function"?qzIcon("apps",16):""}<span>投递进度里还没有岗位。先在<a href="javascript:go('radar')">职位雷达</a>刷新，或在<a href="javascript:go('resume')">简历工作台</a>粘贴 JD。</span></p>`):""}
      ${x.extra?`<label for="agtX${i}">${esc(x.extra.split("，")[0])}</label><textarea class="inp" id="agtX${i}" rows="4" placeholder="${esc(x.extra)}"></textarea>`:""}
      <div class="agt-go"><button class="btn pri" ${x.job&&!jobs.length?"disabled":""}>开始</button>${ready?`<span class="muted">使用 ${esc(agPName(agProvider()))}</span>`:`<span class="muted">还没连接模型，<a href="javascript:AGSETTINGS=true;renderAgent()">先连接一个</a></span>`}</div>
    </form>
  </div>`;
}
function agRunTask(i){
  const x=AG_TASKS[i], j=x.job?S.apps.find(a=>a.id===(document.getElementById("agtJob"+i)||{}).value):null;
  const extra=x.extra?((document.getElementById("agtX"+i)||{}).value||"").trim():"";
  if(x.job&&!j) return toast("先在投递进度里加一个岗位，或在「职位雷达」里刷新岗位");
  if(x.extra&&!extra) return toast("先填："+x.extra.split("，")[0]);
  AGT=""; agSend(x.p(j,extra));
}
function agFill(i){ const el=document.getElementById("agInput"); el.value=AG_STARTERS[i][1]; el.focus(); }
function agItemHTML(v){
  if(v.role==="user") return `<div class="agx-u">${nl2(v.text)}</div>`;
  if(v.role==="assistant") return `<div class="agx-a">${rvMdLite(v.text)}</div>`;
  if(v.role==="error") return `<div class="agx-err">${nl2(v.text)}</div>`;
  if(v.role==="tool") return `<div class="agx-tool ${v.status}"><span>${v.status==="running"?"⏳":v.status==="done"?"✓":"!"}</span>${esc(v.label)}${v.detail?`<em>${esc(v.detail)}</em>`:""}</div>`;
  if(v.role==="card"&&v.card.type==="resume"){
    const h=(S.resumeHist||[]).find(x=>x.id===v.card.hist);
    if(!h) return "";
    return `<div class="agx-card"><div><b>一页简历 · ${esc(h.company)} · ${esc(h.role)}</b><span>${esc(h.file)}.docx</span></div>
      <div class="rvx-row2"><button class="btn pri" onclick="rvDownloadModel(rvHistModel((S.resumeHist||[]).find(x=>x.id==='${h.id}')),'${esc(h.file)}')">导出 Word</button>
      <button class="btn" onclick="rvPrintModel(rvHistModel((S.resumeHist||[]).find(x=>x.id==='${h.id}')),'${esc(h.file)}')">存为 PDF</button>
      <button class="btn" onclick="RVHIST='${h.id}';go('resume')">预览并修改</button></div></div>`;
  }
  return "";
}
/* 从其他页面把上下文交给 AI 助手 */
function agAsk(text){ go("agent"); AGT=""; setTimeout(()=>{ const el=document.getElementById("agInput"); if(el){ el.value=text; el.focus(); } },80); }

/* ---------------- 浏览器插件桥接：抓取的岗位导入看板、把档案同步给插件用于自动填网申 ---------------- */
function agExtOn(){ return document.documentElement.dataset.qzztExt==="1"; }
function agExtCardHTML(){
  const on=agExtOn();
  return `<div class="card pad"><div class="rvx-h">浏览器工具</div>
    <div class="rvx-note" style="margin:0 0 8px">在招聘网站上一键抓取 JD、自动填写网申（提交由你自己点）。</div>
    <button class="btn sm pri" onclick="agBookmarkHelp()">Chrome 岗位工具</button>
    <button class="btn sm" style="margin-top:6px" onclick="agPasteJob()">粘贴导入抓取的岗位</button>
    <div class="rvx-note" style="margin-top:8px">${on?`Chrome 插件已连接 · <a href="javascript:agSyncExt()">同步档案到插件</a>`:`用 Chrome？<a href="javascript:agExtHelp()">安装插件</a>`}</div></div>`;
}
/* ---- Chrome 岗位工具 ---- */
const QZZT_MARK="【Offer 岗位】";
function agBmJD(){
  const code=`(function(){var F=${qzztExtractJob.toString()};var j=F();j.at=new Date().toISOString();j.id="j"+Date.now();
var t="${QZZT_MARK}"+JSON.stringify(j);var d=document.createElement("div");
d.style.cssText="position:fixed;z-index:2147483647;top:16px;right:16px;width:340px;background:#fff;border:1px solid #ddd;border-radius:12px;box-shadow:0 12px 40px rgba(0,0,0,.2);padding:14px;font:13px/1.6 -apple-system,PingFang SC,sans-serif;color:#181818";
d.innerHTML="<b style='font-size:14px'>Offer · 抓取岗位</b><div style='margin:6px 0;color:#555'></div><textarea style='width:100%;height:90px;box-sizing:border-box;font-size:12px'></textarea><div style='display:flex;gap:8px;margin-top:8px'><button style='flex:1;background:#0052D9;color:#fff;border:0;border-radius:8px;padding:8px'>复制</button><button style='flex:1;border:1px solid #ccc;background:#fff;border-radius:8px;padding:8px'>关闭</button></div>";
d.children[1].textContent=(j.company||"未识别公司")+" · "+(j.role||"未识别岗位")+" · JD "+j.jd.length+" 字"+(j.jd.length<60?"（没找到完整 JD，可先选中 JD 文字再点书签）":"");
var ta=d.querySelector("textarea");ta.value=t;var bs=d.querySelectorAll("button");
bs[0].onclick=function(){function ok(){bs[0].textContent="已复制，回平台粘贴";}ta.select();try{navigator.clipboard.writeText(t).then(ok,function(){document.execCommand("copy");ok();});}catch(e){document.execCommand("copy");ok();}};
bs[1].onclick=function(){d.remove();};document.body.appendChild(d);})();`;
  return "javascript:"+code.replace(/\n/g," ").replace(/%/g,"%25").replace(/#/g,"%23");
}
function agBmFill(){
  const code=`(function(){var F=${qzztFillForm.toString()};var P=${JSON.stringify(agFillData())};var r=F(P,null);
var u=[];r.filled.forEach(function(x){if(u.indexOf(x)<0)u.push(x);});
alert(r.filled.length?"Offer：已填写 "+r.filled.length+" 个字段（"+u.join("、")+"），已用蓝框标出。\n下拉框、日期控件可能要手动补；简历附件请手动上传。\n检查无误后请你自己点提交。":"Offer：没识别到可填写的字段。这个网申可能在内嵌框架里，需要手动填写。");})();`;
  return "javascript:"+code.replace(/\n/g," ").replace(/%/g,"%25").replace(/#/g,"%23");
}
function agBookmarkHelp(){
  const jd=agBmJD(), fill=agBmFill();
  window.__qzztBm={jd,fill};
  openModal("书签工具（Safari / Chrome / Edge 通用）",`<div class="rvx-p">
    <b>第一步：把两个按钮放进收藏栏</b><br>
    Safari 先按 <b>⌘⇧B</b> 显示个人收藏栏，然后把下面两个蓝色按钮<b>拖到收藏栏</b>。
    <div class="agx-bm"><a class="btn pri" href="${esc(jd)}" onclick="event.preventDefault();toast('请拖到收藏栏，不要直接点')">抓取 JD</a><a class="btn pri" href="${esc(fill)}" onclick="event.preventDefault();toast('请拖到收藏栏，不要直接点')">填网申</a></div>
    拖不动的话：随便收藏一个网页到个人收藏栏 → 在收藏栏上右键它 →「编辑地址」→ 粘贴下面复制的代码，并改名。
    <div class="agx-bm"><button class="btn" onclick="navigator.clipboard.writeText(window.__qzztBm.jd).then(()=>toast('已复制「抓取 JD」代码'))">复制「抓取 JD」代码</button><button class="btn" onclick="navigator.clipboard.writeText(window.__qzztBm.fill).then(()=>toast('已复制「填网申」代码'))">复制「填网申」代码</button></div>
    <b>第二步：使用</b><br>
    · <b>抓岗位</b>：在岗位详情页点收藏栏的「抓取 JD」→ 点弹窗里的「复制」→ 回到平台，粘贴到「简历工作台」的 JD 框、AI 助手对话框，或左侧「粘贴导入抓取的岗位」。<br>
    · <b>填网申</b>：在网申表单页点「填网申」，只填空着的字段并用蓝框标出。简历附件需要手动上传，<b>检查后由你自己点提交</b>。<br>
    · 「填网申」里存着你当前的档案，档案或经历改动后，重新拖一次这个按钮覆盖旧的。<br>
    · Safari 如果点了没反应：Safari → 设置 → 高级 → 勾选「在菜单栏中显示开发菜单」，再在「开发」菜单里勾选「允许来自智能搜索栏的 JavaScript」。少数网站会禁止书签脚本运行，这时手动复制 JD 即可。
  </div>`,`<button class="btn pri" onclick="closeModal()">好</button>`,true);
}
/* 抓取结果的文字 → 岗位对象 */
function qzztParseJob(text){
  const marks=[QZZT_MARK,"【秋招作战台岗位】"], m=marks.find(k=>(text||"").includes(k)); if(!m) return null;
  const i=text.indexOf(m);
  try{ const j=JSON.parse(text.slice(i+m.length).trim()); return j&&typeof j.jd==="string"?j:null; }catch(e){ return null; }
}
function agImportJob(j){
  if(S.apps.some(a=>(j.url&&a.url===j.url)||(a.company===j.company&&a.role===j.role&&j.company))) return null;
  const a={id:uid("a"),phase:"秋招",company:j.company||"未填公司",role:j.role||"未填岗位",stage:"想投/收藏",date:"",jd:j.jd||"",url:j.url||"",city:j.city||"",note:"由书签工具抓取 "+(j.at?qzDay(new Date(j.at)):"")};
  S.apps.push(a); save(); return a;
}
function agPasteJob(){
  openModal("粘贴导入抓取的岗位",`<div class="rvx-p" style="margin-bottom:8px">把「抓取 JD」复制的内容粘贴到这里，可以一次粘贴多个。公司或岗位没识别出来的，导入后在投递进度里改。</div>
    <textarea class="inp" id="agJobPaste" style="min-height:200px"></textarea>`,
    `<button class="btn" onclick="closeModal()">取消</button><button class="btn pri" onclick="agDoPasteJob()">导入到投递进度</button>`);
}
function agDoPasteJob(){
  const t=document.getElementById("agJobPaste").value; let n=0, dup=0;
  t.split(QZZT_MARK).slice(1).forEach(p=>{ const j=qzztParseJob(QZZT_MARK+p); if(!j) return; agImportJob(j)?n++:dup++; });
  closeModal(); toast(n?`已导入 ${n} 个岗位到投递进度`+(dup?`，${dup} 个已存在`:""):"没识别到抓取的岗位内容");
}
/* 简历工作台的 JD 框里直接粘贴抓取内容：自动拆出公司、岗位、JD */
function qzztJobPaste(el){
  const j=qzztParseJob(el.value); if(!j) return;
  el.value=j.jd; const set=(id,v)=>{ const x=document.getElementById(id); if(x&&v&&!x.value) x.value=v; };
  set("rvCo",j.company); set("rvRole",j.role); set("rvUrl",j.url); set("rvCity",j.city);
  if(typeof RVMETA!=="undefined"){ RVMETA.url=j.url||RVMETA.url; RVMETA.city=j.city||RVMETA.city; }
  toast("已识别抓取的岗位"+(j.company?"："+j.company:""));
}
function agFillData(){
  const lib=agLib().slice().sort((x,y)=>String(y.period).slice(0,7).localeCompare(String(x.period).slice(0,7)));
  const exps=lib.map(e=>({sec:e.sec,org:e.org.replace(/（.*?）/g,""),role:e.role,period:e.period,
    desc:e.b.filter(b=>!b.need).map((b,i)=>`${i+1}. ${agT(b.h)}：${agT(b.t)}`).join("\n")}));
  const edu=agEdu().map(e=>({school:e.org.replace(/（.*?）/g,"").trim(),major:e.role.replace(/（.*?）/g,"").trim(),degree:/硕士|MSc|Master/i.test(e.role)?"硕士":/博士|PhD/i.test(e.role)?"博士":"本科",period:e.period,note:e.t}));
  const b=agBasic();
  return {name:b.姓名||S.profile.name||"",phone:(b.手机||S.profile.phone||"").replace(/[^\d]/g,""),email:b.邮箱||S.profile.email||"",
    degreeDate:S.profile.degreeDate||"",edu,exps,skills:agSkills().map(k=>`${k.h}：${k.t}`).join("\n"),
    awards:agAwards().map(a=>`${a.n} ${a.l||""} ${a.t||""}`.trim()),self:S.profile.self||(typeof RV_SELF!=="undefined"?RV_SELF[(RVJD&&RVJD.track.id)||"pm-ops"]:""),at:new Date().toISOString()};
}
async function agSyncExt(){
  const data=agFillData(), latest=(S.resumeHist||[])[0];
  let resume=null;
  if(latest){ const blob=rvDocxBlob(rvHistModel(latest)); const buf=new Uint8Array(await blob.arrayBuffer()); let s=""; for(let i=0;i<buf.length;i++) s+=String.fromCharCode(buf[i]); resume={name:latest.file+".docx",b64:btoa(s)}; }
  window.postMessage({source:"qzzt-page",type:"SYNC",data,resume},"*");
  toast("已同步到插件"+(latest?`，附带最新简历「${latest.file}」`:""));
}
function agExtHelp(){
  openModal("安装 Chrome 插件",`<div class="rvx-p">
    1. 在 Chrome 地址栏打开 <b>chrome://extensions</b>，右上角打开「开发者模式」。<br>
    2. 点「加载已解压的扩展程序」，选择 <b>Offer</b> 文件夹里的 <b>extension</b> 文件夹（个人版与 Offer 共用这一个插件，里面没有个人信息）。<br>
    3. 在插件「详情」里打开「允许访问文件网址」（本地双击打开平台时需要）。<br>
    4. 用 Chrome 打开平台并刷新，「自动投递」页会显示「Chrome 插件已连接」。<br><br>
    <b>插件要的权限</b>：读取和修改你打开的网站——用来在后台打开招聘网站读岗位、在网申页填表。它只在自动投递运行、或你点插件按钮时工作，数据只存在本机。<br>
    <b>不会做的事</b>：不点「投递 / 提交」，不填验证码，不替你登录。需要登录的招聘网站，先在 Chrome 里正常登录一次。<br><br>
    以后更新插件：替换 extension 文件夹后，在 chrome://extensions 里点插件卡片上的刷新按钮，再刷新平台页面。</div>`);
}
window.addEventListener("message",e=>{
  const d=e.data||{}; if(d.source!=="qzzt-ext") return;
  if(d.type==="HELLO"){ document.documentElement.dataset.qzztExt="1"; if(document.getElementById("v-agent")&&document.getElementById("v-agent").classList.contains("on")) renderAgent(); }
  if(d.type==="JOBS"&&Array.isArray(d.jobs)&&d.jobs.length){
    let n=0;
    d.jobs.forEach(j=>{ if(S.apps.some(a=>(j.url&&a.url===j.url)||(a.company===j.company&&a.role===j.role))) return;
      S.apps.push({id:uid("a"),phase:"秋招",company:j.company||"未填公司",role:j.role||"未填岗位",stage:"想投/收藏",date:"",jd:j.jd||"",url:j.url||"",city:j.city||"",note:"由浏览器插件抓取 "+(j.at?qzDay(new Date(j.at)):"")}); n++; });
    save(); window.postMessage({source:"qzzt-page",type:"JOBS_ACK",ids:d.jobs.map(j=>j.id)},"*");
    if(n) toast(`从插件导入 ${n} 个岗位到投递进度`);
  }
});
window.postMessage({source:"qzzt-page",type:"PING"},"*");
