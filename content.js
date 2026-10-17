(() => {
  "use strict";
  if (globalThis.__skipFlowLoaded || !globalThis.chrome?.runtime?.id) return;
  globalThis.__skipFlowLoaded = true;
  const C = globalThis.SkipFlowCore;
  const media = new Map();
  const roots = new Map();
  let settings = C.normalizeSettings();
  let lastRate = 1;
  let active = null;
  let panelHidden = false;
  let sequence = 0;
  let layoutPending = false;
  let moved = {x: 0, y: 0};
  let lastPage = location.href;
  let feedbackTimer;
  let toastMessage = "";
  let toastUntil = 0;
  let fadeTimer;
  let drag = null;
  const host = document.createElement("div");
  host.setAttribute("data-skipflow", "controller");
  for (const [key, value] of Object.entries({position:"fixed", display:"none", "z-index":"2147483647", "pointer-events":"none", "font-size":"12px", margin:"0", padding:"0", border:"0", transform:"none", opacity:"1", isolation:"isolate"})) {
    host.style.setProperty(key, value, "important");
  }
  const shadow = host.attachShadow({mode:"open"});
  shadow.innerHTML = `<style>${globalThis.SkipFlowOverlayCSS}</style>
    <section class="panel" aria-label="SkipFlow · controlli video">
      <div class="top"><div class="meta"><button type="button" class="subtle drag" data-drag title="Trascina il pannello" aria-label="Sposta il pannello">⠿</button><span class="brand">SKIPFLOW</span><span data-clock>0:00 / —</span><span class="remaining" data-remaining></span></div>
      <div><button type="button" class="subtle" data-action="tools" aria-expanded="false" title="Loop, segnalibri e altre funzioni">Studio ▾</button><button type="button" class="subtle" data-action="togglePanel" title="Nascondi · Shift+V" aria-label="Nascondi pannello">×</button></div></div>
      <div class="transport"><div class="jump">
        <button type="button" class="seek large" data-action="backLarge" title="Indietro di 30 secondi">−30</button>
        <button type="button" class="seek" data-action="backSmall" title="Indietro di 10 secondi · Shift+←">−10</button>
        <button type="button" class="play" data-action="play" title="Riproduci o metti in pausa" aria-label="Riproduci">▶</button>
        <button type="button" class="seek" data-action="forwardSmall" title="Avanti di 10 secondi · Shift+→">+10</button>
        <button type="button" class="seek large" data-action="forwardLarge" title="Avanti di 30 secondi">+30</button></div>
      <div class="speed"><button type="button" data-action="speedDown" title="Riduci velocità · Shift+↓" aria-label="Riduci velocità">−</button><span class="rate" data-rate>1×</span><button type="button" data-action="speedUp" title="Aumenta velocità · Shift+↑" aria-label="Aumenta velocità">+</button><button type="button" data-action="toggleBoost" title="Passa a 2× o torna alla velocità precedente · Shift+G">2×</button><button type="button" class="subtle" data-action="resetRate" title="Velocità normale · Shift+R">1×</button></div></div>
      <input class="timeline" type="range" min="0" max="1000" value="0" step="1" aria-label="Posizione nel video">
      <div data-extras hidden><div class="tools">
        <button type="button" data-action="setA" title="Segna inizio · Shift+A">A · Inizio</button><button type="button" data-action="setB" title="Segna fine · Shift+B">B · Fine</button>
        <button type="button" data-action="toggleLoop" title="Attiva o disattiva loop · Shift+L" aria-pressed="false">↻ A–B</button><button type="button" class="subtle" data-action="clearLoop" aria-label="Cancella intervallo A–B">Pulisci</button>
        <button type="button" data-action="bookmark" title="Salva questo punto · Shift+M">☆ Segna</button><button type="button" data-action="undoSeek" title="Annulla ultimo salto · Shift+U">↶ Salto</button>
        <button type="button" data-action="pip" title="Apri o chiudi Picture-in-Picture">PiP</button><button type="button" data-action="fullscreen" title="Schermo intero">⛶</button>
      </div><span class="loop-label" data-loop-label>A —  ·  B —</span>
      <div class="book-row"><select data-bookmarks aria-label="Segnalibri di questo video"><option value="">Nessun segnalibro</option></select><button type="button" data-action="goBookmark">Vai</button></div></div>
      <div class="toast" role="status" aria-live="polite"></div>
    </section>`;
  const $ = selector => shadow.querySelector(selector);
  const panel = $(".panel");
  const btn = action => $(`[data-action="${action}"]`);
  const rangeInput = $(".timeline");
  function siteKey() {
    try {
      const ancestors = location.ancestorOrigins;
      if (ancestors?.length) return new URL(ancestors[ancestors.length - 1]).hostname.toLowerCase() || "file";
    } catch { /* Current frame host is the fallback. */ }
    return location.hostname.toLowerCase() || "file";
  }
  const site = siteKey();
  const enabled = () => settings.enabled && !settings.blockedSites.includes(site);
  const safely = promise => Promise.resolve(promise).catch(() => {});
  function tell(message) {
    toastMessage = String(message);
    toastUntil = Date.now() + 3200;
    $(".toast").textContent = toastMessage;
    clearTimeout(feedbackTimer);
    feedbackTimer = setTimeout(() => { toastMessage = ""; $(".toast").textContent = ""; }, 3200);
  }
  function wake() {
    panel.classList.remove("faded");
    clearTimeout(fadeTimer);
    if (settings.fadePanel) fadeTimer = setTimeout(() => panel.classList.add("faded"), 3200);
  }
  function rangesOf(video) {
    const result = [];
    try { for (let i = 0; i < video.seekable.length; i++) result.push([video.seekable.start(i), video.seekable.end(i)]); } catch { /* Media can change during a read. */ }
    return result;
  }
  function boundsOf(video) {
    const ranges = rangesOf(video);
    if (Number.isFinite(video.duration) && video.duration > 0) return [0, video.duration];
    return ranges.length ? [ranges[0][0], ranges[ranges.length - 1][1]] : null;
  }
  function videoLabel(record) {
    return (record.video.getAttribute("aria-label") || record.video.getAttribute("title") || document.title || `Video ${record.id}`).slice(0, 120);
  }
  function snapshot(record) {
    const v = record.video;
    const rect = v.getBoundingClientRect();
    return {id:record.id, title:videoLabel(record), site, enabled:enabled(),
      time:Number.isFinite(v.currentTime) ? v.currentTime : 0, duration:Number.isFinite(v.duration) ? v.duration : null,
      rate:v.playbackRate, paused:v.paused, bounds:boundsOf(v), ready:v.readyState > 0,
      visible:visible(record), area:Math.max(0, rect.width * rect.height), selected:record === active,
      loop:{a:record.a, b:record.b, enabled:record.loop}, bookmarks:record.bookmarks,
      bookmarksReady:record.bookmarksReady, canUndo:record.history.length > 0, panelHidden,
      pipAvailable:!!document.pictureInPictureEnabled && !v.disablePictureInPicture,
      message:Date.now() < toastUntil ? toastMessage : ""};
  }
  async function loadBookmarks(record) {
    const generation = ++record.generation;
    record.bookmarksReady = false;
    record.bookmarks = [];
    record.bookmarkKey = null;
    let source = record.video.currentSrc || record.video.getAttribute("src") || record.video.querySelector("source")?.getAttribute("src") || "";
    if (source.startsWith("blob:")) source = "dynamic";
    else if (source) {
      try { const url = new URL(source, location.href); source = url.origin + url.pathname; } catch { source = "media"; }
    }
    // A stable page identity plus media source; signed source queries are never stored.
    // Slot disambiguates multiple blob players on the same page.
    const slot = source === "dynamic" || !source ? `|slot:${[...media.values()].indexOf(record)}` : "";
    const identity = `${C.cleanPageUrl(location.href)}|${source}${slot}|${source === "dynamic" ? (record.video.getAttribute("aria-label") || "") : ""}`;
    try {
      let hash;
      if (crypto.subtle) {
        const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(identity));
        hash = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
      } else {
        const reply = await chrome.runtime.sendMessage({type:"SKIPFLOW_HASH", input:identity});
        if (!reply?.ok || !/^[a-f0-9]{64}$/.test(reply.digest)) throw new Error("Hash unavailable");
        hash = reply.digest;
      }
      const key = C.BOOKMARK_PREFIX + hash;
      const stored = await chrome.storage.local.get(key);
      if (record.generation !== generation || !media.has(record.video)) return;
      record.bookmarkKey = key;
      record.bookmarks = C.sanitizeBookmarks(stored[key]?.items);
      record.bookmarksReady = true;
    } catch { /* No bookmark writes without a stable identity and working storage. */ }
    if (record === active) render();
  }
  async function writeBookmarks(record, items) {
    if (!record.bookmarkKey || !record.bookmarksReady) throw new Error("Segnalibri non ancora pronti: attendi il caricamento del video.");
    const key = record.bookmarkKey, generation = record.generation;
    const safe = C.sanitizeBookmarks(items).sort((a, b) => a.time - b.time);
    await chrome.storage.local.set({[key]:{items:safe, updatedAt:Date.now()}});
    if (record.generation === generation && record.bookmarkKey === key) record.bookmarks = safe;
    // Bound local bookmark storage to the 100 most recently modified video entries.
    const all = await chrome.storage.local.get(null);
    const keys = Object.keys(all).filter(k => k.startsWith(C.BOOKMARK_PREFIX))
      .sort((a,b) => (all[b]?.updatedAt || 0) - (all[a]?.updatedAt || 0));
    if (keys.length > 100) await chrome.storage.local.remove(keys.slice(100));
    render();
  }
  function resetMedia(record) {
    record.a = null; record.b = null; record.loop = false; record.history = [];
    record.boostBefore = 1;
    safely(loadBookmarks(record));
    if (enabled() && record.video.readyState > 0) setRate(record, settings.rememberRate ? lastRate : settings.defaultRate, false);
    if (record === active) render();
  }
  function setRate(record, value, persist = true) {
    const rate = C.clampRate(value);
    try {
      record.video.playbackRate = rate;
      if (persist && settings.rememberRate) {
        lastRate = rate;
        safely(chrome.storage.local.set({[C.RATE_KEY]:rate}));
      }
      return true;
    } catch { tell("Questo player non consente questa velocità."); return false; }
  }
  function seek(record, value, remember = true) {
    const v = record.video;
    if (v.readyState === 0) { tell("Attendi che il video sia caricato."); return false; }
    const target = C.seekTarget(value, v.duration, rangesOf(v));
    if (target === null) { tell("Questo video non offre una timeline navigabile."); return false; }
    try {
      const previous = v.currentTime;
      v.currentTime = target;
      if (remember && Math.abs(previous - target) > .05) {
        record.history.push(previous); if (record.history.length > 20) record.history.shift();
      }
      return true;
    } catch { tell("Il player ha bloccato il salto."); return false; }
  }
  async function act(record, action, value) {
    if (action === "togglePanel") { panelHidden = !panelHidden; scheduleLayout(); return; }
    if (!record || !media.has(record.video)) throw new Error("Video non disponibile.");
    if (!enabled()) throw new Error("SkipFlow è disattivato per questo sito.");
    active = record;
    const v = record.video;
    wake();
    switch (action) {
      case "backSmall": seek(record, v.currentTime - settings.smallSkip); break;
      case "forwardSmall": seek(record, v.currentTime + settings.smallSkip); break;
      case "backLarge": seek(record, v.currentTime - settings.largeSkip); break;
      case "forwardLarge": seek(record, v.currentTime + settings.largeSkip); break;
      case "seek": if (!Number.isFinite(value)) throw new Error("Posizione non valida."); seek(record, value); break;
      case "undoSeek": {
        const previous = record.history.pop();
        if (previous !== undefined) seek(record, previous, false);
        else tell("Nessun salto da annullare.");
        break;
      }
      case "speedUp": setRate(record, v.playbackRate + settings.speedStep); break;
      case "speedDown": setRate(record, v.playbackRate - settings.speedStep); break;
      case "setRate": if (!Number.isFinite(value)) throw new Error("Velocità non valida."); setRate(record, value); break;
      case "resetRate": setRate(record, 1); break;
      case "toggleBoost":
        if (Math.abs(v.playbackRate - 2) < .01) setRate(record, record.boostBefore === 2 ? 1 : record.boostBefore);
        else { record.boostBefore = v.playbackRate; setRate(record, 2); }
        break;
      case "play": if (v.paused) await v.play(); else v.pause(); break;
      case "setA":
        record.a = v.currentTime;
        if (record.b !== null && record.b <= record.a + .25) { record.b = null; record.loop = false; }
        tell(`Inizio A: ${C.formatTime(record.a)}`); break;
      case "setB":
        if (record.a === null) { tell("Segna prima il punto A."); break; }
        if (v.currentTime <= record.a + .25) { tell("Il punto B deve essere dopo A (almeno 0,25 secondi)."); break; }
        record.b = v.currentTime; record.loop = true; tell("Loop A–B attivo."); break;
      case "toggleLoop":
        if (record.a === null || record.b === null) { tell("Segna prima i punti A e B."); break; }
        record.loop = !record.loop;
        if (record.loop && (v.currentTime < record.a || v.currentTime >= record.b)) seek(record, record.a, false);
        break;
      case "clearLoop": record.a = null; record.b = null; record.loop = false; break;
      case "bookmark": {
        if (v.readyState === 0) { tell("Carica prima il video."); break; }
        if (record.bookmarks.length >= 50) { tell("Limite di 50 segnalibri per video raggiunto."); break; }
        if (record.bookmarks.some(b => Math.abs(b.time - v.currentTime) < 1)) { tell("Hai già un segnalibro qui."); break; }
        const label = typeof value === "string" && value.trim() ? value.trim().slice(0, 100) : `Punto ${C.formatTime(v.currentTime)}`;
        await writeBookmarks(record, [...record.bookmarks, {id:crypto.randomUUID(), time:v.currentTime, label}]);
        tell("Segnalibro salvato su questo dispositivo."); break;
      }
      case "deleteBookmark": await writeBookmarks(record, record.bookmarks.filter(b => b.id !== value)); break;
      case "goBookmark": {
        const mark = record.bookmarks.find(b => b.id === value);
        if (mark) seek(record, mark.time); break;
      }
      case "pip":
        if (document.pictureInPictureElement === v) await document.exitPictureInPicture();
        else if (document.pictureInPictureEnabled && !v.disablePictureInPicture) await v.requestPictureInPicture();
        else tell("Picture-in-Picture non disponibile per questo video.");
        break;
      case "fullscreen":
        if (document.fullscreenElement) await document.exitFullscreen();
        else await (v.parentElement === document.body ? document.documentElement : v.parentElement || v.getRootNode().host || v).requestFullscreen();
        break;
      default: throw new Error("Comando sconosciuto.");
    }
    render(); scheduleLayout();
  }
  function visible(record) {
    if (!record.video.isConnected) return false;
    const r = record.video.getBoundingClientRect();
    if (r.width < 80 || r.height < 45 || r.bottom <= 0 || r.top >= innerHeight || r.right <= 0 || r.left >= innerWidth) return false;
    const style = getComputedStyle(record.video);
    return style.visibility !== "hidden" && style.display !== "none" && Number(style.opacity) !== 0;
  }
  function choose() {
    const options = [...media.values()].filter(visible);
    if (active && options.includes(active) && (!active.video.paused || Date.now() - active.lastActive < 5000)) return;
    options.sort((a,b) => Number(a.video.paused) - Number(b.video.paused) || b.lastActive - a.lastActive ||
      (b.video.clientWidth * b.video.clientHeight) - (a.video.clientWidth * a.video.clientHeight));
    if (active !== (options[0] || null)) { active = options[0] || null; moved = {x:0,y:0}; render(); }
  }
  function render() {
    if (!active) return;
    const v = active.video;
    $("[data-clock]").textContent = `${C.formatTime(v.currentTime)} / ${C.formatTime(v.duration)}`;
    $("[data-rate]").textContent = C.formatRate(v.playbackRate);
    $("[data-remaining]").textContent = Number.isFinite(v.duration) ? `· restano ${C.formatTime(Math.max(0, v.duration - v.currentTime) / (v.playbackRate || 1))}` : "· LIVE";
    btn("play").textContent = v.paused ? "▶" : "Ⅱ";
    btn("play").setAttribute("aria-label", v.paused ? "Riproduci" : "Pausa");
    btn("toggleBoost").classList.toggle("on", Math.abs(v.playbackRate - 2) < .01);
    btn("toggleBoost").setAttribute("aria-pressed", String(Math.abs(v.playbackRate - 2) < .01));
    btn("toggleLoop").classList.toggle("on", active.loop);
    btn("toggleLoop").setAttribute("aria-pressed", String(active.loop));
    btn("undoSeek").disabled = !active.history.length;
    btn("pip").disabled = !document.pictureInPictureEnabled || v.disablePictureInPicture;
    btn("bookmark").disabled = !active.bookmarksReady;
    const loopLabel = $("[data-loop-label]");
    loopLabel.textContent = `A ${C.formatTime(active.a)}  ·  B ${C.formatTime(active.b)}${active.loop ? "  ·  IN RIPETIZIONE" : ""}`;
    loopLabel.classList.toggle("active", active.loop);
    for (const [action, amount] of [["backSmall",-settings.smallSkip],["forwardSmall",settings.smallSkip],["backLarge",-settings.largeSkip],["forwardLarge",settings.largeSkip]]) {
      btn(action).textContent = `${amount < 0 ? "−" : "+"}${Math.abs(amount)}`;
      btn(action).title = `${amount < 0 ? "Indietro" : "Avanti"} di ${Math.abs(amount)} secondi`;
    }
    const bounds = boundsOf(v);
    rangeInput.disabled = !bounds || v.readyState === 0;
    if (shadow.activeElement !== rangeInput && bounds) rangeInput.value = String(Math.max(0, Math.min(1000, ((v.currentTime - bounds[0]) / (bounds[1] - bounds[0] || 1)) * 1000)));
    rangeInput.setAttribute("aria-valuetext", C.formatTime(v.currentTime));
    const select = $("[data-bookmarks]");
    const signature = JSON.stringify(active.bookmarks);
    if (select.dataset.signature !== signature) {
      const previous = select.value;
      select.replaceChildren();
      const placeholder = document.createElement("option"); placeholder.value = "";
      placeholder.textContent = active.bookmarks.length ? `${active.bookmarks.length} segnalibri · scegli un punto` : "Nessun segnalibro";
      select.append(placeholder);
      for (const b of active.bookmarks) {
        const option = document.createElement("option"); option.value = b.id; option.textContent = `${C.formatTime(b.time)} · ${b.label}`; select.append(option);
      }
      if (active.bookmarks.some(b => b.id === previous)) select.value = previous;
      select.dataset.signature = signature;
    }
  }
  function layout() {
    layoutPending = false;
    choose();
    if (!enabled() || panelHidden || !active || !visible(active) || document.pictureInPictureElement === active.video) {
      host.style.setProperty("display", "none", "important"); return;
    }
    const full = document.fullscreenElement;
    // Replaced elements such as <video> cannot display child overlays in native fullscreen.
    if (full?.tagName === "VIDEO") { host.style.setProperty("display", "none", "important"); return; }
    const target = full?.shadowRoot || full || document.documentElement;
    if (host.parentNode !== target) target.append(host);
    const r = active.video.getBoundingClientRect();
    const width = Math.max(230, Math.min(595, r.width - 20, innerWidth - 20));
    host.style.setProperty("width", `${width}px`, "important");
    panel.classList.toggle("narrow", width < 440);
    host.style.setProperty("display", "block", "important");
    const height = panel.getBoundingClientRect().height;
    const baseX = settings.position === "top-right" ? r.right - width - 10 : r.left + 10;
    const baseY = settings.position === "bottom-left" ? r.bottom - height - 12 : r.top + 10;
    const x = Math.max(8, Math.min(innerWidth - width - 8, baseX + moved.x));
    const y = Math.max(8, Math.min(innerHeight - height - 8, baseY + moved.y));
    host.style.setProperty("left", `${x}px`, "important");
    host.style.setProperty("top", `${y}px`, "important");
  }
  function scheduleLayout() {
    if (!layoutPending) { layoutPending = true; requestAnimationFrame(layout); }
  }
  function register(video) {
    if (media.has(video)) return;
    const controller = new AbortController();
    const record = {id:`v${++sequence}`, video, controller, a:null, b:null, loop:false,
      history:[], bookmarks:[], bookmarkKey:null, bookmarksReady:false, generation:0,
      lastActive:0, boostBefore:1};
    media.set(video, record);
    const listen = (type, handler) => video.addEventListener(type, handler, {signal:controller.signal});
    const select = () => { active = record; record.lastActive = Date.now(); render(); scheduleLayout(); };
    listen("pointerdown", select);
    listen("play", () => { select(); wake(); });
    listen("pause", () => { if (record === active) render(); });
    listen("ratechange", () => { if (record === active) render(); });
    listen("loadedmetadata", () => { resetMedia(record); scheduleLayout(); });
    listen("emptied", () => { record.generation++; record.a = null; record.b = null; record.loop = false; record.history=[]; record.bookmarks=[]; record.bookmarksReady=false; render(); });
    listen("durationchange", () => { if (record === active) render(); });
    listen("timeupdate", () => {
      if (enabled() && record.loop && record.a !== null && record.b !== null && (video.currentTime >= record.b || video.currentTime < record.a - .3)) seek(record, record.a, false);
      if (record === active) render();
    });
    listen("ended", () => { if (enabled() && record.loop && record.a !== null) { seek(record, record.a, false); safely(video.play()); } });
    for (const type of ["enterpictureinpicture", "leavepictureinpicture", "resize"]) listen(type, scheduleLayout);
    resizeObserver.observe(video);
    resetMedia(record);
    scheduleLayout();
  }
  const resizeObserver = new ResizeObserver(scheduleLayout);
  function scan(root) {
    if (!root || root === host || (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11)) return;
    if (root.tagName === "VIDEO") register(root);
    root.querySelectorAll?.("video").forEach(register);
    const elements = root.nodeType === 1 ? [root, ...root.querySelectorAll("*")] : root.querySelectorAll?.("*") || [];
    for (const element of elements) if (element !== host && element.shadowRoot) observeRoot(element.shadowRoot);
  }
  function observeRoot(root) {
    if (roots.has(root)) return;
    const observer = new MutationObserver(mutations => {
      for (const mutation of mutations) for (const node of mutation.addedNodes) scan(node);
      scheduleLayout();
    });
    roots.set(root, observer);
    observer.observe(root, {subtree:true, childList:true});
    scan(root);
  }
  // Contain events so clicking the controller doesn't also toggle the website's player.
  for (const type of ["click", "dblclick", "pointerdown", "pointerup", "mousedown", "mouseup", "keydown", "keyup"]) {
    shadow.addEventListener(type, event => event.stopPropagation());
  }
  shadow.addEventListener("click", event => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    if (button.dataset.action === "tools") {
      const extras = $("[data-extras]"); extras.hidden = !extras.hidden;
      button.setAttribute("aria-expanded", String(!extras.hidden)); scheduleLayout(); return;
    }
    const value = button.dataset.action === "goBookmark" ? $("[data-bookmarks]").value : undefined;
    act(active, button.dataset.action, value).catch(e => tell(e.message || "Il player ha bloccato il comando."));
  });
  rangeInput.addEventListener("input", () => {
    if (!active) return;
    const bounds = boundsOf(active.video);
    if (bounds) seek(active, bounds[0] + (bounds[1] - bounds[0]) * Number(rangeInput.value) / 1000, false);
  });
  const handle = $("[data-drag]");
  handle.addEventListener("pointerdown", event => {
    if (event.button !== 0) return;
    drag = {x:event.clientX, y:event.clientY, origin:{...moved}};
    handle.setPointerCapture(event.pointerId); event.preventDefault();
  });
  handle.addEventListener("pointermove", event => {
    if (!drag) return;
    moved = {x:drag.origin.x + event.clientX - drag.x, y:drag.origin.y + event.clientY - drag.y};
    scheduleLayout();
  });
  for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) handle.addEventListener(type, () => { drag = null; });
  panel.addEventListener("pointerenter", wake);
  document.addEventListener("keydown", event => {
    if (!enabled() || !settings.shortcuts || event.composedPath().includes(host) || C.editablePath(event.composedPath())) return;
    const action = C.shortcutAction(event);
    if (!action) return;
    choose();
    if (!active) return;
    event.preventDefault(); event.stopImmediatePropagation();
    act(active, action).catch(e => tell(e.message || "Comando non disponibile."));
  }, true);
  addEventListener("scroll", scheduleLayout, {capture:true, passive:true});
  addEventListener("resize", scheduleLayout, {passive:true});
  document.addEventListener("fullscreenchange", scheduleLayout);
  chrome.runtime.onMessage.addListener((message, sender, respond) => {
    if (sender.id !== chrome.runtime.id) return;
    if (message?.type === "SKIPFLOW_DISCOVER") {
      choose();
      safely(chrome.runtime.sendMessage({type:"SKIPFLOW_STATE", nonce:message.nonce,
        records:[...media.values()].filter(r => r.video.isConnected).map(snapshot)}));
      respond({ok:true}); return;
    }
    if (message?.type === "SKIPFLOW_COMMAND") {
      const record = [...media.values()].find(r => r.id === message.id && r.video.isConnected);
      act(record, message.action, message.value).then(() => respond({ok:true, state:record ? snapshot(record) : null}))
        .catch(error => respond({ok:false, error:error.message || "Comando non disponibile."}));
      return true;
    }
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (changes[C.SETTINGS_KEY]) {
      settings = C.normalizeSettings(changes[C.SETTINGS_KEY].newValue); wake();
      if (!enabled()) for (const r of media.values()) r.loop = false;
      render(); scheduleLayout();
    }
    if (changes[C.RATE_KEY]) lastRate = C.clampRate(changes[C.RATE_KEY].newValue ?? settings.defaultRate);
    for (const record of media.values()) if (record.bookmarkKey && changes[record.bookmarkKey]) {
      record.bookmarks = C.sanitizeBookmarks(changes[record.bookmarkKey].newValue?.items);
      if (record === active) render();
    }
  });
  chrome.storage.local.get([C.SETTINGS_KEY, C.RATE_KEY]).then(stored => {
    settings = C.normalizeSettings(stored[C.SETTINGS_KEY]);
    lastRate = C.clampRate(stored[C.RATE_KEY] ?? settings.defaultRate);
    observeRoot(document);
    wake(); scheduleLayout();
    setInterval(() => {
      for (const [video, record] of media) if (!video.isConnected) {
        record.generation++; record.controller.abort(); resizeObserver.unobserve(video); media.delete(video);
      }
      for (const [root, observer] of roots) if (root.host && !root.host.isConnected) { observer.disconnect(); roots.delete(root); }
      if (location.href !== lastPage) { lastPage = location.href; for (const record of media.values()) resetMedia(record); }
      // Detect shadow roots attached to existing elements without patching the page's APIs.
      scan(document);
      for (const root of roots.keys()) if (root !== document && root.host?.isConnected) scan(root);
      render(); scheduleLayout();
    }, 1800);
  }).catch(() => { /* Extension was reloaded; refreshing this page restores it. */ });
})();
