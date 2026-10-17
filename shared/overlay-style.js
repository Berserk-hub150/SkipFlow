globalThis.SkipFlowOverlayCSS = `
  :host { all: initial !important; color-scheme: dark !important; }
  *, *::before, *::after { box-sizing: border-box; }
  .panel { --mint:#9ef6d0; --muted:#a2afbd; font:12px/1.4 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
    color:#f5f8fc; background:rgba(15,22,31,.96); border:1px solid #35434f; border-radius:14px;
    box-shadow:0 12px 36px #0007; padding:10px; pointer-events:auto; transition:opacity .2s; width:100%; }
  .panel.faded:not(:hover):not(:focus-within) { opacity:.25; }
  .panel[hidden], [hidden] { display:none !important; }
  button, select, input { font:inherit; }
  button { cursor:pointer; color:inherit; background:#26313e; border:1px solid transparent; border-radius:8px; height:31px; padding:0 9px; white-space:nowrap; }
  button:hover { background:#344556; } button:focus-visible, input:focus-visible, select:focus-visible { outline:2px solid var(--mint); outline-offset:2px; }
  button:disabled { cursor:default; opacity:.4; }
  button.on { color:#09251b; background:var(--mint); }
  button.subtle { color:var(--muted); background:transparent; padding:0 6px; }
  button.seek { font-weight:750; background:#e4f9ef; color:#102c22; }
  button.seek:hover { background:var(--mint); }
  button.play { background:var(--mint); color:#102c22; min-width:35px; font-size:15px; }
  .top,.transport,.tools,.speed,.jump,.meta,.book-row { display:flex; align-items:center; gap:5px; }
  .top { justify-content:space-between; margin-bottom:8px; }
  .brand { font-size:11px; font-weight:800; letter-spacing:.07em; color:var(--mint); }
  .meta { color:var(--muted); font-size:11px; font-variant-numeric:tabular-nums; }
  .drag { cursor:grab; touch-action:none; letter-spacing:-2px; font-size:17px; }
  .transport { justify-content:space-between; flex-wrap:wrap; gap:7px; }
  .speed button { padding:0 7px; }
  .rate { min-width:46px; text-align:center; font-size:13px; font-weight:750; font-variant-numeric:tabular-nums; }
  .timeline { display:block; width:100%; accent-color:var(--mint); margin:10px 0 1px; height:12px; cursor:pointer; }
  .tools { flex-wrap:wrap; border-top:1px solid #2d3946; margin-top:9px; padding-top:9px; }
  .loop-label { display:block; color:var(--muted); font-size:11px; margin-top:7px; }
  .loop-label.active { color:var(--mint); }
  .book-row { margin-top:8px; }
  select { min-width:0; flex:1; color:#edf5f8; border:1px solid #394756; background:#202b38; padding:6px; border-radius:7px; }
  .toast { min-height:0; color:var(--mint); font-size:11px; margin-top:5px; }
  .toast:empty { display:none; }
  .panel.narrow .large,.panel.narrow .remaining,.panel.narrow .brand { display:none; }
  .panel.narrow .transport { justify-content:center; }
  .panel.narrow .top { margin-bottom:5px; }
  @media (prefers-reduced-motion:reduce) { .panel { transition:none; } }
`;
