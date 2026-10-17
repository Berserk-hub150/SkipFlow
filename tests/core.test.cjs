const {test} = require('node:test');
const assert = require('node:assert/strict');
const C = require('../shared/core.js');

test('navigation clamps at the ends and snaps to valid seekable ranges',()=>{
  assert.equal(C.seekTarget(-10,120),0);
  assert.equal(C.seekTarget(200,120),120);
  assert.equal(C.seekTarget(35,Infinity,[[20,50]]),35);
  assert.equal(C.seekTarget(0,Infinity,[[20,50]]),20);
  assert.equal(C.seekTarget(75,Infinity,[[20,50],[90,120]]),90);
  assert.equal(C.seekTarget(0,Infinity,[]),null);
  assert.equal(C.seekTarget(NaN,120),null);
});
test('time parsing accepts timestamps and rejects ambiguous or malformed input',()=>{
  for(const [text,seconds] of [['90',90],['1:30',90],['1:02:03',3723],[' 00:09 ',9],['0:00',0],['1.5',1.5]])assert.equal(C.parseTime(text),seconds);
  for(const text of ['1:99','-5','1::2','hello','', '1:2:3:4','Infinity'])assert.equal(C.parseTime(text),null);
  assert.equal(C.formatTime(3661),'1:01:01');
  assert.equal(C.formatTime(null),'—');
  assert.equal(C.formatTime(Infinity),'—');
});
test('settings bound unsafe values and preserve actual boolean choices',()=>{
  const s=C.normalizeSettings({smallSkip:-10,largeSkip:99999,speedStep:Infinity,defaultRate:90,
    enabled:'false',shortcuts:false,position:'invalid',blockedSites:['EXAMPLE.COM','example.com','',null]});
  assert.equal(s.smallSkip,1);assert.equal(s.largeSkip,600);assert.equal(s.speedStep,.25);
  assert.equal(s.defaultRate,4);assert.equal(s.enabled,true);assert.equal(s.shortcuts,false);
  assert.equal(s.position,'top-left');assert.deepEqual(s.blockedSites,['example.com']);
});
test('shortcuts require Shift alone and leave modified or composing input alone',()=>{
  assert.equal(C.shortcutAction({key:'ArrowLeft',shiftKey:true}),'backSmall');
  assert.equal(C.shortcutAction({key:'M',shiftKey:true}),'bookmark');
  for(const extra of [{shiftKey:false},{ctrlKey:true},{altKey:true},{metaKey:true},{isComposing:true},{defaultPrevented:true}]) {
    assert.equal(C.shortcutAction({key:'m',shiftKey:true,...extra}),null);
  }
  assert.equal(C.editablePath([{nodeType:1,tagName:'INPUT'}]),true);
  assert.equal(C.editablePath([{nodeType:1,tagName:'DIV',isContentEditable:true}]),true);
  assert.equal(C.editablePath([{nodeType:1,tagName:'VIDEO'}]),false);
});
test('bookmark identities keep lesson IDs but strip playback and tracking parameters',()=>{
  assert.equal(C.cleanPageUrl('https://example.com/watch?v=abc&t=20&utm_source=x#player'),'https://example.com/watch?v=abc');
  assert.equal(C.cleanPageUrl('https://example.com/lesson?id=42&start=5'),'https://example.com/lesson?id=42');
  const list=C.sanitizeBookmarks([{id:'a',time:12,label:'A'}, {id:'b',time:-1}, {id:'c',time:Infinity},null]);
  assert.deepEqual(list,[{id:'a',time:12,label:'A'}]);
});
