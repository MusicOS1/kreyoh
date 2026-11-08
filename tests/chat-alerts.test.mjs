import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {runInNewContext} from 'node:vm';
const require=createRequire(import.meta.url);
const ts=require('typescript');

function loadAlerts(){
 const source=readFileSync(new URL('../lib/chatAlerts.ts',import.meta.url),'utf8');
 const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const store=new Map();
 const localStorage={getItem:key=>store.get(key)??null,setItem:(key,value)=>store.set(key,String(value))};
 const module={exports:{}};
 runInNewContext(output,{module,exports:module.exports,window:{localStorage},setTimeout},'chatAlerts.js');
 return{api:module.exports,store};
}
test('Alert settings are isolated by FACKTS account',()=>{
 const{api}=loadAlerts();
 assert.equal(api.readChatAlerts('a').enabled,true);
 api.writeChatAlerts('a',{enabled:false,sound:'off',vibrate:true,showSystem:false});
 assert.equal(api.readChatAlerts('a').enabled,false);
 assert.equal(api.readChatAlerts('b').enabled,true);
});
test('A chat can be muted without muting every conversation',()=>{
 const{api}=loadAlerts();
 api.writeChatMute('user','artist1',true);
 assert.equal(api.readChatMute('user','artist1'),true);
 assert.equal(api.readChatMute('user','artist2'),false);
 assert.equal(api.readChatMute('other','artist1'),false);
 api.writeChatMute('user','artist1',false);
 assert.equal(api.readChatMute('user','artist1'),false);
});
test('Invalid alert settings fall back to safe defaults',()=>{
 const{api,store}=loadAlerts();
 store.set('fm:alerts:user',JSON.stringify({sound:'untrusted',enabled:false,vibrate:'yes',showSystem:1}));
 assert.equal(api.readChatAlerts('user').sound,'soft');
 assert.equal(api.readChatAlerts('user').vibrate,false);
 assert.equal(api.readChatAlerts('user').showSystem,false);
 assert.equal(api.readChatAlerts('user').enabled,false);
});
