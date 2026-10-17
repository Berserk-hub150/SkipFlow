// DOM integration harness. Media decoding and browser APIs are simulated.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const copy=value=>value===undefined?undefined:structuredClone(value);
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(check,timeout=3000){const end=Date.now()+timeout;while(Date.now()<end){if(await check())return;await delay(10);}throw new Error('Timed out waiting for test condition');}
function createHarness(initial={}){
  const data=copy(initial),realms=[],messages=[],errors=[];
  function storage(actor){return {
    async get(keys){
      const result={};if(keys===null)return copy(data);
      for(const key of typeof keys==='string'?[keys]:Array.isArray(keys)?keys:Object.keys(keys||{}))result[key]=copy(data[key]);
      return result;
    },
    async set(patch){const changes={};for(const [key,value]of Object.entries(patch)){changes[key]={oldValue:copy(data[key]),newValue:copy(value)};data[key]=copy(value);}queueMicrotask(()=>{for(const r of realms)if(r.alive)for(const listener of r.changed)listener(copy(changes),'local');});},
    async remove(keys){const changes={};for(const key of Array.isArray(keys)?keys:[keys]){changes[key]={oldValue:copy(data[key])};delete data[key];}queueMicrotask(()=>{for(const r of realms)if(r.alive)for(const listener of r.changed)listener(copy(changes),'local');});}
  };}
  async function sendToContent(message,frameId){
    const targets=realms.filter(r=>r.alive&&r.kind==='content'&&(frameId===undefined||r.frameId===frameId));
    if(!targets.length)throw new Error('Receiving end does not exist');
    return new Promise((resolve,reject)=>{
      let responded=false,asyncReply=false;
      const reply=value=>{if(!responded){responded=true;resolve(copy(value));}};
      for(const actor of targets)for(const listener of actor.listeners){
        const result=listener(copy(message),{id:'skipflow-test-extension'},reply);
        if(result===true)asyncReply=true;
      }
      if(!responded&&!asyncReply)resolve(undefined);
      if(!responded&&asyncReply){const timer=setTimeout(()=>{if(!responded)reject(new Error('No response from content script'));},1500);timer.unref();}
    });
  }
  function makeRealm(kind,html,url,frameId=0){
    const dom=new JSDOM(html,{url,runScripts:'outside-only',pretendToBeVisual:true});
    const actor={kind,frameId,dom,window:dom.window,listeners:[],changed:[],alive:true};realms.push(actor);
    const w=dom.window;
    w.addEventListener('error',event=>errors.push(event.error?.stack||event.message));
    Object.defineProperty(w.crypto,'subtle',{configurable:true,value:crypto.webcrypto.subtle});
    Object.defineProperty(w.crypto,'randomUUID',{value:crypto.randomUUID});
    w.TextEncoder=TextEncoder;
    w.ResizeObserver=class{observe(){}unobserve(){}disconnect(){}};
    w.chrome={storage:{local:storage(actor),onChanged:{addListener:fn=>actor.changed.push(fn)}},
      runtime:{id:'skipflow-test-extension',onMessage:{addListener:fn=>actor.listeners.push(fn)},
        async sendMessage(message){
          const sender={id:'skipflow-test-extension',...(kind==='content'?{tab:{id:1},frameId}: {})};
          messages.push({actor,message:copy(message)});
          return new Promise(resolve=>{
            let replied=false,asyncReply=false;
            const reply=value=>{if(!replied){replied=true;resolve(copy(value));}};
            for(const realm of realms)if(realm.alive&&realm!==actor&&realm.kind!=='content')for(const listener of realm.listeners){if(listener(copy(message),sender,reply)===true)asyncReply=true;}
            if(!replied&&!asyncReply)resolve(undefined);
          });
        },openOptionsPage:async()=>{actor.optionsOpened=true;}},
      tabs:{query:async()=>[{id:1,url:'https://course.example.com/lesson?id=42',active:true}],
        sendMessage:async(tab,message,options)=>{if(tab!==1)throw new Error('Wrong tab');return sendToContent(message,options?.frameId);}}
    };
    actor.run=(...files)=>{for(const file of files)w.eval(read(file));};
    actor.close=()=>{actor.alive=false;dom.window.close();};
    return actor;
  }
  function prepareVideo(actor,video,config={}){
    const w=actor.window;
    let time=config.time??35,rate=config.rate??1,paused=true;
    const duration=config.duration??120;
    const ranges=config.ranges??(Number.isFinite(duration)?[[0,duration]]:[]);
    const events=[];
    Object.defineProperties(video,{
      currentTime:{configurable:true,get:()=>time,set:value=>{time=value;events.push(['seek',value]);}},
      duration:{configurable:true,get:()=>duration},
      readyState:{configurable:true,get:()=>config.readyState??3},
      paused:{configurable:true,get:()=>paused},
      playbackRate:{configurable:true,get:()=>rate,set:value=>{rate=value;queueMicrotask(()=>{if(actor.alive)video.dispatchEvent(new w.Event('ratechange'));});}},
      currentSrc:{configurable:true,get:()=>new URL(video.getAttribute('src')||'sample.mp4',w.location.href).href},
      seekable:{configurable:true,get:()=>({length:ranges.length,start:i=>ranges[i][0],end:i=>ranges[i][1]})},
      clientWidth:{configurable:true,get:()=>900},clientHeight:{configurable:true,get:()=>506}
    });
    video.style.cssText='opacity:1;display:block;visibility:visible';
    video.getBoundingClientRect=()=>({x:25,y:50,left:25,top:50,right:925,bottom:556,width:900,height:506});
    video.play=async()=>{paused=false;video.dispatchEvent(new w.Event('play'));};
    video.pause=()=>{paused=true;video.dispatchEvent(new w.Event('pause'));};
    video.requestPictureInPicture=async()=>{Object.defineProperty(w.document,'pictureInPictureElement',{configurable:true,value:video});video.dispatchEvent(new w.Event('enterpictureinpicture'));};
    const container=video.parentElement || video.getRootNode().host || video;
    container.requestFullscreen=async()=>{Object.defineProperty(w.document,'fullscreenElement',{configurable:true,value:container});w.document.dispatchEvent(new w.Event('fullscreenchange'));};
    Object.defineProperty(w.document,'pictureInPictureEnabled',{configurable:true,value:true});
    w.document.exitPictureInPicture=async()=>{Object.defineProperty(w.document,'pictureInPictureElement',{configurable:true,value:null});video.dispatchEvent(new w.Event('leavepictureinpicture'));};
    w.document.exitFullscreen=async()=>{Object.defineProperty(w.document,'fullscreenElement',{configurable:true,value:null});w.document.dispatchEvent(new w.Event('fullscreenchange'));};
    video.tick=()=>video.dispatchEvent(new w.Event('timeupdate'));
    video.calls=events;
    return video;
  }
  async function content(config={}){
    const actor=makeRealm('content','<!doctype html><title>Test lesson</title><div id="player"><video id="main" src="https://media.example.com/lesson.mp4" aria-label="Main lesson"></video></div><input id="typing"><textarea></textarea><div contenteditable="true" id="editable"></div><div id="shadow-host"></div>',config.url||'https://course.example.com/lesson?id=42',config.frameId||0);
    if(config.ancestor)Object.defineProperty(actor.window.location,'ancestorOrigins',{value:[config.ancestor]});
    if(config.noSubtle)Object.defineProperty(actor.window.crypto,'subtle',{value:undefined});
    actor.video=prepareVideo(actor,actor.window.document.querySelector('video'),config);
    actor.run('shared/core.js','shared/overlay-style.js','content.js');
    await until(()=>actor.window.document.querySelector('[data-skipflow]'));
    actor.host=actor.window.document.querySelector('[data-skipflow]');actor.panel=actor.host.shadowRoot;
    await until(()=>!actor.panel.querySelector('[data-action=bookmark]').disabled);
    return actor;
  }
  async function popup(){const actor=makeRealm('popup',read('ui/popup.html'),'chrome-extension://skipflow-test-extension/ui/popup.html');actor.run('shared/core.js','ui/client.js','ui/popup.js');await delay(40);return actor;}
  async function options(){const actor=makeRealm('options',read('ui/options.html'),'chrome-extension://skipflow-test-extension/ui/options.html');actor.run('shared/core.js','ui/client.js','ui/options.js');await delay(20);return actor;}
  async function command(frameId,action,value,id='v1'){return sendToContent({type:'SKIPFLOW_COMMAND',action,value,id},frameId);}
  async function state(frameId=0){await sendToContent({type:'SKIPFLOW_DISCOVER',nonce:'test'},frameId);return messages.filter(x=>x.actor.frameId===frameId&&x.message.type==='SKIPFLOW_STATE').at(-1).message.records;}
  const background=makeRealm('background','<!doctype html>','chrome-extension://skipflow-test-extension/worker.html');
  background.run('worker.js');
  return {data,errors,realms,content,popup,options,prepareVideo,command,state,storage:storage(null),close:()=>realms.forEach(r=>r.close())};
}
module.exports={createHarness,delay,until};
