// Hash bookmark identities in the extension's secure context when a plain HTTP
// page doesn't expose Web Crypto. No URL is stored or sent outside the browser.
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (sender.id !== chrome.runtime.id || message?.type !== "SKIPFLOW_HASH") return;
  if (typeof message.input !== "string" || message.input.length > 32768) {
    respond({ok:false}); return;
  }
  crypto.subtle.digest("SHA-256", new TextEncoder().encode(message.input)).then(digest => {
    respond({ok:true, digest:Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("")});
  }).catch(() => respond({ok:false}));
  return true;
});
