
/* =========================================================================
   求职方向：不同专业、不同目标的同学用同一个 Offer
   每个方向决定：职位雷达里看哪些来源、岗位怎么筛、要核对哪些资格、材料有什么不同。
   注意：时间节奏只写「通常」，具体以当年官方公告为准。
   ========================================================================= */
const QZ_DIRS=[
 {id:"biz",name:"互联网与商科",cats:["互联网大厂","出海","AI 与机器人","新消费","新能源","金融","快消外企","我的重点","我添加的"],score:true,
  kw:"产品|运营|分析|策略|市场|商务|数据|咨询|投资|风控|管培",
  desc:"大厂、出海、新消费、金融、外企的产品 / 运营 / 分析 / 市场类岗位。按经历匹配度自动筛选。",
  when:"提前批通常 7–8 月，正式批 9–11 月，春招补录次年 3–4 月。",
  checks:["毕业时间是否在该公司届别窗口内（海外学历按学位证日期）","每家公司可投岗位数量与志愿规则","笔试 / 测评是否限时，提前练行测和性格测评"]},
 {id:"gov",name:"考公 / 选调",cats:["考公 / 选调"],score:false,
  kw:"公务员|选调|科员|职位表|招录|事业单位|遴选",
  desc:"国考、省考、选调生、事业单位。岗位在公告附件的职位表里，按专业、学历、政治面貌、基层经历筛。",
  when:"国考通常 10 月发公告、11 月底笔试；多数省考在次年上半年；选调生多在秋季到次年春季；以当年公告为准。",
  checks:["专业是否在职位表要求的专业目录内（按学位证上的专业名称核对）","学历与学位：海外学历需要留服认证，部分岗位要求国内学历","政治面貌（中共党员 / 共青团员）是否符合","是否属于应届毕业生，以及对「两年内未就业」的认定","基层工作经历年限要求","年龄一般 18–35 周岁（应届硕博可放宽到 40）"],
  materials:"报名表（籍贯、政治面貌、家庭成员、学习工作经历）、学历学位证明、留服认证（海外学历）、政审材料。简历用不上，重点是报名信息与所学专业的对应。"},
 {id:"soe",name:"国企央企与银行",cats:["国企央企","银行"],score:true,
  kw:"管培|综合|职员|柜员|客户经理|金融科技|信息科技|营销|运营|风险|财务|法务",
  desc:"央企、地方国企、国有银行和股份行。网申字段多、笔试重行测和专业知识。",
  when:"秋招通常 9–11 月，银行笔试多在 10–12 月；春招 2–4 月。",
  checks:["户籍 / 生源地、意向城市与分行的对应","英语等级（部分银行要求 CET-6 或雅思成绩）","政治面貌、学生干部经历是否是加分项","是否接受分配或轮岗","笔试范围：行测 + 专业（经济金融 / 计算机）+ 英语 + 性格测试"],
  materials:"网申通常要填完整的教育、实习、奖项、学生工作和家庭成员信息，准备一份标准化的信息底稿，逐项复制。"},
 {id:"law",name:"法学",cats:["法学"],score:false,
  kw:"律师|律所|法务|合规|法官助理|检察官助理|书记员|知识产权|诉讼|非诉",
  desc:"律所（红圈所 / 精品所）、企业法务与合规、法院检察院（走公考）。看重法考、实习和英文能力。",
  when:"律所暑期实习通常在当年春季招，正式岗多在秋季；法检岗位随国考 / 省考；以各家公告为准。",
  checks:["法律职业资格考试（A 证）是否已通过或在考","律所 / 法务实习经历与业务领域（诉讼、并购、合规、知识产权等）","英语能力（涉外业务通常要求很高）","法检岗位：按公考报考条件核对（专业、政治面貌、法考）"],
  materials:"简历突出实习中的具体案件 / 项目类型、检索与写作产出、法考成绩；准备一份法律写作样本。"},
 {id:"edu",name:"教师",cats:["教师"],score:false,
  kw:"教师|老师|教研|班主任|学科|辅导员|助教",
  desc:"公立中小学编制考试、民办和国际学校、高校辅导员。看教师资格证、学科对口和试讲。",
  when:"各地教育局招聘多在春季和秋季两轮；校园招聘集中在秋季；以当地公告为准。",
  checks:["教师资格证学段与学科是否对口（或能在入职前取得）","普通话等级证书","所学专业与报考学科是否对应","编制考试：笔试（教育综合 / 学科专业）+ 面试（说课 / 试讲 / 结构化）"],
  materials:"教育实习、支教、家教、学科竞赛经历；准备一段 10 分钟试讲和一份教案。"},
 {id:"med",name:"医疗",cats:["医疗"],score:false,
  kw:"医师|医生|护士|药师|技师|住院医|规培|医学|临床|检验|影像|医院",
  desc:"医院（住院医师、护理、医技、药学）、医药企业。看执业资格、规培和科研。",
  when:"医院招聘多集中在春季，规培招录通常在夏季；以医院和卫健委公告为准。",
  checks:["执业医师 / 护士执业资格","住院医师规范化培训（规培）是否完成或在读","学历与专业方向是否对口","科研产出（论文、课题）","体检与相关证书"],
  materials:"简历按「教育 → 规培 / 轮转 → 科研 → 获奖」排；列清轮转科室和操作量。"},
];
/* 2026-09-19 逐个实测（.qz-src/tools/scan_dirs.py）：这些网站发的多是「招聘公告 / 考试通知」，或岗位详情需要登录，全部不能自动抓取，只能打开官网看。 */
const QZ_DIR_SITES=[
 {co:"国家公务员局（国考报名）",cat:"考公 / 选调",dir:"gov",url:"http://bm.scs.gov.cn/pp/gkweb/core/web/ui/business/home/gkhome.html",auto:false,note:"国考公告与职位表在这里发布，职位表是 Excel：下载后按专业、学历、政治面貌筛选。"},
 {co:"中国人事考试网",cat:"考公 / 选调",dir:"gov",url:"http://www.cpta.com.cn/",auto:false,note:"各类人事考试的报名入口与公告。"},
 {co:"北京市人事考试网",cat:"考公 / 选调",dir:"gov",url:"https://rsj.beijing.gov.cn/bjpta/",auto:false,note:"北京市考、事业单位公告。"},
 {co:"上海市公务员局",cat:"考公 / 选调",dir:"gov",url:"https://www.shacs.gov.cn/",auto:false,note:"上海市考公告与职位表。"},
 {co:"广东省人事考试局",cat:"考公 / 选调",dir:"gov",url:"https://rsks.gd.gov.cn/",auto:false,note:"广东省考、选调生公告。"},
 {co:"四川人事考试网",cat:"考公 / 选调",dir:"gov",url:"https://www.scpta.com.cn/",auto:false,note:"四川省考、事业单位公告。"},
 {co:"国聘",cat:"国企央企",dir:"soe",url:"https://www.iguopin.com/",auto:false,note:"央企、国企校招集中发布平台：先按行业和城市筛选，再把列表页网址加到「岗位来源」。2026-09-19 实测：首页岗位详情读不出 JD。"},
 {co:"国家电网",cat:"国企央企",dir:"soe",url:"https://zhaopin.sgcc.com.cn/",auto:false,note:"统一招聘平台，按批次和单位发布。"},
 {co:"中国移动",cat:"国企央企",dir:"soe",url:"https://job.10086.cn/",auto:false,note:"按省公司和专业公司分别招聘。2026-09-19 实测：列表能看到岗位，但详情页读不出完整 JD，暂不能自动刷新。"},
 {co:"中国石化",cat:"国企央企",dir:"soe",url:"https://job.sinopec.com/",auto:false,note:"按企业和专业筛选。"},
 {co:"中国工商银行",cat:"银行",dir:"soe",url:"https://job.icbc.com.cn/",auto:false,note:"总行与各分行分开招聘，选意向分行后筛选。"},
 {co:"中国建设银行",cat:"银行",dir:"soe",url:"https://job2.ccb.com/",auto:false,note:"按分行和岗位类别筛选。"},
 {co:"中国农业银行",cat:"银行",dir:"soe",url:"https://career.abchina.com.cn/",auto:false,note:"按分行和岗位类别筛选。"},
 {co:"中国银行",cat:"银行",dir:"soe",url:"https://www.boc.cn/aboutboc/bi4/",auto:false,note:"招聘公告汇总页，网申入口在公告里。"},
 {co:"交通银行",cat:"银行",dir:"soe",url:"https://job.bankcomm.com/",auto:false,note:"按分行和岗位类别筛选。"},
 {co:"中信银行",cat:"银行",dir:"soe",url:"https://job.citicbank.com/",auto:false,note:"按分行和岗位类别筛选。"},
 {co:"金杜律师事务所",cat:"法学",dir:"law",url:"https://www.kingandwood.com/cn/zh/careers.html",auto:false,note:"校园招聘与实习生项目。"},
 {co:"中伦律师事务所",cat:"法学",dir:"law",url:"https://www.zhonglun.com/",auto:false,note:"在官网「加入我们」查看校招与实习。"},
 {co:"君合律师事务所",cat:"法学",dir:"law",url:"https://www.junhe.com/careers",auto:false,note:"校园招聘与实习生项目。"},
 {co:"方达律师事务所",cat:"法学",dir:"law",url:"https://www.fangdalaw.com/",auto:false,note:"在官网「加入我们」查看招聘。"},
 {co:"汉坤律师事务所",cat:"法学",dir:"law",url:"https://www.hankunlaw.com/",auto:false,note:"在官网「加入我们」查看招聘。"},
 {co:"竞天公诚律师事务所",cat:"法学",dir:"law",url:"https://www.jingtian.com/",auto:false,note:"原招聘页已下线（2026-09-19 实测 404），在官网「加入我们」查看招聘。"},
 {co:"教师人才网",cat:"教师",dir:"edu",url:"https://www.jiaoshi.com.cn/",auto:false,note:"公立、民办、国际学校招聘信息平台（第三方）。编制考试以当地教育局公告为准。2026-09-19 实测：首页混有培训广告，不能自动筛岗位。"},
 {co:"北京市教育委员会",cat:"教师",dir:"edu",url:"https://jw.beijing.gov.cn/",auto:false,note:"区教委招聘公告。"},
 {co:"上海市教育委员会",cat:"教师",dir:"edu",url:"https://edu.sh.gov.cn/",auto:false,note:"区教育局招聘公告。"},
 {co:"深圳市教育局",cat:"教师",dir:"edu",url:"http://szeb.sz.gov.cn/",auto:false,note:"教师招聘公告。"},
 {co:"北京协和医院",cat:"医疗",dir:"med",url:"https://www.pumch.cn/",auto:false,note:"在官网「人才招聘」查看公告。"},
 {co:"四川大学华西医院",cat:"医疗",dir:"med",url:"https://www.wchscu.cn/",auto:false,note:"在官网「人才招聘」查看公告。"},
 {co:"丁香人才",cat:"医疗",dir:"med",url:"https://www.jobmd.cn/",auto:false,note:"医疗行业招聘平台（第三方）。2026-09-19 实测：列表能看到岗位，详情页需要登录才显示 JD，暂不能自动刷新。"},
];
function qzDirs(){ const d=S&&S.dirs; return Array.isArray(d)&&d.length?d:["biz"]; }
function qzDirOf(cat){ const d=QZ_DIRS.find(x=>x.cats.includes(cat)); return d?d.id:"biz"; }
function qzDirSet(id,on){
  const cur=new Set(qzDirs()); if(on) cur.add(id); else cur.delete(id);
  if(!cur.size) cur.add("biz");
  S.dirs=QZ_DIRS.map(d=>d.id).filter(x=>cur.has(x)); save();
  if(typeof RD!=="undefined") RD.cat="全部";
  if(typeof renderRadar==="function"&&document.getElementById("v-radar")&&document.getElementById("v-radar").classList.contains("on")) renderRadar();
  if(typeof renderAbroad==="function"&&document.getElementById("v-abroad")&&document.getElementById("v-abroad").classList.contains("on")) renderAbroad();
}
function qzDirPickerHTML(){
  const on=new Set(qzDirs());
  return `<div class="dir-pick" role="group" aria-label="求职方向"><span>我的方向</span>${QZ_DIRS.map(d=>`<label class="${on.has(d.id)?"on":""}" title="${esc(d.desc)}"><input type="checkbox" ${on.has(d.id)?"checked":""} onchange="qzDirSet('${d.id}',this.checked)">${esc(d.name)}</label>`).join("")}</div>`;
}
/* 资格与节奏：挂在「届别与资格」页面顶部 */
function qzDirChecksHTML(){
  const ds=QZ_DIRS.filter(d=>qzDirs().includes(d.id));
  return `<section class="dir-checks">${qzDirPickerHTML()}
    ${ds.map(d=>`<article><h2>${esc(d.name)}</h2><p class="muted">${esc(d.desc)}</p>
      <dl class="cv-kv cv-wide"><div><dt>时间节奏</dt><dd>${esc(d.when)}</dd></div>${d.materials?`<div><dt>材料</dt><dd>${esc(d.materials)}</dd></div>`:""}</dl>
      <h3>投递前核对</h3><ul class="dir-list">${d.checks.map(c=>`<li><label><input type="checkbox" ${((S.dirChecks||{})[d.id+":"+c])?"checked":""} onchange="S.dirChecks=S.dirChecks||{};S.dirChecks['${d.id}:'+this.parentNode.textContent.trim()]=this.checked;save()">${esc(c)}</label></li>`).join("")}</ul></article>`).join("")}
  </section>`;
}
(function(){
  const orig=window.renderAbroad; if(typeof orig!=="function"||orig.__dir) return;
  const w=function(){ const r=orig.apply(this,arguments); const v=document.getElementById("v-abroad"); if(v){ let el=document.getElementById("dirChecks"); if(!el){ el=document.createElement("div"); el.id="dirChecks"; const ph=v.querySelector(".pagehead"); if(ph) ph.after(el); else v.prepend(el); } el.innerHTML=qzDirChecksHTML(); } return r; };
  w.__dir=true; window.renderAbroad=w;
})();
/* 匹配打分会调用它：纯技术研发岗对非技术背景直接压低分数 */
window.qzTechnicalMismatch=window.qzTechnicalMismatch||function(role,jd){
  const r=String(role||"");
  const tech=/(开发|研发|算法|工程师|测试|架构|前端|后端|嵌入式|芯片|硬件|运维|Engineer|Developer|SDE)/i.test(r);
  const biz=/(产品|运营|分析|市场|销售|商务|解决方案|售前|项目管理|数据分析)/.test(r);
  return {blocked:tech&&!biz,reason:tech&&!biz?"技术研发岗":""};
};
