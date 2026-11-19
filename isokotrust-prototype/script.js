const STORAGE_KEY = "isokotrust_demo_v1";

const seed = {
  farmers: [
    {id:"FMR-001",name:"Jeanette Mukamana",phone:"+250 78 000 1001",district:"Nyabihu",sector:"Mukamira",lat:"-1.6502",lng:"29.5124"},
    {id:"FMR-002",name:"Emmanuel Nshimiyimana",phone:"+250 78 000 1002",district:"Nyabihu",sector:"Jenda",lat:"-1.6318",lng:"29.4981"},
    {id:"FMR-003",name:"Aline Uwase",phone:"+250 78 000 1003",district:"Nyabihu",sector:"Bigogwe",lat:"-1.6184",lng:"29.5362"}
  ],
  lots: [
    {id:"ISK-26-001",farmerId:"FMR-001",crop:"Arabica coffee",weight:1200,moisture:11.4,status:"Verified",screened:true,created:"16 Nov 2026"},
    {id:"ISK-26-002",farmerId:"FMR-002",crop:"Arabica coffee",weight:850,moisture:11.8,status:"Verified",screened:true,created:"16 Nov 2026"},
    {id:"ISK-26-003",farmerId:"FMR-003",crop:"Arabica coffee",weight:400,moisture:12.6,status:"Pending",screened:false,created:"16 Nov 2026"}
  ],
  activity: [
    {icon:"◎",title:"Origin screening completed",detail:"ISK-26-002 · Demonstration result",time:"10:42 AM"},
    {icon:"▤",title:"New crop lot recorded",detail:"ISK-26-003 · 400 kg Arabica coffee",time:"09:58 AM"},
    {icon:"♙",title:"Farmer profile registered",detail:"FMR-003 · Bigogwe, Nyabihu",time:"09:16 AM"}
  ],
  passports: []
};

let state = loadState();
let toastTimer;

function loadState(){
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if(saved) return JSON.parse(saved);
  } catch(e) {}
  return structuredClone(seed);
}
function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function money(value){ return "RWF " + Math.round(value).toLocaleString("en-US"); }
function farmerById(id){ return state.farmers.find(f=>f.id===id); }
function escapeHTML(value){ return String(value ?? "").replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function initials(name){ return name.split(" ").map(x=>x[0]).slice(0,2).join("").toUpperCase(); }
function statusClass(status){ return status==="Verified"?"status-verified":status==="Pending"?"status-pending":"status-review"; }
function addActivity(icon,title,detail){
  state.activity.unshift({icon,title,detail,time:new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})});
  state.activity = state.activity.slice(0,8);
}
function showToast(message){
  const el=document.getElementById("toast"); el.textContent=message; el.classList.add("show");
  clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove("show"),2600);
}

function navigate(page){
  document.querySelectorAll(".page").forEach(p=>p.classList.toggle("active",p.id===`page-${page}`));
  document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.page===page));
  const active=document.querySelector(`.nav-item[data-page="${page}"]`);
  document.getElementById("breadcrumbCurrent").textContent=active?.innerText.trim()||"Overview";
  document.getElementById("sidebar").classList.remove("open");
  if(page==="farmers") renderFarmers();
  if(page==="intake") renderLots();
  if(page==="verification") populateLotSelect("verificationLot");
  if(page==="passports") renderPassports();
  if(page==="finance"){populateLotSelect("financeLot"); calculateFinance();}
}
document.querySelectorAll("[data-page]").forEach(b=>b.addEventListener("click",()=>navigate(b.dataset.page)));
document.querySelectorAll("[data-page-link]").forEach(b=>b.addEventListener("click",()=>navigate(b.dataset.pageLink)));
document.getElementById("mobileMenu").addEventListener("click",()=>document.getElementById("sidebar").classList.toggle("open"));
document.getElementById("helpButton").addEventListener("click",()=>showToast("Prototype help: use the left navigation to explore each workflow."));
document.getElementById("profileButton").addEventListener("click",()=>showToast("AK Coffee Cooperative · Demo workspace"));

function render(){
  renderOverview(); renderFarmers(); renderLots(); renderActivity(); updateSelects();
}
function renderOverview(){
  const totalWeight=state.lots.reduce((s,l)=>s+Number(l.weight),0);
  const verified=state.lots.filter(l=>l.status==="Verified").length;
  const indicative=state.lots.reduce((s,l)=>s+Number(l.weight)*4200*.65,0);
  document.getElementById("statFarmers").textContent=String(state.farmers.length).padStart(2,"0");
  document.getElementById("farmerNavCount").textContent=state.farmers.length;
  document.getElementById("statInventory").textContent=totalWeight.toLocaleString("en-US");
  document.getElementById("statVerified").innerHTML=`${String(verified).padStart(2,"0")}<span class="stat-denom"> / <span id="statLots">${String(state.lots.length).padStart(2,"0")}</span></span>`;
  document.getElementById("statCredit").textContent=indicative>=1e6?`RWF ${(indicative/1e6).toFixed(1)}M`:money(indicative);
  const pct=state.lots.length?Math.round(verified/state.lots.length*100):0;
  document.getElementById("readinessPercent").textContent=pct;
  document.querySelector(".score-ring").style.background=`conic-gradient(#43865a 0 ${pct}%,#edf1ec ${pct}% 100%)`;
  document.getElementById("skyProgress").style.width=pct+"%";
  document.getElementById("skyProgressLabel").textContent=pct+"%";
  document.getElementById("moistureProgress").style.width=(state.lots.length?Math.round(state.lots.filter(l=>l.moisture<=12).length/state.lots.length*100):0)+"%";
  document.getElementById("moistureProgressLabel").textContent=(state.lots.length?Math.round(state.lots.filter(l=>l.moisture<=12).length/state.lots.length*100):0)+"%";
  document.getElementById("originProgressLabel").textContent=state.lots.length?"100%":"0%";
  document.getElementById("originProgress").style.width=state.lots.length?"100%":"0%";
  document.getElementById("statLots").textContent=String(state.lots.length).padStart(2,"0");
  document.getElementById("recentLotsBody").innerHTML=state.lots.slice(0,4).map(l=>`<tr><td><span class="lot-id">${escapeHTML(l.id)}</span></td><td>${escapeHTML(farmerById(l.farmerId)?.name||"Unknown")}</td><td>${Number(l.weight).toLocaleString()} kg</td><td><span class="status-pill ${statusClass(l.status)}">${l.status}</span></td></tr>`).join("")||emptyRow(4,"No crop lots recorded yet");
}
function emptyRow(cols,msg){return `<tr><td colspan="${cols}" style="text-align:center;color:#9aa49d;padding:25px">${msg}</td></tr>`}
function renderFarmers(){
  document.getElementById("farmersTotal").textContent=state.farmers.length;
  document.getElementById("plotsTotal").textContent=state.farmers.filter(f=>f.lat&&f.lng).length;
  const q=(document.getElementById("farmerSearch")?.value||"").toLowerCase();
  const list=state.farmers.filter(f=>(f.name+f.id+f.district+f.sector).toLowerCase().includes(q));
  document.getElementById("farmersBody").innerHTML=list.map(f=>{
    const lots=state.lots.filter(l=>l.farmerId===f.id).length;
    return `<tr><td><div class="producer-cell"><span class="mini-avatar">${initials(escapeHTML(f.name))}</span><strong>${escapeHTML(f.name)}</strong></div></td><td>${escapeHTML(f.id)}</td><td>${escapeHTML(f.sector)}, ${escapeHTML(f.district)}</td><td>${escapeHTML(f.lat)}, ${escapeHTML(f.lng)}</td><td>${lots}</td><td><span class="status-pill status-verified">Registered</span></td></tr>`;
  }).join("")||emptyRow(6,"No matching farmer records");
}
function renderLots(){
  const q=(document.getElementById("lotSearch")?.value||"").toLowerCase();
  const list=state.lots.filter(l=>(l.id+l.crop+(farmerById(l.farmerId)?.name||"")).toLowerCase().includes(q));
  document.getElementById("lotsBody").innerHTML=list.map(l=>`<tr><td><span class="lot-id">${escapeHTML(l.id)}</span></td><td>${escapeHTML(farmerById(l.farmerId)?.name||"Unknown")}</td><td>${escapeHTML(l.crop)}</td><td>${Number(l.weight).toLocaleString()} kg</td><td>${Number(l.moisture).toFixed(1)}%</td><td>${l.screened?'<span class="status-pill status-verified">Demo screened</span>':'<span class="status-pill status-pending">Not screened</span>'}</td><td><span class="status-pill ${statusClass(l.status)}">${l.status}</span></td></tr>`).join("")||emptyRow(7,"No matching crop lots");
}
function renderActivity(){
  document.getElementById("activityList").innerHTML=state.activity.slice(0,4).map(a=>`<div class="activity-item"><span class="activity-icon">${escapeHTML(a.icon)}</span><div><strong>${escapeHTML(a.title)}</strong><p>${escapeHTML(a.detail)}</p></div><time>${escapeHTML(a.time)}</time></div>`).join("");
}
function updateSelects(){populateLotSelect("verificationLot");populateLotSelect("financeLot");}
function populateLotSelect(id){
  const el=document.getElementById(id); if(!el)return;
  const previous=el.value;
  el.innerHTML=state.lots.map(l=>`<option value="${escapeHTML(l.id)}">${escapeHTML(l.id)} · ${Number(l.weight).toLocaleString()} kg</option>`).join("")||'<option value="">No crop lots available</option>';
  if(state.lots.some(l=>l.id===previous))el.value=previous;
}
document.getElementById("farmerSearch").addEventListener("input",renderFarmers);
document.getElementById("lotSearch").addEventListener("input",renderLots);

const modalBackdrop=document.getElementById("modalBackdrop");
function closeModal(){modalBackdrop.classList.remove("open");}
document.getElementById("modalClose").addEventListener("click",closeModal);
modalBackdrop.addEventListener("click",e=>{if(e.target===modalBackdrop)closeModal()});
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeModal()});

function openModal(type){
  const title=document.getElementById("modalTitle"), content=document.getElementById("modalContent");
  if(type==="farmer"){
    title.textContent="Register a farmer";
    content.innerHTML=`<form class="modal-form" id="farmerForm">
      <label>Farmer full name<input name="name" required placeholder="e.g. Claudine Uwimana"></label>
      <div class="form-two-modal"><label>Phone number<input name="phone" placeholder="+250 7..." required></label><label>District<input name="district" value="Nyabihu" required></label></div>
      <label>Sector<input name="sector" placeholder="e.g. Mukamira" required></label>
      <div class="form-two-modal"><label>Farm latitude<input name="lat" type="number" step="any" placeholder="-1.6502" required></label><label>Farm longitude<input name="lng" type="number" step="any" placeholder="29.5124" required></label></div>
      <p class="form-help">Use fictional sample details for this public demonstration. Do not enter real personal or sensitive farmer data.</p>
      <button class="button button-primary button-full" type="submit">Save farmer profile →</button></form>`;
    document.getElementById("farmerForm").addEventListener("submit",e=>{
      e.preventDefault();const d=Object.fromEntries(new FormData(e.target));
      const id="FMR-"+String(Math.max(0,...state.farmers.map(f=>Number(f.id.split("-")[1])||0))+1).padStart(3,"0");
      state.farmers.unshift({id,...d});addActivity("♙","Farmer profile registered",`${id} · ${d.sector}, ${d.district}`);saveState();render();closeModal();showToast("Farmer profile saved.");
    });
  } else {
    title.textContent="Record a crop lot";
    const options=state.farmers.map(f=>`<option value="${escapeHTML(f.id)}">${escapeHTML(f.name)} · ${escapeHTML(f.id)}</option>`).join("");
    content.innerHTML=`<form class="modal-form" id="lotForm">
      <label>Producer<select name="farmerId" required>${options||'<option value="">Register a farmer first</option>'}</select></label>
      <div class="form-two-modal"><label>Crop type<select name="crop"><option>Arabica coffee</option><option>Tea</option><option>Avocado</option><option>Horticultural produce</option></select></label><label>Weight (kg)<input name="weight" type="number" min="1" required placeholder="e.g. 500"></label></div>
      <div class="form-two-modal"><label>Moisture content (%)<input name="moisture" type="number" min="0" max="100" step="0.1" required placeholder="e.g. 11.5"></label><label>Warehouse<input name="warehouse" value="AK Coffee — Nyabihu" required></label></div>
      <p class="form-help">Prototype intake record. Moisture of 12% or below is used as an illustrative intake threshold in this demo, not a universal legal standard.</p>
      <button class="button button-primary button-full" type="submit" ${state.farmers.length?"":"disabled"}>Save crop lot →</button></form>`;
    document.getElementById("lotForm").addEventListener("submit",e=>{
      e.preventDefault();const d=Object.fromEntries(new FormData(e.target));
      const id="ISK-26-"+String(Math.max(0,...state.lots.map(l=>Number(l.id.split("-").pop())||0))+1).padStart(3,"0");
      state.lots.unshift({id,farmerId:d.farmerId,crop:d.crop,weight:Number(d.weight),moisture:Number(d.moisture),status:"Pending",screened:false,created:"16 Nov 2026"});
      addActivity("▤","New crop lot recorded",`${id} · ${Number(d.weight).toLocaleString()} kg ${d.crop}`);saveState();render();closeModal();showToast("Crop lot recorded successfully.");
    });
  }
  modalBackdrop.classList.add("open");
}
document.querySelectorAll("[data-action]").forEach(b=>b.addEventListener("click",()=>openModal(b.dataset.action==="new-farmer"?"farmer":"lot")));

document.getElementById("verificationForm").addEventListener("submit",e=>{
  e.preventDefault();const lot=state.lots.find(l=>l.id===document.getElementById("verificationLot").value);
  if(!lot)return;
  // Explicitly simulated result: no satellite imagery or external geospatial data is queried.
  lot.screened=true;lot.status=lot.moisture<=12?"Verified":"Review";
  addActivity("◎","SkyCheck demo completed",`${lot.id} · Simulated screening result`);
  saveState();render();
  const good=lot.moisture<=12;
  document.getElementById("verificationResult").className="verification-result result-success";
  document.getElementById("verificationResult").innerHTML=`<span class="status-pill ${good?"status-verified":"status-review"}">${good?"DEMO PASS":"REVIEW REQUIRED"}</span><h3 style="font-size:13px;margin:10px 0 5px;color:${good?"#356c46":"#a64e49"}">${good?"Sample screening passed":"Additional review indicated"}</h3><p><strong>${escapeHTML(lot.id)}</strong> · ${escapeHTML(lot.crop)}<br>Recorded moisture: ${lot.moisture.toFixed(1)}%<br>Illustrative rule: ${good?"At or below":"Above"} 12.0% moisture threshold.</p><p><strong>Important:</strong> This result is generated from sample application logic only. No satellite imagery, forest-cover dataset or official compliance service was queried.</p><button class="small-button" id="createPassportButton" type="button">Create demo passport</button>`;
  document.getElementById("createPassportButton").addEventListener("click",()=>createPassport(lot));
  showToast("Demo screening completed.");
});
function createPassport(lot){
  let p=state.passports.find(x=>x.lotId===lot.id);
  if(!p){p={id:"PASS-"+lot.id,lotId:lot.id,created:new Date().toLocaleDateString("en-GB"),reference:"DEMO-"+Math.random().toString(36).slice(2,8).toUpperCase()};state.passports.unshift(p);addActivity("▧","Demo export passport created",`${lot.id} · ${p.reference}`);saveState();}
  renderPassports();navigate("passports");showToast("Demo passport created.");
}
function renderPassports(){
  const grid=document.getElementById("passportGrid");
  if(!state.passports.length){grid.innerHTML=`<section class="panel" style="grid-column:1/-1;text-align:center;padding:42px"><div class="empty-orbit">▧</div><h3 style="font-size:13px">No passports generated yet</h3><p style="font-size:9px;color:#87938a">Run a SkyCheck demonstration, then create a passport for a crop lot.</p><button class="button button-primary" data-page-link="verification">Go to SkyCheck →</button></section>`;grid.querySelector("[data-page-link]").addEventListener("click",()=>navigate("verification"));return;}
  grid.innerHTML=state.passports.map(p=>{
    const lot=state.lots.find(l=>l.id===p.lotId);if(!lot)return "";
    const farmer=farmerById(lot.farmerId);
    return `<article class="passport-card"><div class="passport-card-top"><span class="passport-brand">isoko<span style="color:#69a878">trust</span></span><span class="status-pill ${statusClass(lot.status)}">${lot.status==="Verified"?"DEMO VERIFIED":"REVIEW"}</span></div><h3>Crop Origin Passport</h3><p>Demonstration traceability record · ${p.id}</p><div class="passport-data"><div><span>LOT REFERENCE</span><strong>${escapeHTML(lot.id)}</strong></div><div><span>PRODUCER</span><strong>${escapeHTML(farmer?.name||"Unknown")}</strong></div><div><span>COMMODITY</span><strong>${escapeHTML(lot.crop)}</strong></div><div><span>RECORDED WEIGHT</span><strong>${Number(lot.weight).toLocaleString()} kg</strong></div><div><span>ORIGIN</span><strong>${escapeHTML(farmer?.district||"Nyabihu")}, Rwanda</strong></div><div><span>DEMO REFERENCE</span><strong>${escapeHTML(p.reference)}</strong></div></div><div class="passport-bottom"><div><small>CREATED ${escapeHTML(p.created)} · SAMPLE RECORD</small><div style="font-size:8px;color:#a0aaa3;margin-top:5px">Not an official EUDR or TRACES document</div></div><div class="qr-placeholder" aria-label="Decorative QR-style placeholder"></div></div><div class="passport-actions"><button class="small-button" data-print="${escapeHTML(p.id)}">Print passport</button><button class="small-button" data-download="${escapeHTML(p.id)}">Download record</button></div></article>`;
  }).join("");
  grid.querySelectorAll("[data-print]").forEach(b=>b.addEventListener("click",()=>printPassport(b.dataset.print)));
  grid.querySelectorAll("[data-download]").forEach(b=>b.addEventListener("click",()=>downloadPassport(b.dataset.download)));
}
function passportText(p){
  const lot=state.lots.find(l=>l.id===p.lotId),farmer=farmerById(lot.farmerId);
  return `ISOKOTRUST — DEMONSTRATION CROP ORIGIN PASSPORT\n\nPassport ID: ${p.id}\nDemo reference: ${p.reference}\nCreated: ${p.created}\nLot: ${lot.id}\nProducer: ${farmer?.name||"Unknown"}\nCommodity: ${lot.crop}\nWeight: ${lot.weight} kg\nOrigin: ${farmer?.district||"Nyabihu"}, Rwanda\nDemo screening status: ${lot.status}\n\nDISCLAIMER: This is a prototype sample record. It is not an official EUDR due diligence statement, TRACES submission, satellite verification or legal compliance determination.\n`;
}
function downloadPassport(id){
  const p=state.passports.find(x=>x.id===id);if(!p)return;
  const blob=new Blob([passportText(p)],{type:"text/plain"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`${p.id}.txt`;a.click();URL.revokeObjectURL(url);
}
function printPassport(id){
  const p=state.passports.find(x=>x.id===id);if(!p)return;
  const w=window.open("","_blank");if(!w){showToast("Allow pop-ups to print this passport.");return;}
  w.document.write(`<pre style="font:14px/1.7 Arial;white-space:pre-wrap;max-width:700px;margin:50px auto">${escapeHTML(passportText(p))}</pre>`);w.document.close();w.print();
}
function calculateFinance(){
  const lot=state.lots.find(l=>l.id===document.getElementById("financeLot").value)||state.lots[0];
  if(!lot){["inventoryValue","advanceValue","insuranceValue","remainingValue"].forEach(id=>document.getElementById(id).textContent="—");return;}
  const price=Number(document.getElementById("pricePerKg").value)||0,rate=Math.min(80,Math.max(0,Number(document.getElementById("advanceRate").value)||0))/100,ins=Math.max(0,Number(document.getElementById("insuranceRate").value)||0)/100;
  const value=lot.weight*price,advance=value*rate,insurance=advance*ins;
  document.getElementById("inventoryValue").textContent=money(value);
  document.getElementById("advanceValue").textContent=money(advance);
  document.getElementById("insuranceValue").textContent=money(insurance);
  document.getElementById("remainingValue").textContent=money(value-advance);
}
document.getElementById("financeForm").addEventListener("submit",e=>{e.preventDefault();calculateFinance();showToast("Indicative calculation updated.");});
document.getElementById("financeLot").addEventListener("change",calculateFinance);
document.getElementById("pricePerKg").addEventListener("input",calculateFinance);
document.getElementById("advanceRate").addEventListener("input",calculateFinance);
document.getElementById("insuranceRate").addEventListener("input",calculateFinance);
document.getElementById("creditDossierButton").addEventListener("click",()=>{
  const lot=state.lots.find(l=>l.id===document.getElementById("financeLot").value);if(!lot)return;
  const price=Number(document.getElementById("pricePerKg").value)||0,rate=Math.min(80,Number(document.getElementById("advanceRate").value)||0)/100;
  const text=`ISOKOTRUST — SAMPLE CREDIT DOSSIER\n\nLot: ${lot.id}\nCrop: ${lot.crop}\nQuantity: ${lot.weight} kg\nProducer: ${farmerById(lot.farmerId)?.name||"Unknown"}\nDemo origin screening: ${lot.status}\nIllustrative value: ${money(lot.weight*price)}\nProposed advance rate: ${(rate*100).toFixed(1)}%\nIndicative advance: ${money(lot.weight*price*rate)}\n\nDISCLAIMER: This is an illustrative prototype calculation only. It is not a credit application, loan offer, bank approval, warehouse receipt, insurance policy or financial advice.`;
  const blob=new Blob([text],{type:"text/plain"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=`IsokoTrust-${lot.id}-credit-dossier.txt`;a.click();URL.revokeObjectURL(url);showToast("Sample credit dossier downloaded.");
});

render();
