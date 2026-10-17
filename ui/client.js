globalThis.SkipFlowUI = (() => {
  const C = globalThis.SkipFlowCore;
  async function loadSettings() { const data = await chrome.storage.local.get(C.SETTINGS_KEY); return C.normalizeSettings(data[C.SETTINGS_KEY]); }
  async function saveSettings(patch) {
    const current = await loadSettings();
    const value = C.normalizeSettings({...current, ...patch});
    await chrome.storage.local.set({[C.SETTINGS_KEY]:value});
    return value;
  }
  const byId = id => document.getElementById(id);
  function status(message, error = false) { const el = byId("status"); el.textContent = message; el.classList.toggle("error", error); }
  return {loadSettings, saveSettings, byId, status};
})();
