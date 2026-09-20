
/* =========================================================================
   面试模块：素材库 / 答案库 / 面试复盘 / Mock 面试
   · 复盘、答案库、Mock 的逻辑与个人版一致（由 .qz-src/tools/gen_share_interview.py 从个人版生成，不要手改这一段）
   · 素材库按「我的经历」自动建卡，口播、追问和数字由你自己补；平台不替你编内容
   · 题库：公开面经题 + 各方向通用题，不写进你的档案（不占存储、导出时不带）
   ========================================================================= */
const FAIL_MODES = [
 "没给公式/口径","只有结论没有过程","经历讲太平（缺数字）","没落到岗位",
 "被追问击穿","结构混乱","临场卡壳/空白","只说 what 没说 why",
 "没有自己的观点","例子不贴题","超时/太啰嗦","反问乏力",
 "忽略业务约束","数据说不清来源"
];
const RADAR_DIMS = ["业务理解","数据量化","结构表达","岗位匹配","临场应变"];
function allQs(){ const out=[]; (S.reviews||[]).forEach(r=>(r.qs||[]).forEach(q=>out.push({...q, _r:r}))); return out; }
function failStats(){
  const m={}; allQs().forEach(q=>(q.fail||[]).forEach(f=>{ m[f]=m[f]||{n:0,qs:[]}; m[f].n++; m[f].qs.push(q); }));
  (S.mocks||[]).forEach(mk=>(mk.items||[]).forEach(i=>(i.fail||[]).forEach(f=>{ m[f]=m[f]||{n:0,qs:[]}; m[f].n++; })));
  return Object.entries(m).sort((a,b)=>b[1].n-a[1].n);
}
function radarAvg(){
  const sum={}, cnt={};
  (S.reviews||[]).forEach(r=>{ RADAR_DIMS.forEach(d=>{ const v=(r.radar||{})[d]; if(v){ sum[d]=(sum[d]||0)+v; cnt[d]=(cnt[d]||0)+1; } }); });
  return RADAR_DIMS.map(d=>({d, v: cnt[d]? sum[d]/cnt[d] : 0}));
}
function repeatedQs(){
  const norm=s=>String(s).replace(/[\s，。？?、,.:：（）()「」""]/g,"").slice(0,14);
  const m={};
  allQs().forEach(q=>{ const k=norm(q.q); if(!k) return; m[k]=m[k]||{q:q.q,hits:[]}; m[k].hits.push(q); });
  (S.mocks||[]).forEach(mk=>(mk.items||[]).forEach(i=>{ const k=norm(i.q); if(!m[k]) return; m[k].hits.push({...i,_mock:true}); }));
  return Object.values(m).filter(x=>x.hits.length>1).sort((a,b)=>b.hits.length-a.hits.length);
}
function weakQs(){ return allQs().filter(q=>q.score&&q.score<=2); }


const IV_QBANK=[
{id:"q001",co:"腾讯",track:"产品运营",round:"一面",type:"行为面",q:"自我介绍，请着重介绍与运营岗位最相关的经历",hint:"一句话定位 → 两段最相关经历（各带数字）→ 能力关键词 → 落到岗位。",src:"面经-腾讯运营26"},
{id:"q002",co:"腾讯",track:"产品运营",round:"一面",type:"行为面",q:"你为什么选择腾讯的运营岗位？",hint:"平台特性（社交生态/复杂业务）+ 你的能力互补 + 一个具体的产品观察，证明你真的用过、想过。",src:"面经-腾讯运营26"},
{id:"q003",co:"腾讯",track:"产品运营",round:"一面",type:"业务面",q:"如果让你负责提升某款腾讯产品（如视频号 / 小程序）的日活跃用户数，你会怎么做？",hint:"先问基线和定义 → DAU 拆公式 → 分层定位 → Aha moment → 排优先级 + AB。",src:"面经-腾讯运营26"},
{id:"q004",co:"腾讯",track:"产品运营",round:"一面",type:"业务面",q:"请分析一款你常用的腾讯产品的运营策略",hint:"选微信支付或视频号。用「场景洞察 → 解决方案 → 商业价值 → 我的改进建议」四段。",src:"面经-腾讯运营26"},
{id:"q005",co:"腾讯",track:"产品运营",round:"二面",type:"业务面",q:"你如何理解「私域流量」和「公域流量」？在腾讯生态中如何运营私域？",hint:"公域=平台分配、按次付费、可规模但不可积累；私域=可反复触达、零边际成本但需内容维护。腾讯：公众号+社群+企微+小程序，关键是承接和分层。",src:"面经-腾讯运营26"},
{id:"q006",co:"腾讯",track:"产品运营",round:"二面",type:"行为面",q:"请举例说明你通过策划活动实现用户增长的案例",hint:"用「华音」社区语音闯关（积分兑换、首月完课率 +40%）或线下培训报名 100+。给目标—玩法—数据—复盘。",src:"面经-腾讯运营26"},
{id:"q007",co:"腾讯",track:"产品运营",round:"二面",type:"业务面",q:"你负责的某项运营数据突然异常波动，你会如何排查？",hint:"确认真伪 → 维度拆解 → 公式归因 → 内外因 → 短期止血+长期机制。",src:"面经-腾讯运营26"},
{id:"q008",co:"腾讯",track:"产品运营",round:"HR面",type:"行为面",q:"你怎么看 AI 技术对运营工作的影响？",hint:"技术驱动→场景深耕；成熟态三特征；对岗位的影响是执行被压缩、定义问题更值钱。",src:"面经-腾讯运营26"},
{id:"q009",co:"腾讯",track:"产品运营",round:"HR面",type:"行为面",q:"你的职业规划是什么？",hint:"短中长三段 + 为什么是这家。",src:"面经-腾讯运营26"},
{id:"q010",co:"腾讯",track:"产品经理",round:"一面",type:"业务面",q:"你最近在用什么产品？它有哪些地方可以改进？",hint:"选一个你真的高频用的。给「定位—我的使用场景—具体断点—改进方案—怎么验证」。别只吐槽。",src:"面经-腾讯产品26"},
{id:"q011",co:"腾讯",track:"产品经理",round:"一面",type:"业务面",q:"如何定义一个产品的核心指标体系？",hint:"北极星 → 乘法拆解 → 过程指标 → 护栏指标。",src:"面经-腾讯产品26"},
{id:"q012",co:"腾讯",track:"产品经理",round:"一面",type:"Case",q:"如果你是微信「朋友圈」的产品经理，你会如何优化它？",hint:"先定目标（不能既提互动又提时长又提广告收入）→ 找一个具体人群的具体断点 → 给方案 → 说清副作用和护栏。",src:"面经-腾讯产品26"},
{id:"q013",co:"腾讯",track:"产品经理",round:"一面",type:"业务面",q:"如何做竞品分析？",hint:"",src:"面经-腾讯产品26"},
{id:"q015",co:"腾讯",track:"产品经理",round:"二面",type:"业务面",q:"如何平衡用户需求与商业目标的冲突？",hint:"分短期/长期看：多数冲突是短期的。给判断顺序——是否伤害核心体验 → 是否可逆 → 有没有第三条路。举广告与体验的例子。",src:"面经-腾讯产品26"},
{id:"q016",co:"腾讯",track:"产品经理",round:"二面",type:"业务面",q:"你如何推动没有资源的项目落地？",hint:"",src:"面经-腾讯产品26"},
{id:"q017",co:"腾讯",track:"产品经理",round:"二面",type:"业务面",q:"如果一个新功能上线后数据没有达到预期，你会怎么做？",hint:"先分「没人用」还是「用了没效果」，再质疑预期本身是否合理。",src:"面经-腾讯产品26"},
{id:"q018",co:"腾讯",track:"产品经理",round:"一面",type:"业务面",q:"介绍一款你最喜欢的 App，说说它哪里做得好，哪里可以改进",hint:"结构：定位 → 它解决了谁的什么问题 → 一个设计细节为什么妙 → 一个具体断点 → 改进方案。",src:"面经-腾讯产品策划26"},
{id:"q019",co:"腾讯",track:"产品经理",round:"一面",type:"业务面",q:"你如何看待目前短视频赛道竞争格局？如果让你为腾讯设计一款短视频产品，你会怎么做差异化？",hint:"格局：抖音强算法分发、快手强社区关系、视频号强社交链+闭环。差异化要从腾讯独有资产（关系链、小店、公众号内容）出发，而不是做第二个抖音。",src:"面经-腾讯产品策划26"},
{id:"q020",co:"腾讯",track:"产品经理",round:"二面",type:"业务面",q:"你怎么理解「用户体验」？怎样判断一个产品的用户体验好不好？",hint:"可用性（能不能完成）→ 效率（几步完成）→ 情感（愿不愿再来）。判断靠：任务完成率、路径步数、漏斗流失点、NPS、负反馈率。",src:"面经-腾讯产品策划26"},
{id:"q021",co:"腾讯",track:"产品经理",round:"二面",type:"Case",q:"如果给你一周时间，让你为大学生设计一个工具类小程序，你会怎么做？",hint:"一周=只能做 MVP。先选一个高频窄场景 → 一个核心功能 → 怎么找 20 个种子用户 → 用什么指标判断要不要继续。你有「华音」小程序的真实经验可以套。",src:"面经-腾讯产品策划26"},
{id:"q022",co:"腾讯",track:"产品经理",round:"HR面",type:"行为面",q:"如果给你 offer，你会怎么选择？",hint:"诚实但有主线：说清你的选择标准（业务复杂度、成长速度、和长期方向的一致性），再说这家为什么符合。",src:"面经-腾讯产品策划26"},
{id:"q050",co:"腾讯",track:"产品经理",round:"Case",type:"Case",q:"针对信用卡活跃用户，设计一个有先进性和商业可行性的全面用卡管理服务方案（需求分析 / 市场分析 / 竞品分析 / 商业化分析）",hint:"腾讯未来产品经理创造营真题。切入点：不同银行服务能力有差异、不同系列权益差异大 → 聚合型用卡管理。要给用户分层、核心场景（还款提醒、权益提醒、账单聚合、额度管理）和变现路径（导流办卡分佣、精选权益、数据服务）。",src:"创造营"},
{id:"q051",co:"腾讯",track:"产品经理",round:"Case",type:"Case",q:"基于 QQ 浏览器的产品现状，结合 AI 大模型设计相关功能优化项，给出用户需求洞察、设计思路与基础原型",hint:"腾讯未来产品经理创造营真题。别做「加个对话框」。找搜索场景里 AI 真正能改的环节：意图理解、结果聚合与二次追问、长文档处理、结果可信度标注。",src:"创造营"},
{id:"q060",co:"字节跳动",track:"商业分析",round:"一面",type:"行为面",q:"请做一个自我介绍，重点突出你的商业化相关经验",hint:"",src:"面经-字节商业化26"},
{id:"q061",co:"字节跳动",track:"商业分析",round:"一面",type:"业务面",q:"你如何理解商业化运营这个岗位？",hint:"三方平衡：广告主要 ROI、平台要收入和体验、用户要不被打扰。商业化的本质是在这三者间找可持续的定价与分配。",src:"面经-字节商业化26"},
{id:"q062",co:"字节跳动",track:"商业分析",round:"一面",type:"Case",q:"假设你负责一个美妆品牌在抖音的广告投放，客户 KPI 是降低获客成本，你会从哪些方面优化？",hint:"拆 CAC = 花费/新客数 = CPM ÷ (CTR × CVR × 新客占比)。",src:"面经-字节商业化26"},
{id:"q063",co:"字节跳动",track:"商业分析",round:"一面",type:"业务面",q:"某客户上周消耗 10 万元获得 500 个转化，客单价 200 元；本周消耗 15 万元获得 600 个转化。请分析本周投放表现变好还是变差了？",hint:"先算 CPA：上周 200 元/转化，本周 250 元/转化，CPA 上升 25%。ROI：上周 500×200/10万=1.0，本周 600×200/15万=0.8。所以变差了。但要补充追问：客单价是否变化、是否在放量期（放量必然抬 CPA）、新客占比、竞价环境。",src:"面经-字节商业化26"},
{id:"q064",co:"字节跳动",track:"商业分析",round:"二面",type:"业务面",q:"请谈谈你对抖音电商直播商业化的理解",hint:"人货场 + 流量结构（自然流/付费流/私域）+ 三个核心指标（GPM、ROI、UV 价值）。对比货架电商的差异。",src:"面经-字节商业化26"},
{id:"q065",co:"字节跳动",track:"商业分析",round:"二面",type:"业务面",q:"如果一个 KA 客户的广告消耗连续两周下滑，你会如何做客户留存？",hint:"先归因：是客户预算减少、还是效果变差、还是被竞品分流。分别对应不同动作。别一上来就给折扣。",src:"面经-字节商业化26"},
{id:"q066",co:"字节跳动",track:"商业分析",round:"交叉面",type:"Case",q:"给你一个从来没接触过的新行业（如宠物经济），你怎么快速了解这个行业的商业化机会？",hint:"再叠加商业化视角：谁付钱、为什么付、现在花在哪。",src:"面经-字节商业化26"},
{id:"q067",co:"字节跳动",track:"商业分析",round:"交叉面",type:"Case",q:"客户预算 50 万/月，要在抖音做品牌曝光但不考核转化，你会如何制定投放策略？",hint:"不考核转化不等于不考核。给预算分配和排期。",src:"面经-字节商业化26"},
{id:"q068",co:"字节跳动",track:"商业分析",round:"交叉面",type:"行为面",q:"如果你和一位销售同事在客户策略上有分歧，你会怎么处理？",hint:"",src:"面经-字节商业化26"},
{id:"q069",co:"字节跳动",track:"产品运营",round:"一面",type:"业务面",q:"你平时使用抖音/今日头条吗？你觉得它有什么可以改进的地方？",hint:"给具体场景+具体断点，不要泛泛说「推荐不准」。",src:"面经-字节运营26"},
{id:"q070",co:"字节跳动",track:"产品运营",round:"一面",type:"业务面",q:"如果让你负责提升某款产品的次日留存率，你会怎么做？",hint:"",src:"面经-字节运营26"},
{id:"q072",co:"字节跳动",track:"产品运营",round:"一面",type:"Case",q:"如果给你一个全新的产品（比如效率工具 App），你会如何从 0 到 1 做用户增长？",hint:"先找 PMF 再谈增长：种子用户从哪来 → 验证核心价值 → 找到可复制的获客渠道 → 再规模化。你有华音的真实 0-1 经验。",src:"面经-字节运营26"},
{id:"q073",co:"字节跳动",track:"产品运营",round:"HR面",type:"行为面",q:"你如何看待加班？如果项目紧急需要你连续加班一周，你会怎么处理？",hint:"",src:"面经-字节运营26"},
{id:"q074",co:"字节跳动",track:"产品运营",round:"HR面",type:"行为面",q:"你觉得你做运营最大的优势是什么？最大的不足是什么？",hint:"",src:"面经-字节运营26"},
{id:"q075",co:"字节跳动",track:"产品运营",round:"HR面",type:"行为面",q:"你最近在关注什么互联网产品或行业趋势？",hint:"准备 1 个具体产品 + 1 个趋势判断（AI 从技术驱动转向场景深耕）。要有自己的观点而不是复述新闻。",src:"面经-字节运营26"},
{id:"q080",co:"美团",track:"产品运营",round:"一面",type:"行为面",q:"请做一个简短的自我介绍，并说明你为什么选择业务运营岗位",hint:"",src:"面经-美团运营26"},
{id:"q081",co:"美团",track:"产品运营",round:"一面",type:"业务面",q:"如果你发现某城市的外卖订单量连续两周下滑，你会从哪些维度进行数据分析？",hint:"外卖特有维度：供给侧（商家在线数、骑手运力）、需求侧（UV、下单转化）、天气/季节、竞对补贴、履约时效。",src:"面经-美团运营26"},
{id:"q082",co:"美团",track:"产品运营",round:"一面",type:"行为面",q:"请分享一段你通过优化流程提升效率的经历",hint:"",src:"面经-美团运营26"},
{id:"q083",co:"美团",track:"产品运营",round:"一面",type:"Case",q:"如果美团要进入一个新城市开展外卖业务，你会从哪些方面制定冷启动策略？",hint:"双边市场先解决鸡生蛋：选点（高密度校园/写字楼）→ 供给先行（签约标杆商家）→ 需求侧补贴 → 运力保障 → 单点跑通再复制。用「华音」的冷启动经验（政府 B 带 C、KOL、私域）做类比。",src:"面经-美团运营26"},
{id:"q084",co:"美团",track:"产品运营",round:"一面",type:"业务面",q:"你对「数据驱动运营」如何理解？请结合实例说明",hint:"数据驱动不是看报表，是「先有假设 → 定口径 → 验证 → 决策」。",src:"面经-美团运营26"},
{id:"q085",co:"美团",track:"产品运营",round:"二面",type:"业务面",q:"在资源有限的情况下，用户增长目标和商家增长目标存在冲突，你会如何权衡？",hint:"回到双边市场：短期看哪边是瓶颈就补哪边；长期看单位经济模型。给一个判断依据（边际投入带来的 GMV 增量）而不是和稀泥。",src:"面经-美团运营26"},
{id:"q086",co:"美团",track:"产品运营",round:"二面",type:"行为面",q:"请分享一次你在跨团队协作中推动项目落地的经历",hint:"",src:"面经-美团运营26"},
{id:"q087",co:"美团",track:"产品运营",round:"HR面",type:"行为面",q:"美团强调「以客户为中心」和「长期主义」，你如何理解这两句话在日常工作中的意义？",hint:"别背价值观。给一个你为了长期结果放弃短期数据的具体选择。",src:"面经-美团运营26"},
{id:"q130",co:"通用",track:"通用",round:"HR面",type:"行为面",q:"你为什么选择我们公司而不是竞争对手？",hint:"给一个只有这家成立的理由（独有资产/业务阶段），不要说文化好、平台大。",src:"通用高频"},
{id:"q131",co:"通用",track:"通用",round:"HR面",type:"行为面",q:"你还投了哪些公司？进展如何？",hint:"诚实但有主线：说明你的投递是围绕一个方向的，而不是海投。",src:"通用高频"},
{id:"q133",co:"通用",track:"通用",round:"HR面",type:"行为面",q:"讲一次你失败的经历，你从中学到了什么",hint:"可以讲前几次面试挂掉的复盘（诚恳且真实），或学代会对接失误。重点在「我改了什么机制」。",src:"通用高频"},
{id:"q134",co:"通用",track:"通用",round:"HR面",type:"行为面",q:"你有什么想问我们的？",hint:"",src:"通用高频"},
{id:"q135",co:"通用",track:"通用",round:"二面",type:"行为面",q:"你为什么去英国读研？读完为什么回国就业？",hint:"正面回答：专业选择（Finance with Data Science 是我需要的能力补强）+ 就业市场判断（我的目标行业主战场在国内）。别显得是备胎选择。",src:"通用高频"},
{id:"q136",co:"通用",track:"通用",round:"二面",type:"行为面",q:"你之前面过腾讯几个岗位都没过，你觉得问题出在哪？",hint:"⚠️ 大概率会被问。诚实复盘：业务侧量化口径答得虚（比如 LTV 没给公式）、经历讲得太平铺。然后说你做了什么改进——这题答好反而是加分项。",src:"通用高频"},
{id:"q140",co:"腾讯",track:"产品运营",round:"一面",type:"业务面",q:"广告投放的类型有哪些？你认为各自类型适合的场景是什么？以及对应的优劣势",hint:"两个分类轴：按目标（品牌/效果）+ 按形式（信息流/搜索/开屏/激励），每类给场景+优劣，最后落回腾讯生态。",src:"面经·腾讯广告产品一面（小红书）"},
{id:"q141",co:"腾讯",track:"产品运营",round:"一面",type:"业务面",q:"你认为对于广告分发可以有什么样的策略？",hint:"eCPM 排序公式 → 出价/预估/流量分配/频控四类策略 → 体验约束。",src:"面经·腾讯广告产品一面（小红书）"},
{id:"q142",co:"腾讯",track:"产品运营",round:"一面",type:"业务面",q:"如何在保证用户体验的同时提高广告的占比？",hint:"核心论点：冲突来自「投得不准」而非「投得太多」。四条路径 + 三个护栏指标。",src:"面经·腾讯广告产品一面（小红书）"},
{id:"q143",co:"腾讯",track:"产品运营",round:"一面",type:"业务面",q:"对于商家而言，如何提升广告投放的体验？",hint:"",src:"面经·腾讯广告产品一面（小红书）"},
{id:"q145",co:"腾讯",track:"产品运营",round:"二面",type:"业务面",q:"你觉得效果广告和品牌广告的共同点是什么？",hint:"⚠️ 问的是共同点不是区别，别一上来背区别。先给四个共同点，再补区别做对照。",src:"面经·腾讯广告产运二面（小红书）"},
{id:"q146",co:"腾讯",track:"产品运营",round:"二面",type:"业务面",q:"你对商业分析的价值怎么看？",hint:"商分的价值 = 把模糊的业务判断变成可比较的口径 + 让资源分配有依据。",src:"面经·腾讯广告产运二面（小红书）"},
{id:"q147",co:"腾讯",track:"产品运营",round:"二面",type:"业务面",q:"讲讲你对效果广告的了解",hint:"",src:"面经·腾讯广告产运二面（小红书）"},
{id:"q148",co:"腾讯",track:"产品运营",round:"二面",type:"行为面",q:"你与客户/合作方沟通过程中遇到卡点的经历",hint:"",src:"面经·腾讯广告产运二面（小红书）"},
{id:"q149",co:"腾讯",track:"产品运营",round:"二面",type:"行为面",q:"你对未来三年的规划是什么样的？",hint:"",src:"面经·腾讯广告产运二面（小红书）"},
{id:"q150",co:"腾讯",track:"产品运营",round:"二面",type:"行为面",q:"你觉得你的面试表现怎么样？",hint:"给合理分数 + 一个做得好的点 + 一到两个具体可改进点。",src:"面经·腾讯广告产运二面（小红书）"},
{id:"q152",co:"腾讯",track:"产品经理",round:"群面",type:"行为面",q:"如何评价自己群面的表现？给群面的自己打个分，有什么值得提升的地方？",hint:"这是展现自我反思的机会，别给满分也别自贬。",src:"面经·腾讯（小红书）"},
{id:"q153",co:"腾讯",track:"产品经理",round:"一面",type:"业务面",q:"用 1 分钟的时间向我介绍你做过的一款产品",hint:"⚠️ 限时题，容易被问懵。四件事：核心价值→目标用户→市场定位→你的贡献。",src:"面经·腾讯（小红书）"},
{id:"q154",co:"腾讯",track:"产品经理",round:"一面",type:"业务面",q:"如何理解产品经理这个角色？产品策划最关键的能力是什么？",hint:"面经明确提醒：腾讯面试官是古典产品思路，不要背套话，不要说擅长画原型图。",src:"面经·腾讯（小红书）"},
{id:"q155",co:"腾讯",track:"产品经理",round:"一面",type:"业务面",q:"产品经理为什么要做竞品分析？",hint:"面经里这人说自己答得不好（只说了「了解市场+挖掘空白」）。更好的答法：竞品分析是为了做决策而不是为了了解——三个用途：定差异化方向、做功能优先级参照、预警风险。",src:"面经·腾讯（小红书）"},
{id:"q156",co:"腾讯",track:"产品经理",round:"一面",type:"Case",q:"情景模拟：给你一个生活化场景，如果你是产品经理会怎么回应？",hint:"标准答法是「先分析需求再给方案」——别急着给解法。先问：谁的需求、什么场景下发生、现在他怎么解决的、这个需求是高频还是低频。",src:"面经·腾讯（小红书）"},
{id:"q157",co:"腾讯",track:"产品经理",round:"HR面",type:"行为面",q:"你来腾讯最想提升什么能力？",hint:"给一个具体的、和岗位强相关的能力缺口（比如「在真实量级的数据和用户规模下做决策」），而不是笼统的「学习成长」。",src:"面经·腾讯（小红书）"},
{id:"q170",co:"京东",track:"商业分析",round:"一面",type:"业务面",q:"如何理解零售业？你对电商的理解是什么？",hint:"人货场 + 精准匹配 + 货架场与内容场融合趋势。",src:"京东采销题库（你的 mock 文件夹）"},
{id:"q171",co:"京东",track:"商业分析",round:"一面",type:"业务面",q:"京东 vs 天猫 vs 抖音 vs 拼多多有什么区别？各自优劣势是什么？",hint:"按「主场域 + 业务模式 + 优势 + 短板」四段对比。京东：货架场+自营/POP+供应链时效，短板在非标品丰富度与内容场；阿里：货架场+品牌旗舰；拼多多：极致性价比+拼团裂变+缩短决策路径；抖音：内容场+算法+直播直观，短板在长决策周期品类和退货率。",src:"京东采销题库（你的 mock 文件夹）"},
{id:"q172",co:"京东",track:"商业分析",round:"一面",type:"业务面",q:"给你一个全新的、你没做过的品类/行业，你要如何快速适应和了解？",hint:"和「0 到 1 学电竞」是同一题。找人—找料—找场—拿粗判断去被纠正。再叠加商业视角：谁付钱、为什么付、现在花在哪。",src:"京东采销题库（你的 mock 文件夹）"},
{id:"q173",co:"京东",track:"商业分析",round:"二面",type:"Case",q:"同样的商品，其他平台卖得比我们便宜，你怎么看？怎么处理？",hint:"先拆价差来源（采购成本/补贴/服务成本/品类结构），再判断要不要跟——不是所有价差都要跟。给「跟价的判断标准 + 不跟价时用什么补」。",src:"京东采销题库（你的 mock 文件夹）"},
{id:"q174",co:"京东",track:"商业分析",round:"二面",type:"Case",q:"你的盘子这个月销售额任务 5000 万，你要如何完成？",hint:"拆公式：GMV = 流量 × 转化率 × 客单价，或按品/按渠道/按时间拆。给「盘现状→找差距→排动作→留 buffer」的结构，动作要分确定性高的和搏一把的。",src:"京东采销题库（你的 mock 文件夹）"},
{id:"q176",co:"通用",track:"通用",round:"HR面",type:"行为面",q:"对你影响最深的人是谁？/ 对你影响最深的一句话是什么？",hint:"这类题考价值观。选一个真人 + 一件具体的事 + 它如何改变了你的某个行为习惯。别升华成鸡汤。",src:"京东采销题库（你的 mock 文件夹）"},
{id:"q177",co:"通用",track:"通用",round:"HR面",type:"行为面",q:"你入职后发现这个岗位的工作和你预期不一致，怎么办？",hint:"先分清是「内容不符」还是「预期错误」。给出三步：先做满一个周期再判断→主动和 leader 对齐期望→如果确实错配，说明你会怎么沟通而不是直接走人。",src:"京东采销题库（你的 mock 文件夹）"},
{id:"q178",co:"通用",track:"通用",round:"二面",type:"行为面",q:"如果你和领导或同事产生不同意见和矛盾，如何处理？",hint:"保持冷静→倾听并理解对方立场→找共同目标→基于事实（数据）而非立场寻求方案→事后修复关系。",src:"京东采销题库（你的 mock 文件夹）"},
{id:"q180",co:"字节跳动",track:"商业分析",round:"一面",type:"业务面",q:"怎么理解「生态」？内容生态是怎么运转的？",hint:"生态四特征 → 创作者-内容-平台-用户闭环 → 定性定量指标 → 四类策略抓手。",src:"抖音生态策略运营 JD 拆解（你的文档）"},
{id:"q181",co:"字节跳动",track:"商业分析",round:"一面",type:"业务面",q:"如果让你评估一类内容标准是否合理，你会怎么做？",hint:"定性（找典型 case 人工评审、看审核一致性）+ 定量（覆盖率、误判率、申诉率、对创作者留存和用户消费时长的影响）。标准要能被执行者读懂——沉淀成知识库。",src:"抖音生态策略运营 JD（你的文档）"},
{id:"q182",co:"字节跳动",track:"产品运营",round:"一面",type:"业务面",q:"从电商角度，你认为小红书电商和抖音电商有什么异同？",hint:"从目标用户、产品定位、商业模式、未来发展四层对比。小红书靠 UGC 种草和社区互动，抖音靠短视频+KOL 的站内闭环。",src:"字节面试经验（你的文档）"},
{id:"q183",co:"通用",track:"产品经理",round:"一面",type:"行为面",q:"你为什么想当产品经理？",hint:"别只讲情怀。",src:"字节面试经验（你的文档）"},
{id:"g001",co:"通用题",track:"考公 / 选调",round:"结构化面试",type:"综合分析",q:"有人说「躺平」是年轻人的一种自我保护，你怎么看？",hint:"亮明观点 → 分析原因（个人、社会、制度）→ 辩证看待 → 落到对策和自身做法。",src:"Offer 通用题"},
{id:"g002",co:"通用题",track:"考公 / 选调",round:"结构化面试",type:"组织管理",q:"领导让你组织一次面向社区老人的防诈骗宣传活动，你会怎么做？",hint:"明确目标与对象 → 前期调研 → 内容与形式 → 人员分工 → 应急预案 → 总结反馈。",src:"Offer 通用题"},
{id:"g003",co:"通用题",track:"考公 / 选调",round:"结构化面试",type:"应急应变",q:"群众到窗口办事因材料不全情绪激动，你怎么处理？",hint:"先稳情绪 → 耐心解释政策 → 给出可操作的补救办法（容缺、代办、预约）→ 事后反思流程。",src:"Offer 通用题"},
{id:"g004",co:"通用题",track:"考公 / 选调",round:"结构化面试",type:"人际关系",q:"你提出的工作建议被同事当众否定，你怎么办？",hint:"冷静 → 反思自身 → 私下沟通了解原因 → 以工作为重 → 共同完善方案。",src:"Offer 通用题"},
{id:"g005",co:"通用题",track:"考公 / 选调",round:"结构化面试",type:"岗位认知",q:"你为什么报考这个岗位？你对基层工作有什么认识？",hint:"结合职位表的岗位职责 → 你的专业与经历 → 对基层困难的真实认识 → 具体打算。",src:"Offer 通用题"},
{id:"g006",co:"通用题",track:"国企央企与银行",round:"一面",type:"行为面",q:"你为什么选择银行 / 国企，而不是互联网公司？",hint:"稳定之外的理由：行业理解、职业路径、与自己能力的匹配；避免贬低其他选择。",src:"Offer 通用题"},
{id:"g007",co:"通用题",track:"国企央企与银行",round:"一面",type:"业务面",q:"说说你对本行 / 本公司近期业务重点的了解。",hint:"提前看年报、官网新闻：战略方向 → 一个具体业务 → 你能贡献什么。",src:"Offer 通用题"},
{id:"g008",co:"通用题",track:"国企央企与银行",round:"一面",type:"行为面",q:"如果被分配到基层网点 / 偏远项目，你能接受吗？",hint:"真实表态 + 理由 + 你打算从基层学到什么；不要空喊口号。",src:"Offer 通用题"},
{id:"g009",co:"通用题",track:"法学",round:"一面",type:"业务面",q:"请介绍一个你参与过的案件或项目，你在其中具体做了什么？",hint:"案件类型 → 你的任务（检索、起草、整理证据）→ 产出 → 学到的实务技能；注意保密。",src:"Offer 通用题"},
{id:"g010",co:"通用题",track:"法学",round:"一面",type:"业务面",q:"为什么选择我们所 / 这个业务领域？",hint:"所的业务特点和代表案例 → 你的兴趣来源（课程、实习、论文）→ 匹配点。",src:"Offer 通用题"},
{id:"g011",co:"通用题",track:"法学",round:"二面",type:"Case",q:"客户的合同对方违约，客户想立即停止付款，你会给出什么建议？",hint:"先查合同条款（违约、抗辩权、解除条件）→ 风险 → 可选路径 → 建议 + 需要补充的事实。",src:"Offer 通用题"},
{id:"g012",co:"通用题",track:"法学",round:"一面",type:"行为面",q:"高强度加班时你如何保证交付质量？",hint:"具体例子：时间管理、复核清单、及时沟通风险。",src:"Offer 通用题"},
{id:"g013",co:"通用题",track:"教师",round:"试讲",type:"业务面",q:"请用 10 分钟试讲本学科的一个知识点。",hint:"导入 → 新授（板书、互动提问）→ 练习 → 小结 → 作业；控制时间，体现学生主体。",src:"Offer 通用题"},
{id:"g014",co:"通用题",track:"教师",round:"结构化面试",type:"行为面",q:"课堂上有学生故意捣乱，你会怎么处理？",hint:"不中断教学为先 → 眼神 / 走近提醒 → 课后单独沟通了解原因 → 家校配合。",src:"Offer 通用题"},
{id:"g015",co:"通用题",track:"教师",round:"结构化面试",type:"岗位认知",q:"你为什么想当老师？",hint:"真实经历（支教、家教、影响你的老师）→ 对教师职业的理解 → 你的优势。",src:"Offer 通用题"},
{id:"g016",co:"通用题",track:"教师",round:"结构化面试",type:"行为面",q:"家长对你的教学方法提出质疑，你怎么回应？",hint:"倾听 → 解释依据 → 展示学生进步的证据 → 吸收合理建议 → 保持沟通。",src:"Offer 通用题"},
{id:"g017",co:"通用题",track:"医疗",round:"一面",type:"业务面",q:"介绍一个你在轮转中印象最深的病例。",hint:"病例概况 → 诊疗思路 → 你参与的部分 → 反思；注意保护患者隐私。",src:"Offer 通用题"},
{id:"g018",co:"通用题",track:"医疗",round:"一面",type:"行为面",q:"遇到情绪激动、不配合的患者或家属，你会怎么沟通？",hint:"共情 → 解释病情和方案 → 必要时请上级 → 记录；强调安全和规范。",src:"Offer 通用题"},
{id:"g019",co:"通用题",track:"医疗",round:"一面",type:"岗位认知",q:"为什么选择我们医院 / 这个科室？",hint:"医院和科室特色 → 你的方向与科研 → 能为科室做什么。",src:"Offer 通用题"},
{id:"g020",co:"通用题",track:"通用",round:"一面",type:"行为面",q:"请做一个 1 分钟自我介绍。",hint:"定位一句话 → 两段最相关经历（带事实）→ 能力 → 为什么是这个岗位。",src:"Offer 通用题"},
{id:"g021",co:"通用题",track:"通用",round:"一面",type:"行为面",q:"讲一次你遇到困难并解决的经历。",hint:"STAR：情境 → 任务 → 你的行动（重点）→ 结果 + 反思。",src:"Offer 通用题"},
{id:"g022",co:"通用题",track:"通用",round:"一面",type:"行为面",q:"讲一次和别人意见不一致的经历，你怎么处理？",hint:"先理解对方目标 → 用事实沟通 → 找共同点 → 结果；不要贬低对方。",src:"Offer 通用题"},
{id:"g023",co:"通用题",track:"通用",round:"HR 面",type:"行为面",q:"你的职业规划是什么？",hint:"1–3 年具体目标 → 与岗位成长路径对齐 → 你已在做的准备。",src:"Offer 通用题"},
{id:"g024",co:"通用题",track:"通用",round:"HR 面",type:"反问",q:"你还有什么问题想问我们吗？",hint:"问团队、培养方式、岗位考核；不问官网能查到的和薪资福利细节。",src:"Offer 通用题"},
];
function appsInPhase(){ return (S.apps||[]).filter(a=>(a.phase||"秋招")!=="实习期"); }
/* ===================== 面试复盘 ===================== */
let revPhase="全部";
function renderRevPhaseBar(){
  const box=document.getElementById("revPhaseBar"); if(!box) return;
  const n=p=>p==="全部"?S.reviews.length:S.reviews.filter(r=>(r.phase||"秋招")===p).length;
  box.innerHTML=["全部","秋招","实习期"].map(p=>
    `<div class="chip ${p===revPhase?"on":""}" onclick="revPhase='${p}';renderReviews()">${p} ${n(p)}</div>`).join("")
    +`<span class="muted" style="margin-left:8px">「实习期」是投实习时的面试，不计入本季</span>`;
}
function renderReviews(){
  renderReviewAnalysis();
  const kw=(document.getElementById("revSearch").value||"").toLowerCase();
  let list=[...S.reviews].reverse();
  if(revPhase!=="全部") list=list.filter(r=>(r.phase||"秋招")===revPhase);
  if(kw) list=list.filter(r=>JSON.stringify(r).toLowerCase().includes(kw));
  renderRevPhaseBar();
  document.getElementById("reviewList").innerHTML = list.length? list.map(r=>{
    const sc=(r.qs||[]).filter(q=>q.score);
    const avg=sc.length? sc.reduce((s,q)=>s+q.score,0)/sc.length : 0;
    const fails=(r.qs||[]).flatMap(q=>q.fail||[]), lowN=(r.qs||[]).filter(q=>q.score&&q.score<=2).length;
    return `<article class="rvc">
      <header class="rvc-h">
        <div><div class="rvc-t"><b>${esc(r.company)}</b><span>${esc(r.role)}</span></div>
          <div class="rvc-f">${[esc(r.round),r.date&&esc(r.date),r.interviewer&&esc(r.interviewer),r.minutes&&r.minutes+" 分钟",(r.qs||[]).length+" 题"].filter(Boolean).join(" · ")}</div></div>
        <div class="rvc-r">${r.result?`<span class="rvc-badge ${r.result==="过"?"ok":"bad"}">${esc(r.result)}</span>`:""}${avg?`<span class="rvc-avg" title="逐题自评均分"><b class="num">${avg.toFixed(1)}</b><i>/5</i></span>`:""}
          <button class="btn sm ghost" onclick="openReview('${r.id}')">编辑</button></div>
      </header>
      ${r.radar?`<div class="rvc-dims">${RADAR_DIMS.map(d=>{const v=(r.radar||{})[d]||0;return `<span class="rv-dim ${v&&v<3?"low":""}">${d} <b class="num">${v||"–"}</b></span>`}).join("")}</div>`:""}
      ${r.summary?`<p class="rvc-sum">${nl2(r.summary)}</p>`:""}
      ${fails.length?`<div class="qj-risk rvc-fails">${[...new Set(fails)].slice(0,6).map(x=>`<span>${esc(x)}</span>`).join("")}</div>`:""}
      ${r.nextAction?`<p class="rvc-next"><b>下一步</b>${esc(r.nextAction)}</p>`:""}
      <details class="rvc-more"><summary>逐题记录（${(r.qs||[]).length}）${lowN?` · ${lowN} 题低分`:""}${r.signals?" · 面试官信号":""}</summary>
        ${r.signals?`<div class="ablock"><h2 class="h5">面试官反应信号</h2><div class="body">${nl2(r.signals)}</div></div>`:""}
        ${(r.qs||[]).map(q=>`<div class="rq">
          <div class="rq-q">${esc(q.q)}<span class="rq-m">${[q.type&&esc(q.type),q.score&&`<b class="${q.score<3?"bad":""}">${q.score} / 5</b>`].filter(Boolean).join(" · ")}</span></div>
          ${(q.fail||[]).length?`<div class="rq-fail">失分：${q.fail.map(esc).join("、")}</div>`:""}
          ${q.my?`<div class="muted" style="margin-top:6px"><b>我答：</b>${esc(q.my)}</div>`:""}
          ${q.fix?`<div class="rq-fix"><b>下次改：</b>${esc(q.fix)}</div>`:""}
          <div class="rq-act"><button class="btn sm ghost" onclick="promoteToBank(${JSON.stringify(JSON.stringify(q.q))})">存入答案库</button></div>
        </div>`).join("")}</details>
      <footer class="rvc-act">${lowN?`<button class="btn sm" onclick="drillWeak()">针对低分题开 Mock</button>`:""}<button class="btn sm ghost" onclick="go('mock')">再练一轮</button></footer>
    </article>`;}).join("")
   : '<div class="card"><div class="empty"><div class="ic">🗒️</div>还没有复盘。这是整套系统里最值钱的模块——面完 30 分钟内记下来。</div></div>';
}
function renderReviewAnalysis(){
  const box=document.getElementById("revAnalysis");
  const qs=allQs(); if(!qs.length){ box.innerHTML=""; return; }
  const fs=failStats(), rep=repeatedQs(), weak=weakQs();
  const byType={}; qs.forEach(q=>{ if(q.score){ const t=q.type||"未分类"; (byType[t]=byType[t]||[]).push(q.score); } });

  box.innerHTML = `
  <section class="rv-ana">
    <h2 class="sec-h">你反复在哪里失分</h2>
    <div class="grid g3">
      <div>
        <div class="muted" style="margin-bottom:8px">能力雷达（跨场平均）</div>
        ${radarAvg().map(({d,v})=>`<div class="hb"><span>${d}</span><i><b style="width:${v/5*100}%"></b></i><em class="${v&&v<3?"low":""}">${v?v.toFixed(1):"–"}</em></div>`).join("")}
      </div>
      <div>
        <div class="muted" style="margin-bottom:8px">失败模式 Top（点击加练）</div>
        ${fs.length? fs.slice(0,6).map(([f,o])=>`<div style="padding:6px 0;border-bottom:1px solid #F4F4F4;display:flex;justify-content:space-between;align-items:center;gap:8px">
          <span style="font-size:13px">${esc(f)}</span><b class="num">${o.n} 次</b></div>`).join("")
          : '<div class="muted">还没有打过失败模式标签</div>'}
      </div>
      <div>
        <div class="muted" style="margin-bottom:8px">按题型表现</div>
        ${Object.keys(byType).length? Object.entries(byType).map(([t,arr])=>{const a=arr.reduce((x,y)=>x+y,0)/arr.length;
          return `<div class="hb"><span>${t}</span><i><b style="width:${a/5*100}%"></b></i><em class="${a<3?"low":""}">${a.toFixed(1)}</em></div>`;}).join("")
          : '<div class="muted">—</div>'}
      </div>
    </div>
    ${rep.length?`<div class="ablock"><h2 class="h5">跨场重复出现的题（这些是必背题）</h2>
      ${rep.slice(0,6).map(x=>`<div style="padding:7px 0;border-bottom:1px solid #F4F4F4;font-size:13px">
        ${esc(x.q)} <span class="muted">· 出现 ${x.hits.length} 次</span>
        <span class="muted"> · 得分 ${x.hits.filter(h=>h.score).map(h=>h.score+"★").join(" → ")||"未评分"}</span></div>`).join("")}
      <div class="muted" style="margin-top:8px">同一道题分数没有上升，说明上一场的复盘没有真的落地。</div></div>`:""}
    <div style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap">
      <button class="btn pri" onclick="drillWeak()">针对弱项开一轮 Mock（${weak.length} 道低分题）</button>
      <button class="btn" onclick="showChecklist()">复盘引导清单</button>
    </div>
  </section>`;
}
function showChecklist(){
  openModal("面完 30 分钟内，按这个填",
  `<div class="ablock"><h2 class="h5">为什么是 30 分钟</h2><div class="body">面试结束后 24 小时，你能回忆起的细节会掉一半以上；而恰恰是细节（面试官在哪一句话上追问、他的表情、他跳过了什么）决定了复盘有没有用。所以先粗填，晚上再补。</div></div>
   <div class="ablock"><h2 class="h5">必填的六件事</h2><div class="body">1. 他问了哪些题？——凭记忆先把题干列出来，答案可以晚点补\n2. 哪一题我卡住了？卡在哪一秒？——卡壳的位置比答错更重要\n3. 他在哪里追问了？追问说明他在意，也说明我第一遍没答透\n4. 他跳过了什么？——跳过意味着他不感兴趣，或者他觉得你答完了\n5. 我有没有把话落回岗位？——大部分人答完就停在自己身上\n6. 反问环节我问了什么？他的回答透露了什么？</div></div>
   <div class="ablock"><h2 class="h5">三个容易被忽略的信号</h2><div class="body">· 面试官开始看表 / 加快节奏 → 通常是已经做完判断了\n· 他开始介绍团队和业务 → 正向信号，他在向你推销\n· 他反复回到同一个话题 → 那是他的关注点，也可能是他的怀疑点</div></div>
   <div class="ablock"><h2 class="h5">最后一步：把结论变成动作</h2><div class="body">复盘不是写感想。每场复盘至少产出一条「下次我会具体怎么做」的动作——比如「凡是问怎么衡量，先给公式再给案例」。没有动作的复盘等于没复盘。</div></div>`);
}
function drillWeak(){
  const weak=weakQs(); if(!weak.length) return toast("还没有低分题，先去复盘里打分");
  const norm=s=>String(s).replace(/[\s，。？?、,.:：（）()「」""]/g,"").slice(0,10);
  const keys=weak.map(q=>norm(q.q));
  const pool=S.questions.filter(q=>keys.some(k=>k&&norm(q.q).includes(k.slice(0,6))));
  const extra=weak.map((w,i)=>({id:"drill-"+i,co:w._r?w._r.company:"复盘",track:"弱项",round:w._r?w._r.round:"一面",
    type:w.type||"业务面",q:w.q,hint:w.fix||"（复盘时没写改进方案，这次自己想）",src:"你的复盘弱项"}));
  const merged=[...extra, ...pool.filter(p=>!extra.some(e=>e.q===p.q))];
  go("mock");
  setTimeout(()=>{ startMockWith(merged.slice(0,12), {co:"弱项加练",track:"低分题",round:"专项"}); },300);
}
function reviewPhaseField(r){
  return `<div><label>属于哪一轮求职</label><select class="inp" id="r_phase">
    ${["秋招","实习期"].map(p=>`<option ${p===(r&&r.phase||"秋招")?"selected":""}>${p}</option>`).join("")}</select></div>`;
}
function openReview(id, appId){
  const r = id? S.reviews.find(x=>x.id===id)
    : {appId:appId||"",company:"",role:"",round:"一面",date:qzDay(),result:"",
       interviewer:"业务面试官",minutes:"",signals:"",summary:"",nextAction:"",
       radar:Object.fromEntries(RADAR_DIMS.map(d=>[d,3])),
       qs:[{q:"",type:"业务面",my:"",score:3,fail:[],fix:""}]};
  window._tmpQs = JSON.parse(JSON.stringify(r.qs||[]));
  window._tmpRadar = JSON.parse(JSON.stringify(r.radar||Object.fromEntries(RADAR_DIMS.map(d=>[d,3]))));
  openModal(id?"编辑复盘":"新增面试复盘",
   `<div style="background:var(--tc-blue-1);border-radius:8px;padding:10px 13px;margin-bottom:14px;font-size:13px;color:var(--t2)">
      先把题干和卡壳的地方记下来，答案和分数可以晚点补。<a href="javascript:void(0)" onclick="closeModal();showChecklist()">看引导清单 →</a></div>
    <div class="frow f2"><div><label>关联投递</label><select class="inp" id="r_app" onchange="syncAppInfo()">
      <option value="">（不关联）</option>${appsInPhase().map(a=>`<option value="${a.id}" ${a.id===r.appId?"selected":""}>${esc(a.company)} · ${esc(a.role)}</option>`).join("")}</select></div>
      <div><label>面试日期</label><input class="inp" id="r_date" value="${esc(r.date||"")}"></div></div>
    <div class="frow f3"><div><label>公司</label><input class="inp" id="r_company" value="${esc(r.company)}"></div>
      <div><label>岗位</label><input class="inp" id="r_role" value="${esc(r.role)}"></div>
      <div><label>轮次</label><select class="inp" id="r_round">${["一面","二面","三面/交叉面","HR面","群面","笔试/测评"].map(x=>`<option ${x===r.round?"selected":""}>${x}</option>`).join("")}</select></div></div>
    <div class="frow f3"><div><label>面试官类型</label><select class="inp" id="r_interviewer">${["业务面试官","部门 leader","交叉面试官","HR","群面官"].map(x=>`<option ${x===r.interviewer?"selected":""}>${x}</option>`).join("")}</select></div>
      <div><label>时长（分钟）</label><input class="inp" id="r_minutes" value="${esc(r.minutes||"")}" placeholder="45"></div>
      <div><label>结果</label><select class="inp" id="r_result"><option value="">未知</option><option ${r.result==="过"?"selected":""}>过</option><option ${r.result==="挂"?"selected":""}>挂</option></select></div></div>
    <div class="sechead" style="margin-top:8px">能力自评（1-5）</div>
    <div class="frow f4" id="radarBox">${RADAR_DIMS.map(d=>
      `<div><label>${d}</label><select class="inp" onchange="_tmpRadar['${d}']=+this.value">${[1,2,3,4,5].map(n=>`<option value="${n}" ${n===(window._tmpRadar[d]||3)?"selected":""}>${n}</option>`).join("")}</select></div>`).join("")}</div>
    <div class="frow"><div><label>面试官反应信号（他在哪追问 / 跳过了什么 / 有没有开始介绍团队）</label><textarea class="inp" id="r_signals" style="min-height:60px">${esc(r.signals||"")}</textarea></div></div>
    <div class="frow"><div><label>整体复盘（一句话说清这场的最大问题）</label><textarea class="inp" id="r_summary" style="min-height:60px">${esc(r.summary||"")}</textarea></div></div>
    <div class="frow"><div><label>下一步动作（必填一条具体的、可执行的）</label><textarea class="inp" id="r_next" style="min-height:60px" placeholder="例：凡是问「怎么衡量」，先给公式再给案例">${esc(r.nextAction||"")}</textarea></div></div>
    <div class="sechead" style="margin-top:6px">逐题记录</div><div id="qsBox"></div>
    <button class="btn sm" onclick="addQ()">+ 加一题</button>`,
   `${id?`<button class="btn danger" onclick="delReview('${id}')">删除</button>`:""}<button class="btn" onclick="closeModal()">取消</button><button class="btn pri" onclick="saveReview('${id||""}')">保存</button>`, true);
  renderQs(); if(!id&&appId) syncAppInfo();
}
function syncAppInfo(){
  const a=S.apps.find(x=>x.id===document.getElementById("r_app").value);
  if(a){ document.getElementById("r_company").value=a.company; document.getElementById("r_role").value=(a.dept?a.dept+" · ":"")+a.role; }
}
const QTYPES=["业务面","行为面","简历深挖","Case","反问","笔试"];
function renderQs(){
  document.getElementById("qsBox").innerHTML = window._tmpQs.map((q,i)=>
   `<div style="border:1px solid var(--bd);border-radius:9px;padding:12px;margin-bottom:10px;background:#FCFCFD">
     <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
       <b style="font-size:13px;color:var(--t3)">第 ${i+1} 题</b><button class="btn sm danger" onclick="rmQ(${i})">删除</button></div>
     <div class="frow f2" style="margin-bottom:10px">
       <div><label>面试官问了什么</label><input class="inp" value="${esc(q.q)}" oninput="_tmpQs[${i}].q=this.value"></div>
       <div><label>题型</label><select class="inp" onchange="_tmpQs[${i}].type=this.value">${QTYPES.map(t=>`<option ${t===(q.type||"业务面")?"selected":""}>${t}</option>`).join("")}</select></div></div>
     <div class="frow"><div><label>我当时怎么答的</label><textarea class="inp" style="min-height:52px" oninput="_tmpQs[${i}].my=this.value">${esc(q.my)}</textarea></div></div>
     <div class="frow"><div><label>失败模式（多选，这是统计的关键）</label>
       <div style="display:flex;flex-wrap:wrap;gap:6px">${FAIL_MODES.map(f=>
         `<span class="chip" style="padding:4px 10px;font-size:12px${(q.fail||[]).includes(f)?';background:var(--red);border-color:var(--red);color:#fff':''}" onclick="toggleFail(${i},'${f}')">${f}</span>`).join("")}</div></div></div>
     <div class="frow f2"><div><label>自评（1-5）</label><select class="inp" onchange="_tmpQs[${i}].score=+this.value">${[1,2,3,4,5].map(n=>`<option value="${n}" ${n===q.score?"selected":""}>${n} ★</option>`).join("")}</select></div>
       <div><label>下次怎么改</label><input class="inp" value="${esc(q.fix)}" oninput="_tmpQs[${i}].fix=this.value"></div></div>
   </div>`).join("");
}
function toggleFail(i,f){ const a=window._tmpQs[i]; a.fail=a.fail||[];
  const k=a.fail.indexOf(f); if(k>=0) a.fail.splice(k,1); else a.fail.push(f); renderQs(); }
function addQ(){ window._tmpQs.push({q:"",type:"业务面",my:"",score:3,fail:[],fix:""}); renderQs(); }
function rmQ(i){ window._tmpQs.splice(i,1); renderQs(); }
function saveReview(id){
  const g=k=>document.getElementById("r_"+k).value;
  const o={appId:g("app"),company:g("company").trim(),role:g("role").trim(),round:g("round"),date:g("date"),
    result:g("result"),interviewer:g("interviewer"),minutes:g("minutes"),signals:g("signals"),
    summary:g("summary"),nextAction:g("next"),radar:window._tmpRadar,qs:window._tmpQs.filter(q=>q.q.trim())};
  if(!o.company) return toast("公司必填");
  if(id){ Object.assign(S.reviews.find(x=>x.id===id),o); } else { o.id=uid("r"); S.reviews.push(o); }
  save(); closeModal(); renderReviews(); renderDash(); toast("复盘已保存");
}
function delReview(id){ if(!confirm("删除这条复盘？")) return; S.reviews=S.reviews.filter(x=>x.id!==id); save(); closeModal(); renderReviews(); renderDash(); }
function promoteToBank(q){ try{q=JSON.parse(q)}catch(e){} openAnswer(null,q); }

/* ===================== 答案库 ===================== */
let bankCat="全部";
const CATS=["全部","简历可用","岗位知识","自我介绍","行为面","业务面","简历深挖","反问"];
const EDIT_CATS=["自我介绍","行为面","业务面","简历深挖","反问"];
function isPersonalAnswer(a){ return a.evidence&&a.evidence.kind==="个人经历回答"; }
function renderBankFilters(){
  document.getElementById("bankFilters").innerHTML = CATS.map(c=>
    `<div class="chip ${c===bankCat?"on":""}" onclick="bankCat='${c}';renderBankFilters();renderBank()">${c}${c==="全部"?` (${S.answers.length})`:c==="简历可用"?` (${S.answers.filter(isPersonalAnswer).length})`:c==="岗位知识"?` (${S.answers.filter(a=>!isPersonalAnswer(a)).length})`:` (${S.answers.filter(a=>a.cat===c).length})`}</div>`).join("");
}
function renderBank(){
  const kw=(document.getElementById("bankSearch").value||"").toLowerCase();
  let list=S.answers.filter(a=>bankCat==="全部"||(bankCat==="简历可用"&&isPersonalAnswer(a))||(bankCat==="岗位知识"&&!isPersonalAnswer(a))||a.cat===bankCat);
  if(kw) list=list.filter(a=>JSON.stringify(a).toLowerCase().includes(kw));
  document.getElementById("bankList").innerHTML = list.length? list.map(a=>{
   const body = a.spoken || a.answer || "";
   const ev=a.evidence||{kind:"岗位知识练习",storyIds:[],note:"未标注个人事实来源。"};
   const refs=(ev.storyIds||[]).map(id=>S.star.find(s=>s.id===id)).filter(Boolean);
   return `<div class="qa" id="qa-${a.id}">
      <div class="q" onclick="document.getElementById('qa-${a.id}').classList.toggle('open')">
        <div class="txt"><div class="qa-top"><span class="qa-cat">${esc(a.cat)}</span>${isPersonalAnswer(a)?'<span class="qa-pill me">个人经历</span>':'<span class="qa-pill">岗位知识</span>'}${(a.tags||[]).filter(t=>/挂|坑|高危|必背/.test(t)).map(t=>`<span class="qa-pill hot">${esc(t)}</span>`).join("")}</div>
          <div class="qa-q">${esc(a.q)}</div>
          ${body?`<p class="qa-prev">${esc(String(body).replace(/\s+/g," ").slice(0,96))}${String(body).length>96?"…":""}</p>`:""}</div>
        <span class="arrow">▶</span></div>
      <div class="a">
        ${a.trap?`<div class="ablock"><h2 class="h5">这题在考什么 · 坑在哪</h2><div class="body is-trap">${nl2(a.trap)}</div></div>`:""}
        ${a.frame?`<div class="ablock"><h2 class="h5">答题框架</h2><div class="body">${nl2(a.frame)}</div></div>`:""}
        <div class="ablock"><h2 class="h5">怎么说（照着说，别背）</h2><div class="body">${nl2(body)}</div></div>
        ${a.deep?`<div class="ablock"><h2 class="h5">想再聊深一层</h2><div class="body">${nl2(a.deep)}</div></div>`:""}
        ${a.noGo?`<div class="ablock"><h2 class="h5">千万别这么答</h2><div class="body is-no">${nl2(a.noGo)}</div></div>`:""}
        <div class="ablock"><h2 class="h5">${isPersonalAnswer(a)?"可引用的个人证据":"使用边界"}</h2><div class="body">${isPersonalAnswer(a)?`<b>对应经历：</b>${refs.map(s=>esc(s.title)).join("；")||"待补"}<br><span class="muted">${esc(ev.note)}</span>`:`<b>岗位知识 ≠ 个人经历。</b><br><span class="muted">${esc(ev.note)}</span>`}</div></div>
        ${a.numbers?`<div class="ablock"><h2 class="h5">要报的数</h2><div class="body">${esc(a.numbers)}</div></div>`:""}
        ${(a.followups||[]).length?`<div class="ablock"><h2 class="h5">可能的追问</h2><ul class="followups">${a.followups.map(f=>`<li>${esc(f)}</li>`).join("")}</ul></div>`:""}
        <div style="margin-top:14px;display:flex;gap:8px">
          <button class="btn sm" onclick="event.stopPropagation();openAnswer('${a.id}')">编辑</button>
          <button class="btn sm" onclick="event.stopPropagation();copyAns('${a.id}')">复制答案</button></div>
      </div></div>`;}).join("")
   : '<div class="empty-block"><p>没有匹配的答案，换个关键词或分类。</p></div>';
}
function toggleAllQA(open){ document.querySelectorAll("#bankList .qa").forEach(e=>e.classList.toggle("open",open)); }
function copyAns(id){ const a=S.answers.find(x=>x.id===id); navigator.clipboard.writeText(a.spoken||a.answer||"").then(()=>toast("已复制")); }
function openAnswer(id, presetQ){
  const a = id? S.answers.find(x=>x.id===id) : {cat:"业务面",q:presetQ||"",tags:[],trap:"",spoken:"",deep:"",noGo:"",numbers:"",followups:[]};
  openModal(id?"编辑答案":"新增答案",
   `<div class="frow f2"><div><label>分类</label><select class="inp" id="b_cat">${EDIT_CATS.map(c=>`<option ${c===a.cat?"selected":""}>${c}</option>`).join("")}</select></div>
      <div><label>标签（逗号分隔）</label><input class="inp" id="b_tags" value="${esc((a.tags||[]).join(","))}"></div></div>
    <div class="frow"><div><label>问题 *</label><input class="inp" id="b_q" value="${esc(a.q)}"></div></div>
    <div class="frow"><div><label>这题在考什么 / 坑在哪</label><textarea class="inp" id="b_trap" style="min-height:70px">${esc(a.trap||a.frame||"")}</textarea></div></div>
    <div class="frow"><div><label>怎么说（口语版）*</label><textarea class="inp" id="b_spoken" style="min-height:220px">${esc(a.spoken||a.answer||"")}</textarea></div></div>
    <div class="frow"><div><label>想再聊深一层</label><textarea class="inp" id="b_deep" style="min-height:80px">${esc(a.deep||"")}</textarea></div></div>
    <div class="frow"><div><label>千万别这么答</label><textarea class="inp" id="b_nogo" style="min-height:56px">${esc(a.noGo||"")}</textarea></div></div>
    <div class="frow"><div><label>要报的数</label><input class="inp" id="b_numbers" value="${esc(a.numbers||"")}"></div></div>
    <div class="frow"><div><label>个人事实来源 / 备注（可选）</label><input class="inp" id="b_evidence" value="${esc(a.evidenceManual||"")}" placeholder="如：某段实习里我负责的部分、可以说的数字"></div></div>
    <div class="frow"><div><label>可能的追问（每行一个）</label><textarea class="inp" id="b_fu">${esc((a.followups||[]).join("\n"))}</textarea></div></div>`,
   `${id?`<button class="btn danger" onclick="delAnswer('${id}')">删除</button>`:""}<button class="btn" onclick="closeModal()">取消</button><button class="btn pri" onclick="saveAnswer('${id||""}')">保存</button>`, true);
}
function saveAnswer(id){
  const g=k=>document.getElementById("b_"+k).value;
  if(!g("q").trim()||!g("spoken").trim()) return toast("问题和答案必填");
  const o={cat:g("cat"),q:g("q").trim(),tags:g("tags").split(/[,，]/).map(s=>s.trim()).filter(Boolean),
    trap:g("trap"),spoken:g("spoken"),deep:g("deep"),noGo:g("nogo"),numbers:g("numbers"),
    evidenceManual:g("evidence"),followups:g("fu").split("\n").map(s=>s.trim()).filter(Boolean)};
  if(id){ Object.assign(S.answers.find(x=>x.id===id),o); } else { o.id=uid("an-my-"); S.answers.push(o); }
  applyResumeAudit();
  save(); closeModal(); renderBankFilters(); renderBank(); renderDash(); toast("已保存");
}
function delAnswer(id){ if(!confirm("删除这条答案？")) return; S.answers=S.answers.filter(x=>x.id!==id); save(); closeModal(); renderBankFilters(); renderBank(); }
/* ===================== Mock 面试 ===================== */
let MK = null, mkTimerId=null;
function uniq(arr){ return [...new Set(arr)]; }
function fillMockSelects(){
  const q=S.questions;
  const set=(id,vals,label)=>{ const el=document.getElementById(id);
    el.innerHTML=`<option value="">全部${label}</option>`+vals.map(v=>`<option>${v}</option>`).join(""); el.onchange=updatePool; };
  set("mkCompany",uniq(q.map(x=>x.co)),"题源");
  set("mkTrack",uniq(q.map(x=>x.track)),"方向");
  set("mkRound",uniq(q.map(x=>x.round)),"轮次");
  document.getElementById("mkType").onchange=updatePool;
  document.getElementById("mkCount").onchange=updatePool;
  updatePool();
}
function poolQs(){
  const co=document.getElementById("mkCompany").value, tr=document.getElementById("mkTrack").value,
        rd=document.getElementById("mkRound").value, ty=document.getElementById("mkType").value;
  return S.questions.filter(q=>(!co||q.co===co)&&(!tr||q.track===tr)&&(!rd||q.round===rd)&&(ty==="all"||q.type===ty));
}
function updatePool(){ document.getElementById("mkPool").textContent = `当前筛选命中 ${poolQs().length} 道题（题库共 ${S.questions.length} 道）`; }
function startMock(){
  let pool=poolQs();
  if(pool.length<2) return toast("题太少了，放宽一下筛选条件");
  const n=Math.min(+document.getElementById("mkCount").value, pool.length);
  pool=[...pool].sort(()=>Math.random()-0.5).slice(0,n);
  startMockWith(pool, {co:document.getElementById("mkCompany").value||"混合",
    track:document.getElementById("mkTrack").value||"全方向", round:document.getElementById("mkRound").value||"全轮次"});
}
function startMockWith(list, meta){
  MK={ qs:list, i:0, limit:+(document.getElementById("mkTime").value||150),
       items:list.map(q=>({id:q.id,q:q.q,co:q.co,type:q.type,ans:"",score:0,fail:[]})),
       start:Date.now(), meta };
  document.getElementById("mockSetup").style.display="none";
  document.getElementById("mockReport").style.display="none";
  document.getElementById("mockRun").style.display="";
  showQ();
}
function showQ(){
  const q=MK.qs[MK.i];
  document.getElementById("mkNum").textContent=`第 ${MK.i+1} / ${MK.qs.length} 题`;
  document.getElementById("mkQ").textContent=q.q;
  document.getElementById("mkTagCo").textContent=(q.co||"")+" · "+(q.round||"");
  document.getElementById("mkTagType").textContent=(q.type||"")+(q.src?" · "+q.src:"");
  document.getElementById("mkHintBody").textContent=q.hint||"（这题没有预置框架，靠你自己搭）";
  document.getElementById("mkHint").style.display="none";
  document.getElementById("mkAns").value=MK.items[MK.i].ans||"";
  document.getElementById("mkBar").style.width=(MK.i/MK.qs.length*100)+"%";
  document.getElementById("mkNext").textContent = MK.i===MK.qs.length-1 ? "提交并看报告 →" : "下一题 →";
  renderRate(MK.items[MK.i].score); renderMkFail(); startTimer();
}
function renderRate(cur){
  document.getElementById("mkRate").innerHTML=[1,2,3,4,5].map(n=>`<button class="${n===cur?"on":""}" onclick="setRate(${n})">${n}</button>`).join("");
}
function setRate(n){ MK.items[MK.i].score=n; renderRate(n); renderMkFail(); }
function renderMkFail(){
  const box=document.getElementById("mkFail"); if(!box) return;
  const it=MK.items[MK.i];
  box.style.display = (it.score&&it.score<=3)? "" : "none";
  box.innerHTML = `<div class="muted" style="margin-bottom:6px">答得不好？标一下原因（会进归因统计）</div>
    <div style="display:flex;flex-wrap:wrap;gap:6px">${FAIL_MODES.map(f=>
      `<span class="chip" style="padding:4px 10px;font-size:12px${(it.fail||[]).includes(f)?';background:var(--red);border-color:var(--red);color:#fff':''}" onclick="toggleMkFail('${f}')">${f}</span>`).join("")}</div>`;
}
function toggleMkFail(f){ const it=MK.items[MK.i]; it.fail=it.fail||[];
  const k=it.fail.indexOf(f); if(k>=0) it.fail.splice(k,1); else it.fail.push(f); renderMkFail(); }
function startTimer(){
  clearInterval(mkTimerId);
  const el=document.getElementById("mkTimer");
  if(!MK.limit){ el.textContent="∞"; el.className="timer"; return; }
  let left=MK.limit;
  const tick=()=>{ const m=Math.floor(Math.abs(left)/60), s=Math.abs(left)%60;
    el.textContent=(left<0?"-":"")+String(m).padStart(2,"0")+":"+String(s).padStart(2,"0");
    el.className="timer"+(left<0?" over":left<=30?" warn":""); left--; };
  tick(); mkTimerId=setInterval(tick,1000);
}
function toggleHint(){ const h=document.getElementById("mkHint"); h.style.display=h.style.display==="none"?"":"none"; }
function nextQ(skip){
  MK.items[MK.i].ans = skip? "" : document.getElementById("mkAns").value;
  if(skip){ MK.items[MK.i].score=0; MK.items[MK.i].fail=[]; }
  if(MK.i<MK.qs.length-1){ MK.i++; showQ(); } else finishMock();
}
function quitMock(){ if(!confirm("退出会丢失本次作答，确定？")) return;
  clearInterval(mkTimerId); MK=null;
  document.getElementById("mockRun").style.display="none"; document.getElementById("mockSetup").style.display=""; }
function finishMock(){
  clearInterval(mkTimerId);
  const rec={ id:uid("m"), date:new Date().toLocaleString("zh-CN"), meta:MK.meta,
    mins:Math.max(1,Math.round((Date.now()-MK.start)/60000)), items:MK.items };
  S.mocks.push(rec); save();
  document.getElementById("mockRun").style.display="none";
  document.getElementById("mockReport").style.display="";
  document.getElementById("mockReport").innerHTML=reportHTML(rec);
  renderDash();
}
function reportHTML(rec){
  const scored=rec.items.filter(i=>i.score>0);
  const avg=scored.length? (scored.reduce((s,i)=>s+i.score,0)/scored.length) : 0;
  const answered=rec.items.filter(i=>i.ans.trim()).length;
  const weak=rec.items.filter(i=>i.score>0&&i.score<=2);
  const byType={}; rec.items.forEach(i=>{ if(i.score>0){ (byType[i.type]=byType[i.type]||[]).push(i.score); } });
  const fm={}; rec.items.forEach(i=>(i.fail||[]).forEach(f=>fm[f]=(fm[f]||0)+1));
  return `
  <div class="hero" style="background:linear-gradient(115deg,#0A2540,#0052D9)">
    <h2>Mock 复盘报告</h2>
    <div class="sub">${esc(rec.meta.co)} · ${esc(rec.meta.track)} · ${esc(rec.meta.round)} ｜ ${esc(rec.date)} ｜ 用时约 ${rec.mins} 分钟</div>
    <div class="kpis">
      <div class="kpi"><b>${rec.items.length}</b><span>题目数</span></div>
      <div class="kpi"><b>${answered}</b><span>已作答</span></div>
      <div class="kpi"><b>${avg?avg.toFixed(1):"—"}</b><span>平均自评</span></div>
      <div class="kpi"><b>${weak.length}</b><span>待攻克</span></div>
    </div>
  </div>
  <div class="grid g3">
    <div class="card pad"><div class="sechead">按题型表现</div>
      ${Object.keys(byType).length? Object.entries(byType).map(([t,arr])=>{const a=arr.reduce((x,y)=>x+y,0)/arr.length;
        return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><span style="width:64px;font-size:12.5px;flex:0 0 64px">${t}</span>
          <div style="flex:1;height:16px;background:#F2F3F5;border-radius:8px;overflow:hidden"><div style="width:${a/5*100}%;height:100%;background:${a>=4?"var(--green)":a>=3?"var(--orange)":"var(--red)"}"></div></div>
          <b style="width:28px;text-align:right;font-size:12.5px">${a.toFixed(1)}</b></div>`;}).join("") : '<div class="muted">没有打分</div>'}
    </div>
    <div class="card pad"><div class="sechead">本轮失败模式</div>
      ${Object.keys(fm).length? Object.entries(fm).sort((a,b)=>b[1]-a[1]).map(([f,n])=>
        `<div style="padding:6px 0;border-bottom:1px solid #F4F4F4;font-size:13px"><span class="tag t-red">${n}</span> ${esc(f)}</div>`).join("")
        : '<div class="muted">没有标记失败模式</div>'}
    </div>
    <div class="card pad"><div class="sechead">重点攻克（≤2 星）</div>
      ${weak.length? weak.map(i=>`<div style="padding:7px 0;border-bottom:1px solid #F2F2F2;font-size:13px"><span class="tag t-red">${i.score}★</span> ${esc(i.q)}</div>`).join("")
        : '<div class="muted">这一轮没有低分题 👍</div>'}
    </div>
  </div>
  <div style="height:16px"></div>
  <div class="card pad"><div class="sechead">逐题回看</div>
    ${rec.items.map((i,n)=>`<div style="border:1px solid var(--bd);border-radius:10px;padding:14px;margin-bottom:10px">
      <div style="font-weight:600">${n+1}. ${esc(i.q)} ${i.score?`<span class="tag ${i.score>=4?"t-green":i.score>=3?"t-orange":"t-red"}">${i.score}★</span>`:'<span class="tag t-gray">跳过</span>'}</div>
      ${(i.fail||[]).length?`<div style="margin-top:6px;display:flex;gap:5px;flex-wrap:wrap">${i.fail.map(f=>`<span class="tag t-red">${esc(f)}</span>`).join("")}</div>`:""}
      <div class="ablock"><h2 class="h5">我的回答</h2><div class="body">${nl2(i.ans)||'<span class="muted">未作答</span>'}</div></div>
      <div class="ablock"><h2 class="h5">参考框架</h2><div class="body">${nl2((S.questions.find(q=>q.id===i.id)||{}).hint||"—")}</div></div>
    </div>`).join("")}
  </div>
  <div style="display:flex;gap:9px;justify-content:center;margin-top:20px">
    <button class="btn" onclick="backToMockSetup()">← 再来一轮</button>
    <button class="btn pri" onclick="window.print()">打印 / 存 PDF</button>
  </div>`;
}
function backToMockSetup(){
  document.getElementById("mockReport").style.display="none";
  document.getElementById("mockSetup").style.display="";
  renderMockHistory(); fillMockSelects();
}
function renderMockHistory(){
  const h=[...(S.mocks||[])].reverse();
  document.getElementById("mockHistory").innerHTML = h.length? h.map(m=>{
    const sc=m.items.filter(i=>i.score>0); const avg=sc.length?(sc.reduce((s,i)=>s+i.score,0)/sc.length).toFixed(1):"—";
    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #F2F2F2;gap:12px;flex-wrap:wrap">
      <div><b>${esc(m.meta.co)} · ${esc(m.meta.track)}</b> <span class="tag t-gray">${esc(m.meta.round)}</span>
        <div class="muted">${esc(m.date)} · ${m.items.length} 题 · 均分 ${avg} · ${m.mins} 分钟</div></div>
      <div style="display:flex;gap:6px"><button class="btn sm" onclick="viewMock('${m.id}')">看报告</button>
        <button class="btn sm danger" onclick="delMock('${m.id}')">删除</button></div></div>`;}).join("")
   : '<div class="empty"><div class="ic">🎤</div>还没有 Mock 记录，上面选好条件就能开始</div>';
}
function viewMock(id){
  const m=S.mocks.find(x=>x.id===id); if(!m) return;
  document.getElementById("mockSetup").style.display="none";
  document.getElementById("mockReport").style.display="";
  document.getElementById("mockReport").innerHTML=reportHTML(m);
  window.scrollTo({top:0,behavior:"smooth"});
}
function delMock(id){ if(!confirm("删除这条 Mock 记录？")) return; S.mocks=S.mocks.filter(x=>x.id!==id); save(); renderMockHistory(); renderDash(); }



/* ===================== 素材库 ===================== */
let starTab={};
function ivStory(e){
  S.star=S.star||[];
  let s=S.star.find(x=>x.expId===e.id);
  return s||{id:"st-"+e.id,expId:e.id,s60:"",s180:"",defense:[],risk:"",s:"",t:"",a:"",r:"",covers:[],data:[]};
}
function ivExps(){ return ((S.profile||{}).exps||[]).filter(e=>e&&e.org); }
function renderStar(){
  const exps=ivExps(), fl=document.getElementById("starFilters"), box=document.getElementById("starList"); if(!fl||!box) return;
  if(!exps.length){ fl.innerHTML=""; box.innerHTML=`<div class="empty-block"><h2>先填「我的经历」</h2><p>素材库按你的经历逐段建卡：每段写好 60 秒口播、3 分钟深挖和面试官可能的追问。</p><button class="btn pri" onclick="go('profile')">去填经历</button></div>`; return; }
  const ready=exps.filter(e=>{ const s=ivStory(e); return s.s60&&(s.defense||[]).length; }).length;
  fl.innerHTML=`<p class="st-sum">${exps.length} 段经历 · ${ready} 段已备好口播和追问。先看「简历怎么写」确认写什么，再练 60 秒口播；追问防线写你真的答得上来的内容。</p>`;
  const TABS=[["resume","简历怎么写"],["s60","60 秒口播"],["s180","3 分钟深挖"],["def","追问防线"],["risk","高危点"],["star","STAR"]];
  box.innerHTML=exps.map(e=>{
    const s=ivStory(e), t=starTab[e.id]||"resume", empty=`<p class="muted">还没写。<a href="javascript:ivEditStar('${e.id}')">补上</a></p>`;
    const bl=(e.bullets||[]).filter(b=>b&&(b.t||b.h));
    const body= t==="resume"? (bl.length?`<ul class="st-bl">${bl.map(b=>`<li>${b.h?`<b>${esc(b.h)}</b> `:""}${esc(b.t||"")}</li>`).join("")}</ul>`:`<p class="muted">这段经历还没有要点，去「我的经历」补。</p>`)
      : t==="s60"? (s.s60?`<p class="st-text">${nl2(s.s60)}</p>`:empty)
      : t==="s180"? (s.s180?`<p class="st-text">${nl2(s.s180)}</p>`:empty)
      : t==="def"? ((s.defense||[]).length?`<dl class="st-qa">${s.defense.map(d=>`<div><dt>${esc(d.q)}</dt><dd>${nl2(d.a)}</dd></div>`).join("")}</dl>`:empty)
      : t==="risk"? (s.risk?`<p class="st-text st-risk">${nl2(s.risk)}</p>`:`<p class="muted">没有标记高危点。写下简历上最容易被追问击穿的地方（口径不清的数字、不是你主导的部分）。</p>`)
      : ((s.s||s.t||s.a||s.r)?`<dl class="st-star">${[["情境",s.s],["任务",s.t],["行动",s.a],["结果",s.r]].map(([k,v])=>`<div><dt>${k}</dt><dd>${esc(v||"")}</dd></div>`).join("")}</dl>`:empty);
    const nDef=(s.defense||[]).length;
    return `<article class="st">
      <header class="st-h"><div><h2>${esc(e.org)}</h2><p>${esc([e.role,e.period].filter(Boolean).join(" · "))}</p></div><button class="btn sm" onclick="ivEditStar('${e.id}')">编辑</button></header>
      <nav class="st-tabs" role="tablist">${TABS.map(([k,n])=>`<button role="tab" aria-selected="${t===k}" class="${t===k?"on":""}" onclick="starTab['${e.id}']='${k}';renderStar()">${n}${k==="def"&&nDef?` <span class="num">${nDef}</span>`:""}</button>`).join("")}</nav>
      <div class="st-body">${body}</div>
      ${(s.data||[]).length?`<dl class="st-meta"><div><dt>关键数字</dt><dd>${s.data.map(esc).join(" · ")}</dd></div></dl>`:""}
    </article>`;
  }).join("");
  const nl=document.getElementById("numberList"); if(nl){ const all=[...(S.numbers||[]),...exps.flatMap(e=>ivStory(e).data||[])]; nl.innerHTML=all.length?`<p class="st-nums">${all.map(esc).join(" · ")}</p>`:`<p class="muted">在每段经历的「编辑」里填关键数字，这里会汇总成面试前速记。</p>`; }
}
function ivEditStar(expId){
  const e=ivExps().find(x=>x.id===expId); if(!e) return; const s=ivStory(e);
  const f=(id,label,val,rows,ph)=>`<div class="frow"><div><label for="${id}">${label}</label><textarea class="inp" id="${id}" rows="${rows}" placeholder="${esc(ph||"")}">${esc(val||"")}</textarea></div></div>`;
  openModal("素材 · "+esc(e.org),
    f("iv_s60","60 秒口播",s.s60,4,"一句话讲清这段经历是什么 → 你负责的部分 → 一个结果")+
    f("iv_s180","3 分钟深挖",s.s180,6,"背景 → 难点 → 你怎么做的（细节）→ 结果和复盘")+
    f("iv_def","追问防线（每行一条：问题 | 回答）",(s.defense||[]).map(d=>d.q+" | "+d.a).join("\n"),5,"这个数字怎么算的？ | 口径是……")+
    f("iv_risk","高危点",s.risk,2,"容易被追问击穿的地方")+
    `<div class="frow f2"><div><label for="iv_s">情境</label><textarea class="inp" id="iv_s" rows="2">${esc(s.s)}</textarea></div><div><label for="iv_t">任务</label><textarea class="inp" id="iv_t" rows="2">${esc(s.t)}</textarea></div></div>
     <div class="frow f2"><div><label for="iv_a">行动</label><textarea class="inp" id="iv_a" rows="3">${esc(s.a)}</textarea></div><div><label for="iv_r">结果</label><textarea class="inp" id="iv_r" rows="3">${esc(s.r)}</textarea></div></div>`+
    f("iv_data","关键数字（每行一个，只写真实、说得清口径的）",(s.data||[]).join("\n"),3,""),
    `<button class="btn" onclick="closeModal()">取消</button><button class="btn pri" onclick="ivSaveStar('${expId}')">保存</button>`,true);
}
function ivSaveStar(expId){
  const e=ivExps().find(x=>x.id===expId); if(!e) return;
  const g=id=>(document.getElementById(id).value||"").trim();
  const s=Object.assign(ivStory(e),{s60:g("iv_s60"),s180:g("iv_s180"),risk:g("iv_risk"),s:g("iv_s"),t:g("iv_t"),a:g("iv_a"),r:g("iv_r"),
    defense:g("iv_def").split("\n").map(l=>l.split(/\s*[|｜]\s*/)).filter(p=>p[0]).map(p=>({q:p[0],a:p.slice(1).join(" | ")})),
    data:g("iv_data").split("\n").map(x=>x.trim()).filter(Boolean)});
  S.star=S.star||[]; if(!S.star.includes(s)) S.star.push(s);
  save(); closeModal(); renderStar(); toast("已保存");
}

/* 「我的经历」里每段经历下的深挖摘要（素材库不再单独成页） */
function ivDeepRow(e){
  if(!e||!e.org||!e.id) return "";
  const s=ivStory(e), n=(s.defense||[]).length, done=[s.s60&&"60 秒讲法",s.s180&&"3 分钟讲法",n&&`追问 ${n} 条`,(s.data||[]).length&&`关键数字 ${s.data.length} 个`].filter(Boolean);
  return `<div class="iv-deep-row"><span>面试深挖：${done.length?esc(done.join(" · ")):'<span class="muted">还没写</span>'}</span><button class="btn sm" onclick="ivEditStar('${e.id}')">${done.length?"编辑深挖":"补充深挖"}</button></div>`;
}
const _ivSave=ivSaveStar; ivSaveStar=function(id){ _ivSave(id); if(document.getElementById("v-profile")&&document.getElementById("v-profile").classList.contains("on")&&typeof renderProfile==="function") renderProfile(); };

/* ===================== 页面与路由 ===================== */
const IV_HTML=`
<div class="view" id="v-star">
  <div class="pagehead"><div><h1>素材库</h1><p>每段经历的讲法与追问。</p></div></div>
  <div class="filters" id="starFilters"></div>
  <div id="starList"></div>
  <section class="st-numsec"><h2 class="h5">硬数据速记（面试前扫一遍）</h2><div id="numberList"></div></section>
</div>
<div class="view" id="v-bank">
  <div class="pagehead">
    <div><h1>答案库</h1><p>准备好的回答，标注引用的经历。</p></div>
    <button class="btn pri" onclick="openAnswer()">新增答案</button>
  </div>
  <div class="filters" id="bankFilters"></div>
  <div class="filters"><div class="searchbox"><input id="bankSearch" placeholder="搜索问题、关键词、公司" aria-label="搜索答案" oninput="renderBank()"></div>
    <button class="btn sm" onclick="toggleAllQA(true)">全部展开</button>
    <button class="btn sm" onclick="toggleAllQA(false)">全部收起</button>
  </div>
  <div id="bankList"></div>
</div>
<div class="view" id="v-reviews">
  <div class="pagehead">
    <div><h1>面试复盘</h1><p>逐题记录，统计失分原因。</p></div>
    <button class="btn pri" onclick="openReview()">新增复盘</button>
  </div>
  <div id="revAnalysis"></div>
  <div class="filters"><div class="searchbox"><input id="revSearch" placeholder="搜索公司、岗位、问题" aria-label="搜索复盘" oninput="renderReviews()"></div></div>
  <div class="filters" id="revPhaseBar"></div>
  <div id="reviewList"></div>
</div>
<div class="view" id="v-mock">
  <div id="mockSetup">
    <div class="pagehead"><div><h1>Mock 面试</h1><p>限时作答，提交后自动评分。</p></div></div>
    <section class="mk-setup">
      <div class="frow f3">
        <div><label for="mkCompany">公司 / 题源</label><select class="inp" id="mkCompany"></select></div>
        <div><label for="mkTrack">岗位方向</label><select class="inp" id="mkTrack"></select></div>
        <div><label for="mkRound">面试轮次</label><select class="inp" id="mkRound"></select></div>
      </div>
      <div class="frow f3">
        <div><label for="mkType">题型</label><select class="inp" id="mkType">
          <option value="all">全部</option><option value="业务面">业务面</option><option value="行为面">行为面</option>
          <option value="Case">Case / 开放题</option><option value="综合分析">综合分析（考公）</option><option value="组织管理">组织管理（考公）</option>
        </select></div>
        <div><label for="mkCount">题量</label><select class="inp" id="mkCount"><option>5</option><option selected>8</option><option>12</option><option>15</option></select></div>
        <div><label for="mkTime">每题限时</label><select class="inp" id="mkTime">
          <option value="90">90 秒</option><option value="150" selected>150 秒</option><option value="240">240 秒</option><option value="0">不限时</option>
        </select></div>
      </div>
      <div class="mk-go"><span class="muted" id="mkPool">—</span><button class="btn pri" onclick="startMock()">开始模拟面试</button></div>
    </section>
    <section class="mk-hist"><h2 class="h5">历史记录</h2><div id="mockHistory"></div></section>
  </div>
  <div id="mockRun" style="display:none" class="mockstage">
    <div class="mk-top">
      <div><span class="tag t-blue" id="mkTagCo"></span> <span class="tag t-gray" id="mkTagType"></span></div>
      <div class="mk-top-r"><div class="timer" id="mkTimer">02:30</div><button class="btn" onclick="quitMock()">退出</button></div>
    </div>
    <div class="qbox">
      <div class="qnum" id="mkNum"></div>
      <div class="qtext" id="mkQ"></div>
      <div id="mkHintWrap" style="margin-bottom:16px">
        <button class="btn sm" onclick="toggleHint()">查看答题框架</button>
        <div id="mkHint" style="display:none;margin-top:10px" class="ablock"><div class="body" id="mkHintBody"></div></div>
      </div>
      <label for="mkAns">你的回答（口述后把要点敲下来，或直接打字）</label>
      <textarea class="inp" id="mkAns" style="min-height:150px" placeholder="结论先行 / STAR"></textarea>
      <div id="mkFail" style="display:none;margin-top:14px;padding-top:12px;border-top:1px solid var(--bd)"></div>
      <div class="mk-foot">
        <div class="mk-rate"><span class="muted">自评</span><div class="rate" id="mkRate"></div></div>
        <div class="mk-btns"><button class="btn" onclick="nextQ(true)">跳过</button><button class="btn pri" onclick="nextQ(false)" id="mkNext">下一题</button></div>
      </div>
      <div class="progressbar"><i id="mkBar" style="width:0"></i></div>
    </div>
  </div>
  <div id="mockReport" style="display:none" class="mockstage"></div>
</div>`;
function ivEnsure(){
  if(!S) return;
  ["reviews","answers","mocks","star","numbers"].forEach(k=>{ if(!Array.isArray(S[k])) S[k]=[]; });
  // 从旧备份导入过的复盘 / 答案（格式相同）：第一次打开时接上
  if(!S.reviews.length&&Array.isArray(S.legacyReviews)&&S.legacyReviews.length) S.reviews=S.legacyReviews.map(r=>Object.assign({phase:"实习期"},r));
  if(!S.answers.length&&Array.isArray(S.legacyAnswers)&&S.legacyAnswers.length) S.answers=S.legacyAnswers.slice();
  // 题库不写进档案：不可枚举属性，保存 / 导出时自动跳过
  if(!Object.getOwnPropertyDescriptor(S,"questions")) Object.defineProperty(S,"questions",{value:IV_QBANK,enumerable:false,writable:true,configurable:true});
}
(function(){
  if(typeof VIEWS!=="undefined"&&!VIEWS.some(v=>v[0]==="star")){
    const i=VIEWS.findIndex(v=>v[0]==="agent");
    VIEWS.splice(i<0?VIEWS.length:i,0,["bank","答案库"],["reviews","面试复盘"],["mock","Mock 面试"]);   // 素材库并入「我的经历」
  }
  const mount=()=>{ const ref=document.getElementById("v-data")||document.querySelector(".view:last-of-type"); if(ref&&!document.getElementById("v-star")) ref.insertAdjacentHTML("afterend",IV_HTML); };
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",mount); else mount();
  const ol=window.load; if(typeof ol==="function"&&!ol.__iv){ const w=function(){ const r=ol.apply(this,arguments); ivEnsure(); return r; }; w.__iv=true; window.load=w; }
  if(typeof S!=="undefined"&&S) ivEnsure();
  const og=window.go; if(typeof og==="function"&&!og.__iv){
    const w=function(v){ ivEnsure(); if(v==="star") v="profile"; const r=og.call(this,v);
      if(v==="star") renderStar(); else if(v==="bank"){ renderBankFilters(); renderBank(); } else if(v==="reviews") renderReviews(); else if(v==="mock"){ fillMockSelects(); renderMockHistory(); }
      return r; };
    w.__iv=true; window.go=w;
  }
})();
