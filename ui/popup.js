(() => {
  "use strict";
  const C = SkipFlowCore, UI = SkipFlowUI, $ = UI.byId;
  const nonce = crypto.randomUUID();
  const records = new Map();
  let tabId, tabSite = "", settings = C.normalizeSettings(), selectedKey = "";
  let bookmarkSignature = "", discoveryTimer, lastFeedback = 0;
  const current = () => records.get(selectedKey);
  function render() {
    const entries = [...records.entries()];
    const select = $("videos");
    const sig = entries.map(([key, r]) => `${key}:${r.title}`).join("|");
    if (select.dataset.signature !== sig) {
      select.replaceChildren();
      for (const [key, r] of entries) {
        const option = document.createElement("option"); option.value=key;
        option.textContent = `${r.paused ? "Ⅱ" : "▶"} ${r.title}${entries.length > 1 ? ` · ${r.id}` : ""}`; select.append(option);
      }
      if (!entries.length) { const o=document.createElement("option"); o.textContent="Nessun video rilevato";select.append(o); }
      select.dataset.signature = sig;
    }
    if (!records.has(selectedKey)) {
      const sorted = [...entries].sort((a,b) => {
        const score = r => (r.visible ? 1e12 : 0) + (!r.paused ? 1e10 : 0) + r.area;
        return score(b[1]) - score(a[1]);
      });
      selectedKey = sorted[0]?.[0] || "";
    }
    select.value = selectedKey;
    const r = current();
    $("video-count").textContent = `${entries.length} video`;
    $("player").hidden = !r;
    $("study").hidden = !r;
    $("empty").hidden = !!r;
    $("enabled").checked = settings.enabled;
    const site = r?.site || tabSite;
    $("site-enabled").checked = !settings.blockedSites.includes(site);
    $("site-enabled").disabled = !site;
    $("site-label").textContent = site ? `Attivo su ${site.length > 24 ? site.slice(0,22)+"…" : site}` : "Attivo su questo sito";
    if (!r) return;
    const enabled = settings.enabled && !settings.blockedSites.includes(site);
    for (const b of document.querySelectorAll("#player button, #study button")) b.disabled = !enabled;
    $("save-bookmark").disabled = !enabled || !r.bookmarksReady;
    $("undo").disabled = !enabled || !r.canUndo;
    $("pip").disabled = !enabled || !r.pipAvailable;
    $("clock").textContent = `${C.formatTime(r.time)} / ${C.formatTime(r.duration)}`;
    $("remaining").textContent = r.duration !== null ? `Restano ${C.formatTime(Math.max(0,r.duration-r.time)/r.rate)} alla velocità attuale` : "Diretta · salti disponibili solo se il player offre il DVR";
    $("rate").textContent = C.formatRate(r.rate);
    $("play").textContent = r.paused ? "▶" : "Ⅱ";
    $("play").setAttribute("aria-label", r.paused ? "Riproduci" : "Pausa");
    $("back-small").textContent = `−${settings.smallSkip}`; $("forward-small").textContent = `+${settings.smallSkip}`;
    $("back-large").textContent = `−${settings.largeSkip}`; $("forward-large").textContent = `+${settings.largeSkip}`;
    for (const button of document.querySelectorAll("[data-rate]")) button.setAttribute("aria-pressed", String(Math.abs(Number(button.dataset.rate)-r.rate)<.01));
    $("loop").setAttribute("aria-pressed", String(r.loop.enabled));
    $("loop-state").textContent = `A ${C.formatTime(r.loop.a)} · B ${C.formatTime(r.loop.b)}${r.loop.enabled ? " · IN RIPETIZIONE" : ""}`;
    $("panel-toggle").textContent = r.panelHidden ? "Mostra pannello" : "Nascondi pannello";
    $("timeline").disabled = !enabled || !r.bounds || !r.ready;
    if (r.bounds && document.activeElement !== $("timeline")) $("timeline").value = String(Math.max(0,Math.min(1000,(r.time-r.bounds[0])/(r.bounds[1]-r.bounds[0] || 1)*1000)));
    $("timeline").setAttribute("aria-valuetext",C.formatTime(r.time));
    $("bookmark-count").textContent = `${r.bookmarks.length} / 50`;
    const bookSig = selectedKey + JSON.stringify(r.bookmarks);
    if (bookSig !== bookmarkSignature) {
      bookmarkSignature=bookSig; $("bookmarks").replaceChildren();
      for (const mark of r.bookmarks) {
        const row=document.createElement("div"); row.className="bookmark";
        const jump=document.createElement("button"); jump.type="button";jump.className="jump";
        const time=document.createElement("span");time.textContent=C.formatTime(mark.time); jump.append(time,document.createTextNode(mark.label));
        jump.title=`Vai a ${C.formatTime(mark.time)} · ${mark.label}`;
        jump.addEventListener("click",()=>command("goBookmark",mark.id));
        const del=document.createElement("button");del.type="button";del.className="delete";del.textContent="×";
        del.setAttribute("aria-label",`Elimina ${mark.label}`);del.addEventListener("click",()=>command("deleteBookmark",mark.id));
        row.append(jump,del);$("bookmarks").append(row);
      }
      if (!r.bookmarks.length) { const empty=document.createElement("p");empty.className="sub";empty.textContent="Salva un passaggio per ritrovarlo in un clic.";$("bookmarks").append(empty); }
    }
    for(const button of $("bookmarks").querySelectorAll("button")) button.disabled=!enabled;
    if (!enabled && Date.now()-lastFeedback>4000) UI.status("SkipFlow è disattivato. Riattivalo con gli interruttori.");
  }
  async function command(action, value) {
    const r = current(); if (!r) return;
    try {
      const response = await chrome.tabs.sendMessage(tabId,{type:"SKIPFLOW_COMMAND",id:r.id,action,value},{frameId:r.frameId});
      if (!response?.ok) throw new Error(response?.error || "Il video non risponde. Ricarica la pagina.");
      if (response.state) records.set(selectedKey,{...response.state,frameId:r.frameId,seen:Date.now()});
      lastFeedback=Date.now(); UI.status(response.state?.message || "Fatto."); render();
    } catch (e) { lastFeedback=Date.now();UI.status(e.message || "Comando non disponibile.",true); }
  }
  async function discover() {
    if (typeof tabId !== "number") return;
    try { await chrome.tabs.sendMessage(tabId,{type:"SKIPFLOW_DISCOVER",nonce}); }
    catch { if (!records.size) { $("empty").textContent="Nessun player raggiungibile. Ricarica la pagina dopo l’installazione. Le pagine interne del browser e il Web Store non supportano estensioni."; } }
    for (const [key,r] of records) if (Date.now()-r.seen>3500) records.delete(key);
    render();
  }
  chrome.runtime.onMessage.addListener((message,sender) => {
    if (sender.id !== chrome.runtime.id || sender.tab?.id !== tabId || message?.type!=="SKIPFLOW_STATE" || message.nonce!==nonce || !Array.isArray(message.records)) return;
    for (const r of message.records) {
      const key=`${sender.frameId || 0}:${r.id}`; records.set(key,{...r,frameId:sender.frameId || 0,seen:Date.now()});
    }
    render();
  });
  $("videos").addEventListener("change",()=>{ selectedKey=$("videos").value; render(); });
  document.querySelectorAll("[data-command]").forEach(button=>button.addEventListener("click",()=>command(button.dataset.command)));
  document.querySelectorAll("[data-rate]").forEach(button=>button.addEventListener("click",()=>command("setRate",Number(button.dataset.rate))));
  $("timeline").addEventListener("change",()=>{const r=current();if(r?.bounds) command("seek",r.bounds[0]+(r.bounds[1]-r.bounds[0])*Number($("timeline").value)/1000);});
  $("jump-form").addEventListener("submit",event=>{event.preventDefault();const value=C.parseTime($("jump-to").value);if(value===null) UI.status("Scrivi secondi, mm:ss oppure hh:mm:ss.",true);else command("seek",value);});
  $("bookmark-form").addEventListener("submit",async event=>{event.preventDefault();await command("bookmark",$("bookmark-label").value);$("bookmark-label").value="";});
  $("enabled").addEventListener("change",async()=>{try{settings=await UI.saveSettings({enabled:$("enabled").checked});render();}catch{UI.status("Impossibile salvare le impostazioni.",true);}});
  $("site-enabled").addEventListener("change",async()=>{
    const site=current()?.site || tabSite;if(!site)return;
    const blocked=new Set(settings.blockedSites);if($("site-enabled").checked)blocked.delete(site);else blocked.add(site);
    try { settings=await UI.saveSettings({blockedSites:[...blocked]});render(); } catch { UI.status("Impossibile salvare le impostazioni.",true); }
  });
  $("settings").addEventListener("click",()=>chrome.runtime.openOptionsPage());
  chrome.storage.onChanged.addListener((changes,area)=>{if(area==="local"&&changes[C.SETTINGS_KEY]){settings=C.normalizeSettings(changes[C.SETTINGS_KEY].newValue);render();}});
  Promise.all([UI.loadSettings(),chrome.tabs.query({active:true,currentWindow:true})]).then(async([value,tabs])=>{
    settings=value;tabId=tabs[0]?.id;
    try { tabSite=new URL(tabs[0]?.url || "").hostname || "file"; } catch { tabSite=""; }
    await discover(); discoveryTimer=setInterval(discover,1000);
  }).catch(()=>UI.status("Apri una normale pagina con un video e riprova.",true));
  addEventListener("pagehide",()=>clearInterval(discoveryTimer));
})();
