const $=id=>document.getElementById(id);
async function tab(){ const [t]=await chrome.tabs.query({active:true,currentWindow:true}); return t; }
async function run(func,args){
  const t=await tab();
  const [r]=await chrome.scripting.executeScript({target:{tabId:t.id,allFrames:false},func,args:args||[]});
  return r&&r.result;
}
chrome.storage.local.get({profile:null,syncedAt:"",jobs:[],resume:null},s=>{
  $("status").innerHTML=s.profile
    ?`<span class="ok">已同步</span>：${s.profile.name||"未填姓名"} · ${(s.profile.exps||[]).length} 段经历${s.resume?` · 附带简历「${s.resume.name}」`:""}<br>同步时间 ${s.syncedAt.slice(0,16).replace("T"," ")}${s.jobs.length?`<br>待导入岗位 ${s.jobs.length} 个（打开平台后自动导入）`:""}`
    :`<span class="warn">还没有同步档案</span>：打开Offer →「AI 助手」→「同步档案到插件」。`;
});
$("grab").onclick=async()=>{
  $("jobMsg").textContent="抓取中…";
  try{
    const j=await run(qzztExtractJob);
    $("job").hidden=false; $("co").value=j.company; $("role").value=j.role; $("city").value=j.city; $("jd").value=j.jd; $("jd").dataset.url=j.url;
    $("jobMsg").textContent=j.jd.length>60?"检查一下公司和岗位名称，再加入看板。":"没找到完整 JD：先在页面上选中 JD 文字再抓取。";
  }catch(e){ $("jobMsg").textContent="这个页面不允许插件读取（如浏览器设置页），换到岗位详情页再试。"; }
};
$("saveJob").onclick=()=>{
  const job={id:"j"+Date.now(),company:$("co").value.trim(),role:$("role").value.trim(),city:$("city").value.trim(),jd:$("jd").value.trim(),url:$("jd").dataset.url||"",at:new Date().toISOString()};
  if(!job.company||!job.role) return $("jobMsg").textContent="公司和岗位不能为空";
  chrome.storage.local.get({jobs:[]},r=>chrome.storage.local.set({jobs:[...r.jobs,job]},()=>{ $("job").hidden=true; $("jobMsg").innerHTML='<span class="ok">已加入</span>：打开Offer时会自动导入投递看板。'; }));
};
$("fill").onclick=async()=>{
  const s=await chrome.storage.local.get({profile:null,resume:null});
  if(!s.profile) return $("fillMsg").innerHTML='<span class="warn">先在平台里同步档案</span>';
  $("fillMsg").textContent="填写中…";
  try{
    const r=await run(qzztFillForm,[s.profile,s.resume]);
    const uniq=[...new Set(r.filled)];
    $("fillMsg").innerHTML=r.filled.length
      ?`<span class="ok">已填写 ${r.filled.length} 个字段</span>：${uniq.join("、")}${r.skipped?`；跳过已有内容的 ${r.skipped} 个`:""}<br>下拉框、日期控件和自定义组件可能需要手动补。检查后由你点提交。`
      :"没有识别到可填写的字段：这个网申可能在内嵌框架里，或用了特殊组件，需要手动填写。";
  }catch(e){ $("fillMsg").textContent="这个页面不允许插件填写。"; }
};
$("open").onclick=()=>chrome.storage.local.get({platformUrl:""},r=>{ if(r.platformUrl) chrome.tabs.create({url:r.platformUrl}); else $("fillMsg").textContent="先在浏览器里打开一次Offer。"; });
