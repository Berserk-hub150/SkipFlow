(() => {
  "use strict";
  const C=SkipFlowCore, UI=SkipFlowUI, $=UI.byId;
  let settings=C.normalizeSettings();
  function fill() {
    for(const key of ["smallSkip","largeSkip","speedStep","defaultRate","position"]) $(key).value=String(settings[key]);
    for(const key of ["enabled","rememberRate","shortcuts","fadePanel"]) $(key).checked=settings[key];
    renderSites();
  }
  function renderSites() {
    $("sites").replaceChildren();
    for(const site of settings.blockedSites) {
      const button=document.createElement("button");button.type="button";button.className="site";button.textContent=`${site} ×`;button.title=`Riattiva su ${site}`;
      button.addEventListener("click",async()=>{
        try { settings=await UI.saveSettings({blockedSites:settings.blockedSites.filter(s=>s!==site)});renderSites();UI.status(`Riattivato su ${site}.`); }
        catch {UI.status("Impossibile salvare. Riprova.",true);}
      });$("sites").append(button);
    }
    if(!settings.blockedSites.length){const label=document.createElement("span");label.className="sub";label.textContent="Nessun sito escluso.";$("sites").append(label);}
  }
  $("settings-form").addEventListener("submit",async event=>{
    event.preventDefault();const patch={};
    for(const key of ["smallSkip","largeSkip","speedStep","defaultRate"])patch[key]=Number($(key).value);
    patch.position=$("position").value;
    for(const key of ["enabled","rememberRate","shortcuts","fadePanel"])patch[key]=$(key).checked;
    try {settings=await UI.saveSettings(patch);fill();UI.status("Preferenze salvate.");}
    catch {UI.status("Impossibile salvare. Riprova.",true);}
  });
  $("reset").addEventListener("click",async()=>{
    try {settings=await UI.saveSettings({...C.DEFAULTS,blockedSites:settings.blockedSites});fill();UI.status("Preferenze ripristinate. Segnalibri conservati.");}
    catch {UI.status("Impossibile ripristinare.",true);}
  });
  UI.loadSettings().then(value=>{settings=value;fill();}).catch(()=>UI.status("Impossibile leggere le preferenze.",true));
})();
