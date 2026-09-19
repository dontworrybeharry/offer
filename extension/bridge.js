/* 只在Offer页面里工作：平台 ↔ 插件后台 的传话筒 */
(function(){
  const isPlatform=()=>!!document.getElementById("agentHome")||/Offer/.test(document.title);
  if(!isPlatform()) return;
  const VER=chrome.runtime.getManifest().version;
  const post=msg=>window.postMessage(Object.assign({source:"qzzt-ext"},msg),"*");
  const sendJobs=()=>chrome.storage.local.get({jobs:[]},r=>{ if(r.jobs.length) post({type:"JOBS",jobs:r.jobs}); });
  const sendEvents=()=>chrome.storage.local.get({apEvents:[]},r=>{ if(r.apEvents.length) post({type:"AP_EVENTS",events:r.apEvents}); });
  post({type:"HELLO",ver:VER}); sendJobs(); sendEvents();
  chrome.storage.local.set({platformUrl:location.href.split("#")[0]});
  window.addEventListener("message",e=>{
    const d=e.data||{}; if(e.source!==window||d.source!=="qzzt-page") return;
    if(d.type==="PING"){ post({type:"HELLO",ver:VER}); sendJobs(); sendEvents(); }
    if(d.type==="SYNC") chrome.storage.local.set({profile:d.data,resume:d.resume||null,syncedAt:new Date().toISOString()});
    if(d.type==="JOBS_ACK") chrome.storage.local.get({jobs:[]},r=>chrome.storage.local.set({jobs:r.jobs.filter(j=>!(d.ids||[]).includes(j.id))}));
    if(d.type==="AP_ACK") chrome.storage.local.get({apEvents:[]},r=>chrome.storage.local.set({apEvents:r.apEvents.filter(x=>!(d.ids||[]).includes(x.id))}));
    if(d.type==="AP_REQ"){
      try{
        chrome.runtime.sendMessage({type:"AP",cmd:d.cmd,args:d.args},res=>{
          const err=chrome.runtime.lastError;
          post({type:"AP_RES",reqId:d.reqId,ok:!err&&res&&res.ok,result:res&&res.result,error:err?err.message:(res&&res.error)});
        });
      }catch(err){ post({type:"AP_RES",reqId:d.reqId,ok:false,error:"插件已更新，请刷新平台页面"}); }
    }
  });
  chrome.storage.onChanged.addListener((c,area)=>{ if(area!=="local") return; if(c.jobs) sendJobs(); if(c.apEvents) sendEvents(); });
})();
