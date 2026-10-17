/* SkipFlow · original implementation, MIT licensed. */
(function (root) {
  "use strict";
  const SETTINGS_KEY = "skipflow.settings";
  const RATE_KEY = "skipflow.lastRate";
  const BOOKMARK_PREFIX = "skipflow.bookmarks.";
  const DEFAULTS = Object.freeze({
    enabled: true, smallSkip: 10, largeSkip: 30, speedStep: 0.25,
    defaultRate: 1, rememberRate: true, shortcuts: true, fadePanel: false,
    position: "top-left", blockedSites: []
  });
  const bounded = (value, min, max, fallback) => {
    const n = typeof value === "number" ? value : Number(value);
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
  };
  const clampRate = value => Math.round(bounded(value, 0.25, 4, 1) * 100) / 100;
  function normalizeSettings(value = {}) {
    if (!value || typeof value !== "object") value = {};
    const result = { ...DEFAULTS };
    for (const key of ["enabled", "rememberRate", "shortcuts", "fadePanel"]) {
      result[key] = typeof value[key] === "boolean" ? value[key] : DEFAULTS[key];
    }
    result.smallSkip = Math.round(bounded(value.smallSkip, 1, 300, DEFAULTS.smallSkip));
    result.largeSkip = Math.round(bounded(value.largeSkip, 1, 600, DEFAULTS.largeSkip));
    result.speedStep = bounded(value.speedStep, 0.05, 1, DEFAULTS.speedStep);
    result.defaultRate = clampRate(value.defaultRate ?? DEFAULTS.defaultRate);
    result.position = ["top-left", "top-right", "bottom-left"].includes(value.position) ? value.position : DEFAULTS.position;
    result.blockedSites = Array.isArray(value.blockedSites) ? [...new Set(value.blockedSites
      .filter(x => typeof x === "string").map(x => x.trim().toLowerCase())
      .filter(x => x.length > 0 && x.length <= 253))].slice(0, 500) : [];
    return result;
  }
  function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return "—";
    const total = Math.floor(seconds);
    const h = Math.floor(total / 3600);
    const m = Math.floor(total / 60) % 60;
    const s = String(total % 60).padStart(2, "0");
    return h ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
  }
  const formatRate = rate => `${Number(clampRate(rate).toFixed(2))}×`;
  function parseTime(text) {
    if (typeof text !== "string") return null;
    const parts = text.trim().split(":");
    if (parts.length < 1 || parts.length > 3 || parts.some(p => !/^\d+(?:\.\d+)?$/.test(p))) return null;
    const nums = parts.map(Number);
    if (nums.some(n => !Number.isFinite(n))) return null;
    if (nums.length > 1 && nums.slice(1).some(n => n >= 60)) return null;
    return nums.reduce((acc, n) => acc * 60 + n, 0);
  }
  function seekTarget(target, duration, ranges = []) {
    if (!Number.isFinite(target)) return null;
    const valid = ranges.filter(r => Array.isArray(r) && r.length === 2 && Number.isFinite(r[0]) && Number.isFinite(r[1]) && r[1] >= r[0]);
    if (valid.length) {
      for (const [start, end] of valid) if (target >= start && target <= end) return target;
      const edges = valid.flat();
      return edges.reduce((best, edge) => Math.abs(edge - target) < Math.abs(best - target) ? edge : best, edges[0]);
    }
    return Number.isFinite(duration) && duration > 0 ? Math.max(0, Math.min(duration, target)) : null;
  }
  function editablePath(path) {
    return path.some(el => el && el.nodeType === 1 && (el.isContentEditable ||
      /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.getAttribute?.("role") === "textbox"));
  }
  const KEY_ACTIONS = Object.freeze({
    arrowleft: "backSmall", arrowright: "forwardSmall", arrowup: "speedUp", arrowdown: "speedDown",
    r: "resetRate", g: "toggleBoost", a: "setA", b: "setB", l: "toggleLoop",
    m: "bookmark", u: "undoSeek", v: "togglePanel"
  });
  function shortcutAction(event) {
    if (!event.shiftKey || event.ctrlKey || event.altKey || event.metaKey || event.isComposing || event.defaultPrevented) return null;
    return KEY_ACTIONS[String(event.key).toLowerCase()] || null;
  }
  function cleanPageUrl(raw) {
    try {
      const url = new URL(raw);
      url.hash = "";
      for (const key of [...url.searchParams.keys()]) {
        if (/^utm_/i.test(key) || ["t", "start", "time_continue", "fbclid", "gclid"].includes(key)) url.searchParams.delete(key);
      }
      return url.href;
    } catch { return String(raw); }
  }
  function sanitizeBookmarks(items) {
    if (!Array.isArray(items)) return [];
    return items.filter(x => x && typeof x.id === "string" && Number.isFinite(x.time) && x.time >= 0)
      .slice(0, 50).map(x => ({ id: x.id.slice(0, 80), time: x.time,
        label: String(x.label || `Punto ${formatTime(x.time)}`).slice(0, 100) }));
  }
  const api = Object.freeze({SETTINGS_KEY, RATE_KEY, BOOKMARK_PREFIX, DEFAULTS, normalizeSettings,
    clampRate, formatTime, formatRate, parseTime, seekTarget, editablePath, shortcutAction, cleanPageUrl, sanitizeBookmarks});
  root.SkipFlowCore = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(globalThis);
