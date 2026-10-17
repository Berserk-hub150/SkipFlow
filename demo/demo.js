(() => {
  const file = document.getElementById('file');
  const video = document.getElementById('demo-video');
  let url;
  file.addEventListener('change', () => {
    const selected = file.files[0];
    if (!selected) return;
    if (url) URL.revokeObjectURL(url);
    url = URL.createObjectURL(selected);
    video.src = url;
    video.setAttribute('aria-label', selected.name);
    document.getElementById('file-status').textContent = `Video aperto: ${selected.name}`;
    video.play().catch(() => {});
  });
  window.addEventListener('pagehide', () => { if (url) URL.revokeObjectURL(url); });
})();
