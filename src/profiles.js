
/* =========================================================================
   多档案（两个版本共用）
   · 每个人一个档案：独立的浏览器存储键 + 独立的后端档案（ws），互不影响
   · 个人版的档案 = 内置个人数据的那一份；其他人的档案都用通用版（空白起步，自己导入经历）
   · 档案列表存在本机（offer_profiles）；用本机后端时，还会从后端读出已有档案，换浏览器也能看到
   ========================================================================= */
const QZ_OWNER_KEY="hl_qiuzhao_v3", QZ_SHARE_KEY="qzzt_share_v1";
function qzProfId(){ return (new URLSearchParams(location.search).get("p")||"").replace(/[^\w-]/g,"").slice(0,40); }
function qzIsOwner(){ return typeof KEY!=="undefined"&&KEY===QZ_OWNER_KEY; }
function qzProfCur(){ return qzIsOwner()?"__owner":(qzProfId()||"__default"); }
function qzProfList(){ try{ const l=JSON.parse(localStorage.getItem("offer_profiles")||"[]"); return Array.isArray(l)?l:[]; }catch(e){ return []; } }
function qzProfPut(l){ try{ localStorage.setItem("offer_profiles",JSON.stringify(l)); }catch(e){} }
function qzProfHref(id){
  const http=typeof QZ_BACKEND!=="undefined"&&QZ_BACKEND.online;   // 由本机后端提供页面时用 / 和 /share；否则用文件相对路径
  if(id==="__owner") return http?"/":(qzIsOwner()?location.pathname:"../秋招作战台.html");
  const base=http?"/share":(qzIsOwner()?"秋招作战台-通用版/index.html":location.pathname);
  return base+(id&&id!=="__default"?"?p="+encodeURIComponent(id):"");
}
function qzProfName(){
  if(qzIsOwner()){ const b=S&&S.cv&&Object.fromEntries(S.cv.basic||[]); return (b&&b["姓名"])||"我的档案"; }
  const n=S&&S.profile&&S.profile.name; if(n) return n;
  const r=qzProfList().find(x=>x.id===qzProfCur()); return (r&&r.name)||(qzProfCur()==="__default"?"默认档案":"新档案");
}
/* 当前页面打开的档案登记进列表，名字随档案里的姓名更新 */
function qzProfTouch(){
  const l0=qzProfList(), r0=l0.find(x=>x.id===qzProfCur());
  if(!qzIsOwner()&&S&&S.profile&&!S.profile.name&&r0&&r0.name&&!/^(默认档案|新档案|档案 )/.test(r0.name)){ S.profile.name=r0.name; save(); }   // 新建档案时填的名字写进档案
  const l=qzProfList(), id=qzProfCur(), name=qzProfName(), i=l.findIndex(x=>x.id===id);
  if(i<0) l.push({id,name,at:new Date().toISOString()}); else { l[i].name=name; l[i].at=new Date().toISOString(); }
  qzProfPut(l);
}
/* 用后端时：后端里有、本机列表里没有的档案也补进来 */
async function qzProfFromBackend(){
  if(!(typeof QZ_BACKEND!=="undefined"&&QZ_BACKEND.online)) return;
  try{
    const h=await (await fetch("/api/health",{cache:"no-store"})).json(), l=qzProfList();
    (h.workspaces||[]).forEach(ws=>{
      const id=ws===QZ_OWNER_KEY?"__owner":ws===QZ_SHARE_KEY?"__default":ws.startsWith(QZ_SHARE_KEY+"__")?ws.slice(QZ_SHARE_KEY.length+2):"";
      if(id&&!l.some(x=>x.id===id)) l.push({id,name:id==="__owner"?"我的档案":id==="__default"?"默认档案":"档案 "+id,at:""});
    });
    qzProfPut(l); qzProfRender();
  }catch(e){}
}
function qzProfRender(){
  const brand=document.querySelector(".nav .brand")||document.querySelector("#navlinks"); if(!brand) return;
  let el=document.getElementById("qzProf");
  if(!el){ el=document.createElement("div"); el.id="qzProf"; el.className="qz-prof"; brand.insertAdjacentElement(brand.id==="navlinks"?"beforebegin":"afterend",el); }
  el.innerHTML=`<button class="qz-prof-btn" onclick="qzProfMenu(event)" aria-haspopup="menu" aria-expanded="false" title="切换档案"><span class="qz-prof-av">${esc((qzProfName()||"档").slice(0,1))}</span><span class="qz-prof-nm">${esc(qzProfName())}</span><svg class="qi" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m7 10 5 5 5-5"/></svg></button>`;
}
function qzProfMenu(ev){
  ev&&ev.stopPropagation();
  let m=document.getElementById("qzProfMenu"); if(m){ m.remove(); return; }
  const cur=qzProfCur(), l=qzProfList().sort((a,b)=>(a.id==="__owner"?-1:b.id==="__owner"?1:0)||String(b.at||"").localeCompare(String(a.at||"")));
  m=document.createElement("div"); m.id="qzProfMenu"; m.className="qz-prof-menu"; m.setAttribute("role","menu");
  m.innerHTML=`<div class="qz-prof-h">档案</div>
    ${l.map(p=>`<a role="menuitem" href="${esc(qzProfHref(p.id))}" class="${p.id===cur?"on":""}"><span class="qz-prof-av">${esc((p.name||"档").slice(0,1))}</span><span>${esc(p.name||p.id)}</span>${p.id===cur?"<em>当前</em>":""}</a>`).join("")}
    <hr><button role="menuitem" onclick="qzProfNew()">新建档案</button>
    ${cur!=="__owner"?`<button role="menuitem" onclick="qzProfRename()">重命名当前档案</button>`:""}
    ${cur!=="__owner"&&cur!=="__default"?`<button role="menuitem" class="danger" onclick="qzProfForget()">从列表移除当前档案</button>`:""}`;
  document.getElementById("qzProf").appendChild(m);
  const close=e=>{ if(!m.contains(e.target)){ m.remove(); document.removeEventListener("click",close); } };
  setTimeout(()=>document.addEventListener("click",close),0);
}
function qzProfNew(){
  const name=(prompt("新档案的名字（例如同学的姓名）","")||"").trim(); if(!name) return;
  const id="p"+Date.now().toString(36)+Math.random().toString(36).slice(2,5);
  const l=qzProfList(); l.push({id,name,at:new Date().toISOString()}); qzProfPut(l);
  location.href=qzProfHref(id);
}
function qzProfRename(){
  const name=(prompt("档案名字",qzProfName())||"").trim(); if(!name) return;
  if(S&&S.profile){ S.profile.name=name; save(); }
  const l=qzProfList(), r=l.find(x=>x.id===qzProfCur()); if(r) r.name=name; qzProfPut(l); qzProfRender();
}
function qzProfForget(){
  if(!confirm("从列表移除这个档案？数据不会删除，重新打开这个档案的链接仍可使用。建议先在「备份与隐私」导出。")) return;
  const l=qzProfList().filter(x=>x.id!==qzProfCur()); qzProfPut(l); location.href=qzProfHref(l.some(x=>x.id==="__owner")?"__owner":"__default");
}
(function(){
  const start=()=>{ try{ qzProfTouch(); qzProfRender(); setTimeout(qzProfFromBackend,1200); }catch(e){} };
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",()=>setTimeout(start,50)); else setTimeout(start,50);
  const os=window.save; if(typeof os==="function"&&!os.__prof){ const w=function(){ const r=os.apply(this,arguments); try{ const n=qzProfName(), el=document.querySelector("#qzProf .qz-prof-nm"); if(el&&el.textContent!==n){ qzProfTouch(); qzProfRender(); } }catch(e){} return r; }; w.__prof=true; window.save=w; }
})();
