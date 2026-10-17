/* Integration tests: real Chromium extension + local media, no third-party sites. */
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
let playwright;
try { playwright=require('playwright'); }
catch { playwright=require(require.resolve('playwright',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES || '']})); }
const root=path.resolve(__dirname,'..');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webm':'video/webm','.png':'image/png'};
const sample=fs.readFileSync(path.join(root,'demo/sample.webm'));
let server,context,profile;
const errors=[];
const passes=[];
function log(name){passes.push(name);console.log(`PASS ${name}`);}
function observe(page){page.on('pageerror',error=>errors.push(error.message));}
function fixture(frame=false){return `<!doctype html><html lang="it"><head><meta charset="utf-8"><title>${frame?'Embedded video':'SkipFlow test'}</title><style>body{margin:35px;background:#10171f;color:white;font:16px system-ui}.player{width:900px;max-width:90vw}video{width:100%;display:block}input,textarea{margin-top:15px;padding:10px}iframe{width:560px;height:360px;border:0}#shadow-host{display:block;width:400px}</style></head><body><div class="player"><video id="main" src="/demo/sample.webm" preload="auto" controls aria-label="${frame?'Embedded video':'Main demo video'}"></video></div>${frame?'':'<input id="typing" placeholder="typing"><textarea id="text-area"></textarea><div id="editable" contenteditable="true">Edit here</div><div id="shadow-host"></div>'}</body></html>`;}
function handler(req,res){
  const url=new URL(req.url,'http://localhost');
  if(['/fixture.html','/frame.html'].includes(url.pathname)){res.setHeader('Content-Type','text/html');res.end(fixture(url.pathname==='/frame.html'));return;}
  const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
  const bytes=url.pathname==='/demo/sample.webm'?sample:fs.readFileSync(file);
  res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.setHeader('Accept-Ranges','bytes');
  const match=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range||'');
  if(match){const start=Number(match[1]),end=Math.min(match[2]?Number(match[2]):bytes.length-1,bytes.length-1);res.writeHead(206,{'Content-Range':`bytes ${start}-${end}/${bytes.length}`,'Content-Length':end-start+1});res.end(bytes.subarray(start,end+1));}
  else{res.setHeader('Content-Length',bytes.length);res.end(bytes);}
}
async function time(video,value){await video.evaluate((v,t)=>{v.pause();v.currentTime=t;},value);await video.page().waitForTimeout(140);}
async function near(video,value,tolerance=.2){assert.ok(Math.abs(await video.evaluate(v=>v.currentTime)-value)<tolerance,`Expected time near ${value}; actual ${await video.evaluate(v=>v.currentTime)}`);}
(async()=>{
  try {
    server=http.createServer(handler);await new Promise(resolve=>server.listen(0,'0.0.0.0',resolve));
    const port=server.address().port,base=`http://127.0.0.1:${port}`;
    profile=fs.mkdtempSync(path.join(os.tmpdir(),'skipflow-test-'));
    context=await playwright.chromium.launchPersistentContext(profile,{
      headless:true,channel:'chromium',
      ...(process.env.SKIPFLOW_CHROMIUM?{executablePath:process.env.SKIPFLOW_CHROMIUM}:{}),
      ignoreDefaultArgs:['--disable-extensions','--disable-component-extensions-with-background-pages'],
      args:[`--disable-extensions-except=${root}`,`--load-extension=${root}`,'--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required'],
      viewport:{width:1280,height:1050}
    });
    const admin=context.pages()[0];observe(admin);await admin.goto('chrome://extensions');
    await admin.waitForFunction(()=>!!chrome.developerPrivate);
    const infos=await admin.evaluate(()=>new Promise(resolve=>chrome.developerPrivate.getExtensionsInfo({includeDisabled:true,includeTerminated:true},resolve)));
    const extension=infos.find(x=>x.name.startsWith('SkipFlow'));
    assert.ok(extension,`Extension not loaded: ${JSON.stringify(infos.map(x=>({name:x.name,errors:x.manifestErrors})))}`);
    assert.equal(extension.manifestErrors?.length || 0,0);
    const id=extension.id;log('Manifest V3 loads in Chromium');
    const page=await context.newPage();observe(page);await page.goto(base+'/fixture.html');
    const video=page.locator('#main'),panel=page.locator('[data-skipflow]');
    await page.waitForFunction(()=>document.querySelector('#main').readyState>0);
    await panel.waitFor({state:'visible'});log('HTML5 video detected and overlay visible');
    await time(video,35);await panel.locator('[data-action=backSmall]').click();await near(video,25);
    await panel.locator('[data-action=forwardLarge]').click();await near(video,55);
    await panel.locator('[data-action=forwardLarge]').click();await near(video,60);
    await panel.locator('[data-action=tools]').click();
    await panel.locator('[data-action=undoSeek]').click();await near(video,55);
    await time(video,2);await panel.locator('[data-action=backLarge]').click();await near(video,0);
    log('Seek buttons, boundary clamps and undo');
    await panel.locator('[data-action=speedUp]').click();assert.equal(await video.evaluate(v=>v.playbackRate),1.25);
    await panel.locator('[data-action=toggleBoost]').click();assert.equal(await video.evaluate(v=>v.playbackRate),2);
    await panel.locator('[data-action=toggleBoost]').click();assert.equal(await video.evaluate(v=>v.playbackRate),1.25);
    await panel.locator('[data-action=resetRate]').click();assert.equal(await video.evaluate(v=>v.playbackRate),1);
    log('Speed increments, 2× toggle and reset');
    await time(video,40);await page.locator('#typing').focus();await page.keyboard.press('Shift+ArrowLeft');await near(video,40);
    await page.locator('#editable').focus();await page.keyboard.press('Shift+ArrowLeft');await near(video,40);
    await page.evaluate(()=>document.activeElement.blur());await page.keyboard.press('Shift+ArrowLeft');await near(video,30);
    log('Keyboard shortcuts and editable-field safeguards');
    await time(video,10);await panel.locator('[data-action=setA]').click();
    await time(video,15);await panel.locator('[data-action=setB]').click();
    assert.equal(await panel.locator('[data-action=toggleLoop]').getAttribute('aria-pressed'),'true');
    await video.evaluate(v=>{v.currentTime=14.9;return v.play();});
    await page.waitForFunction(()=>{const v=document.querySelector('#main');return !v.paused&&v.currentTime>=10&&v.currentTime<12;});
    await video.evaluate(v=>v.pause());await panel.locator('[data-action=clearLoop]').click();log('A–B loop returns to its start during playback');
    await time(video,22);await panel.locator('[data-action=bookmark]').click();
    await page.waitForFunction(()=>document.querySelector('[data-skipflow]').shadowRoot.querySelectorAll('[data-bookmarks] option').length===2);
    await page.reload();await panel.waitFor({state:'visible'});await panel.locator('[data-action=tools]').click();
    await page.waitForFunction(()=>document.querySelector('[data-skipflow]').shadowRoot.querySelectorAll('[data-bookmarks] option').length===2);
    log('Bookmark persists across reload');
    await page.evaluate(()=>{
      const h=document.querySelector('#shadow-host');const s=h.attachShadow({mode:'open'});
      s.innerHTML='<video src="/demo/sample.webm" preload="auto" controls aria-label="Shadow video" style="width:400px"></video>';
    });
    const frameNavigated=page.waitForEvent('framenavigated',{predicate:f=>f.url().includes('localhost')});
    await page.evaluate(({port})=>{const frame=document.createElement('iframe');frame.src=`http://localhost:${port}/frame.html`;document.body.append(frame);},{port});
    await page.waitForFunction(()=>document.querySelector('#shadow-host').shadowRoot.querySelector('video').readyState>0);
    const frame=await frameNavigated;
    assert.ok(frame);await frame.waitForFunction(()=>!!document.querySelector('[data-skipflow]'));
    const popup=await context.newPage();observe(popup);await page.bringToFront();await popup.goto(`chrome-extension://${id}/ui/popup.html`);
    await popup.waitForFunction(()=>document.querySelector('#videos').options.length>=3);
    log('Popup discovers main video, late open shadow DOM and cross-origin iframe');
    let options=await popup.locator('#videos option').evaluateAll(els=>els.map(e=>({value:e.value,text:e.textContent})));
    const mainOption=options.find(o=>o.text.includes('Main demo video'));
    const frameOption=options.find(o=>o.text.includes('Embedded video'));
    assert.ok(mainOption&&frameOption,JSON.stringify(options));
    await popup.locator('#videos').selectOption(mainOption.value);
    await popup.locator('#jump-to').fill('0:40');await popup.locator('#jump-to').press('Enter');await near(video,40);
    await popup.locator('[data-rate="1.5"]').click();assert.equal(await video.evaluate(v=>v.playbackRate),1.5);
    await popup.locator('#bookmark-label').fill('Ripasso <img src=x>');await popup.locator('#save-bookmark').click();
    await popup.waitForFunction(()=>document.querySelectorAll('#bookmarks .bookmark').length===2);
    assert.equal(await popup.locator('#bookmarks img').count(),0);assert.ok((await popup.locator('#bookmarks').textContent()).includes('<img src=x>'));
    await popup.locator('#bookmarks .bookmark').last().locator('.delete').click();await popup.waitForFunction(()=>document.querySelectorAll('#bookmarks .bookmark').length===1);
    log('Popup exact seek, speed presets, named bookmarks, safe labels and deletion');
    const embedded=frame.locator('#main');await embedded.evaluate(v=>{v.pause();v.currentTime=35;});
    await popup.locator('#videos').selectOption(frameOption.value);await popup.locator('[data-command=backSmall]').click();
    assert.ok(Math.abs(await embedded.evaluate(v=>v.currentTime)-25)<.2);await near(video,40);
    log('Popup targets the selected cross-origin video without changing the main video');
    const settingsPage=await context.newPage();observe(settingsPage);await settingsPage.goto(`chrome-extension://${id}/ui/options.html`);
    await settingsPage.locator('#smallSkip').fill('5');await settingsPage.locator('#largeSkip').fill('20');
    await settingsPage.getByRole('button',{name:'Salva preferenze'}).click();
    await page.waitForFunction(()=>document.querySelector('[data-skipflow]').shadowRoot.querySelector('[data-action=backSmall]').textContent==='−5');
    await popup.locator('#videos').selectOption(mainOption.value);await popup.locator('[data-command=backSmall]').click();await near(video,35);
    log('Options apply live to overlay and popup');
    await popup.locator('#site-enabled').uncheck();
    await panel.waitFor({state:'hidden'});await frame.locator('[data-skipflow]').waitFor({state:'hidden'});
    await page.bringToFront();await page.evaluate(()=>document.activeElement.blur());await page.keyboard.press('Shift+ArrowLeft');await near(video,35);
    await popup.locator('#site-enabled').check();await panel.waitFor({state:'visible'});
    log('Per-site disable includes embedded players and releases shortcuts');
    await popup.locator('#videos').selectOption(mainOption.value);
    await popup.locator('#panel-toggle').click();await panel.waitFor({state:'hidden'});
    await page.evaluate(()=>document.activeElement.blur());await page.keyboard.press('Shift+V');await panel.waitFor({state:'visible'});
    log('Hidden overlay can be restored from the keyboard');
    // Fullscreen is requested directly from the on-video control (real user activation).
    if(await panel.locator('[data-extras]').isHidden())await panel.locator('[data-action=tools]').click();
    await panel.locator('[data-action=fullscreen]').click();await page.waitForFunction(()=>!!document.fullscreenElement);
    await panel.waitFor({state:'visible'});await page.evaluate(()=>document.exitFullscreen());
    log('Container fullscreen retains the controller');
    await popup.locator('#enabled').uncheck();await panel.waitFor({state:'hidden'});
    await popup.locator('#enabled').check();await panel.waitFor({state:'visible'});
    log('Global enable / disable');
    const results=path.join(root,'test-results');fs.mkdirSync(results,{recursive:true});
    await page.goto(base+'/demo/index.html');await page.locator('[data-skipflow]').waitFor({state:'visible'});
    await page.screenshot({path:path.join(results,'demo.png'),fullPage:true});
    await popup.screenshot({path:path.join(results,'popup.png'),clip:{x:0,y:0,width:400,height:900}});
    await settingsPage.screenshot({path:path.join(results,'options.png'),fullPage:true});
    const info=await admin.evaluate(id=>new Promise(resolve=>chrome.developerPrivate.getExtensionInfo(id,resolve)),id);
    assert.equal(info.manifestErrors?.length || 0,0,JSON.stringify(info.manifestErrors));
    const runtimeErrors=(info.runtimeErrors || []).filter(e=>!String(e.message).includes('Receiving end does not exist'));
    assert.deepEqual(runtimeErrors,[],JSON.stringify(runtimeErrors));assert.deepEqual(errors,[]);
    const report={browser:context.browser().version(),passed:passes,errors,extensionId:id,date:new Date().toISOString()};
    fs.writeFileSync(path.join(results,'results.json'),JSON.stringify(report,null,2));
    console.log(`SUCCESS: ${passes.length} integration checks; browser ${report.browser}`);
  } finally {
    if(context)await context.close();if(server)await new Promise(resolve=>server.close(resolve));
    if(profile)fs.rmSync(profile,{recursive:true,force:true});
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
