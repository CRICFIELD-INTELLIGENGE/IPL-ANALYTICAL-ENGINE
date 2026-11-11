const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const source=fs.readFileSync('src/components/cricfield-splash.tsx','utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
function harness({path='/',search='',hash='',reduced=false,stored=false,blocked=false}={}){
 const effects=[],timers=new Map(),listeners=new Map();const session=new Map(stored?[['cricfield-opening-delivery-v1','seen']]:[]);let state;let timerId=0;
 const media={matches:reduced,addEventListener:(k,fn)=>listeners.set('media:'+k,fn),removeEventListener:k=>listeners.delete('media:'+k)};
 const document={hidden:false,addEventListener:(k,fn)=>listeners.set('doc:'+k,fn),removeEventListener:k=>listeners.delete('doc:'+k)};
 const window={location:{pathname:path,search,hash},matchMedia:()=>media,setTimeout:(fn,ms)=>{assert.equal(ms,2300);timers.set(++timerId,fn);return timerId;},addEventListener:(k,fn)=>listeners.set(k,fn),removeEventListener:k=>listeners.delete(k)};
 const context={exports:{},URLSearchParams,window,document,sessionStorage:{getItem:k=>{if(blocked)throw Error('blocked');return session.get(k)},setItem:(k,v)=>{if(blocked)throw Error('blocked');session.set(k,v)}},clearTimeout:id=>timers.delete(id),require:id=>id==='react'?{useState:init=>{state=typeof init==='function'?init():init;return [state,v=>state=v]},useEffect:fn=>effects.push(fn)}:id==='wouter'?{useLocation:()=>[path]}:id==='react/jsx-runtime'?{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})}:id.includes('mascot-reactions')?{MASCOT_REACTIONS:{idle:'idle'}}:{}};
 vm.runInNewContext(js,context);
 const tree=context.exports.CricfieldSplash();const cleanups=effects.map(fn=>fn()).filter(Boolean);
 return {tree,media,document,session,timers,listeners,get state(){return state},cleanup:()=>cleanups.forEach(fn=>fn()),eligible:context.exports.eligibleForOpening};
}
let count=0;function test(name,fn){fn();count++;console.log('PASS '+name)}
test('first homepage visit mounts alongside application and records session',()=>{let h=harness();assert.ok(h.tree);assert.equal(h.state,true);assert.equal(h.session.get('cricfield-opening-delivery-v1'),'seen');assert.equal(h.timers.size,1);h.cleanup();assert.equal(h.timers.size,0);assert.equal(h.listeners.size,0)});
test('refresh in same session does not replay',()=>assert.equal(harness({stored:true}).tree,null));
test('deep links and games skip cinematic',()=>{for(const path of ['/stats','/scout','/dugout/sunrisers-hyderabad','/arcade/cup-chase','/account','/auth/callback'])assert.equal(harness({path}).tree,null)});
test('authentication callback query and recovery hash skip cinematic',()=>{for(const search of ['?code=x','?access_token=x','?error=x','?state=x'])assert.equal(harness({search}).tree,null);assert.equal(harness({hash:'#access_token=x'}).tree,null)});
test('reduced motion skips sequence and timers',()=>{const h=harness({reduced:true});assert.equal(h.tree,null);assert.equal(h.timers.size,0)});
test('Skip Intro dismisses immediately',()=>{const h=harness();h.tree.props.children[1].props.onClick();assert.equal(h.state,false)});
test('Escape dismisses without focus manipulation',()=>{const h=harness();h.listeners.get('keydown')({key:'Escape'});assert.equal(h.state,false)});
test('duration cap dismisses even without animation events',()=>{const h=harness();[...h.timers.values()][0]();assert.equal(h.state,false)});
test('returning to hidden tab does not replay',()=>{const h=harness();h.document.hidden=true;h.listeners.get('doc:visibilitychange')();assert.equal(h.state,false)});
test('runtime reduced-motion change dismisses sequence',()=>{const h=harness();h.media.matches=true;h.listeners.get('media:change')();assert.equal(h.state,false)});
test('blocked session storage still permits safe first visit',()=>assert.ok(harness({blocked:true}).tree));
console.log(`${count} lifecycle checks passed. Browser rendering is not covered by these checks.`);
