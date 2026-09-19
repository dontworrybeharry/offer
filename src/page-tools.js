/* 这两个函数会被注入到招聘网站页面里执行，必须自包含（不能引用外部变量） */

/* 抓取当前页面的岗位信息：优先用选中的文字，否则找同时包含「职责」「要求」的最小内容块 */
function qzztExtractJob(){
  const clean=s=>(s||"").replace(/ /g," ").replace(/[ \t]+/g," ").replace(/\n{3,}/g,"\n\n").trim();
  const sel=clean(String(window.getSelection()||""));
  let jd=sel.length>60?sel:"";
  if(!jd){
    const re1=/岗位职责|工作职责|职位描述|岗位描述|工作描述|职位职责|工作内容|职责描述|你将负责|Responsibilities|Job Description/i, re2=/任职要求|岗位要求|职位要求|任职资格|我们希望你|Requirements|Qualifications/i;
    let best=null;
    document.querySelectorAll("main,article,section,div").forEach(el=>{
      const t=el.innerText||""; if(t.length<30||t.length>8000) return;
      if(re1.test(t)&&re2.test(t)&&(!best||t.length<best.length)) best=t;
    });
    if(!best){ document.querySelectorAll("main,article,section,div").forEach(el=>{ const t=el.innerText||""; if(t.length>=30&&t.length<6000&&re1.test(t)&&(!best||t.length<best.length)) best=t; }); }
    /* 兜底：整页文字里从「职责 / 描述」标题截到「投递 / 相关职位」之前 */
    if(!best){ const all=document.body.innerText||""; const i=all.search(re1); if(i>=0){ let seg=all.slice(i,i+5000); const k=seg.search(/\n(立即投递|投递简历|申请职位|相关职位|相似职位|推荐职位|分享职位)/); if(k>80) seg=seg.slice(0,k); if(re2.test(seg)||seg.length>150) best=seg; } }
    jd=clean(best||"");
  }
  const host=location.hostname;
  const coMap=[[/bytedance|toutiao|tiktok|feishu/,"字节跳动"],[/qq\.com|tencent/,"腾讯"],[/meituan/,"美团"],[/alibaba|aliyun|antgroup|taobao/,"阿里巴巴"],[/jd\.com/,"京东"],[/kuaishou/,"快手"],[/xiaohongshu/,"小红书"],[/pddglobalhr|pinduoduo/,"拼多多"],[/baidu/,"百度"],[/163\.com|netease/,"网易"],[/mihoyo/,"米哈游"],[/shein/,"SHEIN"],[/anker/,"安克创新"],[/huawei/,"华为"],[/didi/,"滴滴"],[/bilibili/,"哔哩哔哩"],[/cmbchina/,"招商银行"],[/boc\.cn|chinahr/,"中国银行"]];
  let company=(coMap.find(([r])=>r.test(host))||[])[1]||"";
  /* 岗位名称：在标题元素和页面标题里找像岗位名、又不是网站名的那个 */
  const JOBW=/(经理|运营|律师|法务|合规|书记员|法官助理|检察官助理|教师|老师|医师|医生|护士|药师|技师|科员|公务员|选调|柜员|客户经理|综合岗|分析|产品|策划|专员|管培|培训生|研究员|顾问|实习生|工程师|设计师|助理|主管|分析师|营销|市场|商务|投资|风控|咨询|数据|Analyst|Manager|Associate|Specialist)/i, SITE=/招聘|校招|首页|岗位详情|职位详情|岗位描述|职位描述|岗位职责|工作职责|任职要求|岗位要求|职位要求|加入我们|join us|careers?$/i;
  const cands=[...document.querySelectorAll("h1,h2,h3,[class*=title],[class*=Title],[class*=name]")].map(e=>clean(e.innerText).split("\n")[0]).filter(t=>t&&t.length<=40);
  cands.push(...clean(document.title).split(/\s[-_|｜]\s|[|｜]/).map(x=>x.trim()));
  let role=(cands.find(t=>JOBW.test(t)&&!SITE.test(t))||cands.find(t=>!SITE.test(t))||"").slice(0,40);
  const city=((document.body.innerText||"").match(/(北京|上海|深圳|广州|杭州|成都|武汉|南京|西安|苏州|长沙|重庆|天津|厦门|香港)/)||[])[1]||"";
  return {company,role,city,jd,url:location.href};
}

/* 按档案填写网申表单：只填空着的字段，不点任何提交按钮 */
function qzztFillForm(profile, resume){
  const P=profile||{}; const report={filled:[],skipped:0};
  const intern=(P.exps||[]).filter(e=>e.sec==="实习经历"), proj=(P.exps||[]).filter(e=>e.sec!=="实习经历");
  const span=p=>{ const m=(p||"").match(/(\d{4})[.\/-年](\d{1,2})\D+(\d{4})[.\/-年](\d{1,2})/); return m?{s:[m[1],m[2].padStart(2,"0")],e:[m[3],m[4].padStart(2,"0")]}:null; };
  /* 字段名：for 关联的 label → 包裹的 label → aria-label / placeholder → 紧挨在前面的短文字（向前找兄弟节点，再向上一层） */
  const shortText=n=>{ if(!n||n.nodeType!==1) return ""; if(n.matches("input,textarea,select")) return ""; if(n.querySelector&&n.querySelector("input,textarea,select")) return ""; const t=(n.innerText||"").trim(); return t.length&&t.length<=24?t:""; };
  const labelOf=el=>{
    let t="";
    if(el.id){ const l=document.querySelector(`label[for="${CSS.escape(el.id)}"]`); if(l) t=l.innerText; }
    if(!t&&el.closest("label")){ const c=el.closest("label").cloneNode(true); c.querySelectorAll("input,textarea,select").forEach(x=>x.remove()); t=c.innerText; }
    if(!t) t=el.getAttribute("aria-label")||"";
    if(!t){ let p=el; for(let up=0;up<3&&!t&&p;up++,p=p.parentElement){ let sib=p.previousElementSibling; for(let k=0;k<2&&sib&&!t;k++,sib=sib.previousElementSibling) t=shortText(sib); } }
    t=[t,el.placeholder,el.name].filter(Boolean).join(" ");
    return t.replace(/\s+/g," ").trim();
  };
  const setVal=(el,v)=>{
    if(v==null||v==="") return false;
    if(el.tagName==="SELECT"){
      const o=[...el.options].find(o=>o.text.includes(v)||v.includes(o.text.trim())&&o.text.trim()); if(!o) return false;
      el.value=o.value;
    } else {
      if(el.type==="month") v=String(v).replace(/(\d{4})\D(\d{2}).*/,"$1-$2");
      if(el.type==="date") v=String(v).replace(/(\d{4})\D(\d{2}).*/,"$1-$2-01");
      const proto=el.tagName==="TEXTAREA"?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto,"value").set.call(el,v);
    }
    ["input","change","blur"].forEach(t=>el.dispatchEvent(new Event(t,{bubbles:true})));
    el.style.outline="2px solid #0052D9"; el.style.background="#F2F6FF";
    return true;
  };
  const cnt={}, next=k=>{ cnt[k]=(cnt[k]||0); return cnt[k]++; };
  let group="edu";
  const fields=[...document.querySelectorAll("input,textarea,select")].filter(el=>{
    if(el.disabled||el.readOnly) return false;
    if(el.tagName==="INPUT"&&!/^(text|email|tel|number|date|month|search|)$/.test(el.type||"")) return false;
    const r=el.getBoundingClientRect(); return r.width>0&&r.height>0;
  });
  for(const el of fields){
    if(el.tagName!=="SELECT"&&el.value){ report.skipped++; continue; }
    const L=labelOf(el); let v=null, key="";
    const E=()=>(P.edu||[])[cnt.school?cnt.school-1:0]||{}, X=()=>intern[cnt.company?cnt.company-1:0]||{}, J=()=>proj[cnt.project?cnt.project-1:0]||{};
    if(/学校|院校|school|university|college/i.test(L)){ group="edu"; v=((P.edu||[])[next("school")]||{}).school; key="学校"; }
    else if(/专业|major/i.test(L)){ v=E().major; key="专业"; }
    else if(/学历|学位|degree/i.test(L)){ v=E().degree; key="学历"; }
    else if(/gpa|绩点|成绩/i.test(L)){ v=((E().note||"").match(/GPA\s*[\d.]+\/[\d.]+/i)||[])[0]; key="GPA"; }
    else if(/公司|单位|company|employer|organization/i.test(L)&&!/项目/.test(L)){ group="exp"; v=(intern[next("company")]||{}).org; key="公司"; }
    else if(/项目名称|project/i.test(L)){ group="proj"; v=(proj[next("project")]||{}).org; key="项目名称"; }
    else if(/职位|岗位名称|职务|担任|角色|position|title/i.test(L)&&!/应聘|意向|申请/.test(L)){ v=(group==="proj"?J():X()).role; key="职位"; }
    else if(/(开始|起始|入学|入职)(时间|日期)?|start/i.test(L)){ const s=span(group==="edu"?E().period:group==="proj"?J().period:X().period); v=s&&s.s.join("."); key="开始时间"; }
    else if(/(结束|毕业|离职)(时间|日期)?|end/i.test(L)){ const s=span(group==="edu"?E().period:group==="proj"?J().period:X().period); v=s&&s.e.join("."); key="结束时间"; }
    else if(/描述|内容|职责|业绩|description|responsibilit/i.test(L)&&el.tagName==="TEXTAREA"){ v=(group==="proj"?J():X()).desc; key="经历描述"; }
    else if(/为什么|求职动机|申请理由|投递理由|why/i.test(L)&&el.tagName==="TEXTAREA"){ v=P.motive; key="求职动机"; }
    else if(/自我评价|自我介绍|个人评价|个人优势|self/i.test(L)){ v=P.self; key="自我评价"; }
    else if(/获奖|奖项|荣誉|award/i.test(L)){ v=(P.awards||[]).join("\n"); key="获奖"; }
    else if(/技能|证书|skill/i.test(L)){ v=P.skills; key="技能"; }
    else if(/邮箱|e-?mail/i.test(L)){ v=P.email; key="邮箱"; }
    else if(/手机|电话|mobile|phone|tel/i.test(L)){ v=P.phone; key="手机"; }
    else if(/姓名|名字|^name$|full ?name/i.test(L)){ v=P.name; key="姓名"; }
    if(key&&setVal(el,v)) report.filled.push(key);
  }
  if(resume&&resume.b64){
    const fi=[...document.querySelectorAll("input[type=file]")].find(el=>/简历|附件|resume|cv/i.test(labelOf(el)+" "+(el.accept||""))||/doc/.test(el.accept||""));
    if(fi&&!fi.files.length){
      try{
        const bin=atob(resume.b64), u=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) u[i]=bin.charCodeAt(i);
        const dt=new DataTransfer(); dt.items.add(new File([u],resume.name,{type:"application/vnd.openxmlformats-officedocument.wordprocessingml.document"}));
        fi.files=dt.files; fi.dispatchEvent(new Event("change",{bubbles:true})); report.filled.push("简历附件");
      }catch(e){}
    }
  }
  return report;
}

/* ================= 自动投递用：页面状态、岗位列表、列表卡片点击 ================= */

/* 页面状态：是否被登录 / 验证码拦住、是否已投递成功、有没有表单 */
function qzztPageState(){
  const txt=(document.body&&document.body.innerText||"").slice(0,20000);
  const vis=el=>{ const r=el.getBoundingClientRect(); return r.width>0&&r.height>0; };
  const captcha=/验证码|滑块|安全验证|人机验证|拖动.*完成|captcha|verify you are human/i.test(txt.slice(0,3000))
    ||[...document.querySelectorAll("iframe")].some(f=>/captcha|geetest|tcaptcha|verify/i.test(f.src||""));
  const pwd=[...document.querySelectorAll("input[type=password]")].some(vis);
  const jdLike=/岗位职责|工作职责|职位描述|任职要求|岗位要求/.test(txt);
  /* 成功提示通常在页面顶部的短文字里；长页面里的说明文字不算 */
  const success=/投递成功|申请成功|已成功投递|简历已投递|提交成功|application (has been )?(submitted|received)/i.test(txt.slice(0,1500));
  const applyBtn=[...document.querySelectorAll("button,a,[role=button]")].some(b=>vis(b)&&/^(立即投递|投递简历|申请职位|立即申请|投递)$/.test((b.innerText||"").trim()));
  const inputs=[...document.querySelectorAll("input,textarea,select")].filter(el=>vis(el)&&!/^(hidden|submit|button|checkbox|radio|password|search)$/.test(el.type||""));
  return {blocked:captcha?"captcha":(pwd&&!jdLike?"login":""),success,applyBtn,hasForm:inputs.length>=3,title:document.title,url:location.href};
}

/* 慢慢滚到底，触发懒加载 */
async function qzztScroll(){
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  for(let i=0;i<4;i++){ window.scrollTo(0,document.body.scrollHeight); await sleep(700); }
  window.scrollTo(0,0); return true;
}

/* 列表页里的岗位：优先找链接；没有链接（点击跳转的卡片）时返回卡片数量，交给插件逐个点开 */
function qzztCollectLinks(){
  const JOB=/(经理|运营|律师|法务|合规|书记员|法官助理|检察官助理|教师|老师|医师|医生|护士|药师|技师|科员|公务员|选调|柜员|客户经理|综合岗|分析|产品|策划|专员|管培|培训生|研究员|顾问|实习生|工程师|设计师|助理|主管|分析师|营销|市场|商务|投资|风控|咨询|数据|Analyst|Manager|Associate|Specialist|Consultant)/i;
  const NAV=/^(登录|注册|首页|关于|隐私|帮助|更多|下一页|上一页|查看更多|社会招聘|校园招聘|实习生招聘|职位搜索|我的投递)$/;
  const vis=el=>{ const r=el.getBoundingClientRect(); return r.width>0&&r.height>0; };
  const first=el=>(el.innerText||"").trim().split("\n").map(x=>x.trim()).filter(Boolean)[0]||"";
  const seen=new Set(), links=[];
  document.querySelectorAll("a[href]").forEach(a=>{
    if(!vis(a)) return;
    const href=a.href; if(!/^https?:/.test(href)||href.split("#")[0]===location.href.split("#")[0]) return;
    const t=first(a).slice(0,80); if(t.length<2||NAV.test(t)) return;
    if(/[，。！？!?]/.test(t)||t.length>45) return;   // 文章、专题标题，不是岗位名
    let path=href; try{ const u=new URL(href); path=u.pathname+u.search+u.hash; }catch(e){}
    const strong=/(detail|post_detail|job-info|jobinfo|position\/\w*\d|jobs?\/\w*\d|jobid|positionid|postid|jobunionid|requisition|zhiwei\/\d)/i.test(path);
    const weak=strong||/(job|position|post|jd|zhiwei|opening|career)/i.test(path)||/\d{5,}/.test(path);
    if(!(JOB.test(t)&&weak)) return;
    if(seen.has(href)) return; seen.add(href); links.push({url:href,text:t,strong});
  });
  /* 有足够多明确的「职位详情」链接时，去掉分类、专题页这类弱匹配 */
  const strongN=links.filter(l=>l.strong).length;
  const out=(strongN>=2?links.filter(l=>l.strong):links.sort((x,y)=>(y.strong?1:0)-(x.strong?1:0))).map(({url,text})=>({url,text}));
  return {links:out,cards:out.length>=2?0:qzztCards().length};
}
function qzztCards(){
  const JOB=/(经理|运营|律师|法务|合规|书记员|法官助理|检察官助理|教师|老师|医师|医生|护士|药师|技师|科员|公务员|选调|柜员|客户经理|综合岗|分析|产品|策划|专员|管培|培训生|研究员|顾问|实习生|工程师|设计师|助理|主管|分析师|营销|市场|商务|投资|风控|咨询|数据|Analyst|Manager|Associate|Specialist|Consultant)/i;
  const UI=/filter|condition|tab|menu|nav|header|footer|banner|select|dropdown|search|breadcrumb|pagination|sider|sidebar|category|option|checkbox/i;
  const META=/(北京|上海|深圳|广州|杭州|成都|武汉|南京|西安|苏州|长沙|重庆|天津|厦门|香港|新加坡|海外|全国|届|校招|实习|全职|ID|编号|发布|更新|\d{4}[-./]\d{1,2})/;
  const inUI=el=>{ for(let p=el,k=0;p&&k<7;p=p.parentElement,k++){ if(UI.test(((p.className&&p.className.baseVal!==undefined?p.className.baseVal:p.className)||"")+" "+(p.id||"")+" "+(p.getAttribute&&p.getAttribute("role")||""))) return true; } return false; };
  const c=[...document.querySelectorAll("li,div,section,article,tr")].filter(el=>{
    const r=el.getBoundingClientRect(); if(!(r.width>0&&r.height>0)) return false;
    const t=(el.innerText||"").trim(); if(t.length<4||t.length>600) return false;
    const lines=t.split("\n").map(x=>x.trim()).filter(Boolean), line=lines[0];
    if(line.length>40||!JOB.test(line)) return false;
    if(!(lines.length>=2||META.test(t))) return false;
    const cls=String((el.className&&el.className.baseVal!==undefined?el.className.baseVal:el.className)||"")+" "+(el.id||"");
    /* React / Vue 的点击事件看不到，所以类名像「职位卡片」的也算 */
    if(!(getComputedStyle(el).cursor==="pointer"||el.onclick||el.getAttribute("role")==="link"||/card|item|job|position|post|recruit/i.test(cls))) return false;
    return !inUI(el);
  });
  return c.filter(el=>!c.some(o=>o!==el&&o.contains(el)));
}
function qzztClickCard(i){
  const c=qzztCards()[i]; if(!c) return null;
  const text=(c.innerText||"").trim().split("\n")[0].slice(0,80);
  c.scrollIntoView({block:"center"});
  /* 点击事件只会往外层冒泡：在标题文字所在的位置点，才能触发里层元素上的跳转 */
  let target=c;
  const walker=document.createTreeWalker(c,NodeFilter.SHOW_TEXT,{acceptNode:n=>n.textContent.trim()?1:3});
  const tn=walker.nextNode();
  if(tn){ const rg=document.createRange(); rg.selectNodeContents(tn); const r=rg.getBoundingClientRect(); const el=r.width&&document.elementFromPoint(r.left+Math.min(r.width/2,40),r.top+r.height/2); if(el&&c.contains(el)) target=el; }
  const opt={bubbles:true,cancelable:true,view:window};
  ["pointerdown","mousedown","pointerup","mouseup"].forEach(t=>target.dispatchEvent(new MouseEvent(t,opt)));
  target.click(); return text;
}
