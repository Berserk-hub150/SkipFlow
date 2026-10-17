const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createHarness,delay,until}=require('./harness.cjs');
const C=require('../shared/core.js');
function setup(t,initial){const h=createHarness(initial);t.after(()=>h.close());return h;}
test('DOM: overlay detects a video and button clicks perform bounded seeks and undo',async t=>{
  const h=setup(t),r=await h.content();
  assert.equal(r.host.style.display,'block');
  r.panel.querySelector('[data-action=backSmall]').click();await delay(5);assert.equal(r.video.currentTime,25);
  r.panel.querySelector('[data-action=forwardLarge]').click();await delay(5);assert.equal(r.video.currentTime,55);
  await h.command(0,'seek',999);assert.equal(r.video.currentTime,120);
  await h.command(0,'undoSeek');assert.equal(r.video.currentTime,55);
  await h.command(0,'backLarge');assert.equal(r.video.currentTime,25);
  await h.command(0,'backLarge');assert.equal(r.video.currentTime,0);
  assert.deepEqual(h.errors,[]);
});
test('DOM: nonseekable live media is left unchanged and invalid values are rejected',async t=>{
  const h=setup(t),r=await h.content({duration:Infinity,ranges:[],time:300});
  await h.command(0,'backSmall');assert.equal(r.video.currentTime,300);
  assert.match((await h.state())[0].message,/timeline/);
  const bad=await h.command(0,'seek',Infinity);assert.equal(bad.ok,false);assert.equal(r.video.currentTime,300);
});
test('DOM: speed changes, upper/lower bounds and reversible 2× persist as configured',async t=>{
  const h=setup(t),r=await h.content();
  await h.command(0,'setRate',1.5);await h.command(0,'toggleBoost');assert.equal(r.video.playbackRate,2);
  await h.command(0,'toggleBoost');assert.equal(r.video.playbackRate,1.5);
  await h.command(0,'setRate',99);assert.equal(r.video.playbackRate,4);
  await h.command(0,'speedUp');assert.equal(r.video.playbackRate,4);
  await h.command(0,'setRate',0);assert.equal(r.video.playbackRate,.25);
  await h.command(0,'resetRate');assert.equal(r.video.playbackRate,1);assert.equal(h.data[C.RATE_KEY],1);
});
test('DOM: A–B validates endpoints, loops on media updates and clears on source reload',async t=>{
  const h=setup(t),r=await h.content();
  await h.command(0,'setB');assert.equal((await h.state())[0].loop.b,null);
  r.video.currentTime=10;await h.command(0,'setA');r.video.currentTime=9;await h.command(0,'setB');assert.equal((await h.state())[0].loop.b,null);
  r.video.currentTime=15;await h.command(0,'setB');assert.equal((await h.state())[0].loop.enabled,true);
  r.video.currentTime=15.1;r.video.tick();assert.equal(r.video.currentTime,10);
  await h.command(0,'toggleLoop');r.video.currentTime=16;r.video.tick();assert.equal(r.video.currentTime,16);
  r.video.dispatchEvent(new r.window.Event('loadedmetadata'));await delay(20);assert.equal((await h.state())[0].loop.a,null);
});
test('DOM: text fields, modifiers and composing input never trigger video shortcuts',async t=>{
  const h=setup(t),r=await h.content(),w=r.window;
  const key=(target,extra={})=>target.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowLeft',shiftKey:true,bubbles:true,cancelable:true,composed:true,...extra}));
  key(w.document.querySelector('#typing'));assert.equal(r.video.currentTime,35);
  key(w.document.querySelector('textarea'));assert.equal(r.video.currentTime,35);
  Object.defineProperty(w.document.querySelector('#editable'),'isContentEditable',{value:true});
  key(w.document.querySelector('#editable'));assert.equal(r.video.currentTime,35);
  key(w.document.body,{ctrlKey:true});key(w.document.body,{isComposing:true});assert.equal(r.video.currentTime,35);
  key(w.document.body);assert.equal(r.video.currentTime,25);
});
test('DOM: named bookmarks persist across content reload, navigate, and delete safely',async t=>{
  const h=setup(t);let r=await h.content();
  const response=await h.command(0,'bookmark','Teorema <img src=x>');assert.equal(response.ok,true);
  const marks=(await h.state())[0].bookmarks;assert.equal(marks.length,1);assert.equal(marks[0].time,35);
  const key=Object.keys(h.data).find(k=>k.startsWith(C.BOOKMARK_PREFIX));assert.ok(key);assert.ok(!key.includes('example.com'));
  r.close();r=await h.content();assert.equal((await h.state())[0].bookmarks[0].label,'Teorema <img src=x>');
  r.video.currentTime=60;await h.command(0,'goBookmark',marks[0].id);assert.equal(r.video.currentTime,35);
  await h.command(0,'deleteBookmark',marks[0].id);assert.equal((await h.state())[0].bookmarks.length,0);
});
test('DOM: HTTP bookmark identities use the secure extension worker when Web Crypto is absent',async t=>{
  const h=setup(t),r=await h.content({url:'http://course.example.com/lesson?id=42',noSubtle:true});
  assert.equal(r.window.crypto.subtle,undefined);
  const response=await h.command(0,'bookmark','HTTP lesson');assert.equal(response.ok,true);
  assert.equal((await h.state())[0].bookmarks[0].label,'HTTP lesson');
  const key=Object.keys(h.data).find(k=>k.startsWith(C.BOOKMARK_PREFIX));assert.match(key,/^skipflow\.bookmarks\.[a-f0-9]{64}$/);
});
test('DOM: new videos and open shadow DOM are discovered without wrapping the player',async t=>{
  const h=setup(t),r=await h.content(),w=r.window;
  const parent=w.document.createElement('div');w.document.body.append(parent);
  const video=w.document.createElement('video');parent.append(video);h.prepareVideo(r,video);await delay(30);
  assert.equal((await h.state()).length,2);
  const host=w.document.createElement('div'),shadow=host.attachShadow({mode:'open'}),sv=w.document.createElement('video');
  shadow.append(sv);w.document.body.append(host);h.prepareVideo(r,sv);await delay(30);
  assert.equal((await h.state()).length,3);assert.equal(r.video.parentElement.id,'player');
});
test('DOM: global and per-site switches stop loops and shortcuts in all related frames',async t=>{
  const h=setup(t),main=await h.content(),embed=await h.content({url:'https://player.example.net/embed/42',frameId:7,ancestor:'https://course.example.com'});
  assert.equal((await h.state(7))[0].site,'course.example.com');
  main.video.currentTime=10;await h.command(0,'setA');main.video.currentTime=15;await h.command(0,'setB');
  await h.storage.set({[C.SETTINGS_KEY]:{blockedSites:['course.example.com']}});await delay(40);
  assert.equal(main.host.style.display,'none');assert.equal(embed.host.style.display,'none');assert.equal((await h.state())[0].loop.enabled,false);
  const blocked=await h.command(7,'backSmall');assert.equal(blocked.ok,false);assert.equal(embed.video.currentTime,35);
  await h.storage.set({[C.SETTINGS_KEY]:{enabled:true}});await delay(40);assert.equal(main.host.style.display,'block');
  await h.storage.set({[C.SETTINGS_KEY]:{enabled:false}});await delay(40);assert.equal(main.host.style.display,'none');
});
test('DOM: settings change intervals live and remembered speed applies to new videos',async t=>{
  const h=setup(t,{[C.RATE_KEY]:1.75}),r=await h.content();assert.equal(r.video.playbackRate,1.75);
  await h.storage.set({[C.SETTINGS_KEY]:{smallSkip:7,largeSkip:22,rememberRate:false,defaultRate:1.25}});await delay(30);
  assert.equal(r.panel.querySelector('[data-action=backSmall]').textContent,'−7');await h.command(0,'backSmall');assert.equal(r.video.currentTime,28);
  r.video.dispatchEvent(new r.window.Event('loadedmetadata'));await delay(20);assert.equal(r.video.playbackRate,1.25);
  await h.command(0,'setRate',2.5);assert.equal(h.data[C.RATE_KEY],1.75);
});
test('DOM: popup discovers multiple frames, targets only the chosen video and validates timestamps',async t=>{
  const h=setup(t),main=await h.content(),embed=await h.content({url:'https://player.example.net/embed/42',frameId:7,ancestor:'https://course.example.com'}),p=await h.popup(),d=p.window.document;
  await until(()=>d.querySelector('#videos').options.length===2);
  const select=d.querySelector('#videos');select.value='7:v1';select.dispatchEvent(new p.window.Event('change'));
  d.querySelector('[data-command=forwardSmall]').click();await delay(20);assert.equal(embed.video.currentTime,45);assert.equal(main.video.currentTime,35);
  const input=d.querySelector('#jump-to');input.value='1:02';d.querySelector('#jump-form').dispatchEvent(new p.window.Event('submit',{bubbles:true,cancelable:true}));await delay(20);assert.equal(embed.video.currentTime,62);
  input.value='1:99';d.querySelector('#jump-form').dispatchEvent(new p.window.Event('submit',{bubbles:true,cancelable:true}));await delay(20);assert.equal(embed.video.currentTime,62);assert.match(d.querySelector('#status').textContent,/Scrivi/);
  d.querySelector('[data-rate="3"]').click();await delay(20);assert.equal(embed.video.playbackRate,3);
  assert.deepEqual(h.errors,[]);
});
test('DOM: popup bookmark labels are plain text and deletion updates persisted data',async t=>{
  const h=setup(t);await h.content();const p=await h.popup(),d=p.window.document;await until(()=>!d.querySelector('#study').hidden);
  d.querySelector('#bookmark-label').value='Lemma <img src=x onerror=alert(1)>';
  d.querySelector('#bookmark-form').dispatchEvent(new p.window.Event('submit',{bubbles:true,cancelable:true}));
  await until(()=>d.querySelectorAll('#bookmarks .bookmark').length===1);
  assert.equal(d.querySelectorAll('#bookmarks img').length,0);assert.match(d.querySelector('#bookmarks').textContent,/<img/);
  d.querySelector('#bookmarks .delete').click();await until(()=>d.querySelectorAll('#bookmarks .bookmark').length===0);
  assert.equal((await h.state())[0].bookmarks.length,0);assert.deepEqual(h.errors,[]);
});
test('DOM: popup global and per-site preferences control the live overlay',async t=>{
  const h=setup(t),r=await h.content(),p=await h.popup(),d=p.window.document;await until(()=>!d.querySelector('#study').hidden);
  const site=d.querySelector('#site-enabled');site.checked=false;site.dispatchEvent(new p.window.Event('change'));await delay(40);assert.equal(r.host.style.display,'none');
  site.checked=true;site.dispatchEvent(new p.window.Event('change'));await delay(40);assert.equal(r.host.style.display,'block');
  const global=d.querySelector('#enabled');global.checked=false;global.dispatchEvent(new p.window.Event('change'));await delay(40);assert.equal(r.host.style.display,'none');
  assert.deepEqual(h.errors,[]);
});
test('DOM: options save preferences, update controllers and preserve bookmarks on reset',async t=>{
  const h=setup(t),r=await h.content();await h.command(0,'bookmark','Punto');const o=await h.options(),d=o.window.document;
  d.querySelector('#smallSkip').value='6';d.querySelector('#largeSkip').value='18';d.querySelector('#rememberRate').checked=false;
  d.querySelector('#settings-form').dispatchEvent(new o.window.Event('submit',{bubbles:true,cancelable:true}));await delay(30);
  assert.equal(h.data[C.SETTINGS_KEY].smallSkip,6);assert.equal(h.data[C.SETTINGS_KEY].largeSkip,18);assert.equal(h.data[C.SETTINGS_KEY].rememberRate,false);
  assert.equal(r.panel.querySelector('[data-action=backSmall]').textContent,'−6');
  d.querySelector('#reset').click();await delay(30);assert.equal(h.data[C.SETTINGS_KEY].smallSkip,10);assert.equal((await h.state())[0].bookmarks.length,1);
  assert.deepEqual(h.errors,[]);
});
test('DOM: hide/show preserves the original video parent',async t=>{
  const h=setup(t),r=await h.content();await h.command(0,'togglePanel');await delay(30);assert.equal(r.host.style.display,'none');
  r.window.document.body.dispatchEvent(new r.window.KeyboardEvent('keydown',{key:'V',shiftKey:true,bubbles:true,cancelable:true}));await delay(30);assert.equal(r.host.style.display,'block');
  assert.equal(r.video.parentElement.id,'player');
});
test('DOM: bookmark storage is capped at 100 video entries',async t=>{
  const initial={};for(let i=0;i<100;i++)initial[C.BOOKMARK_PREFIX+i]={items:[],updatedAt:i};
  const h=setup(t,initial);await h.content();await h.command(0,'bookmark','Newest');
  const keys=Object.keys(h.data).filter(k=>k.startsWith(C.BOOKMARK_PREFIX));assert.equal(keys.length,100);assert.ok(!keys.includes(C.BOOKMARK_PREFIX+'0'));
});
