import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const toModule = source => 'data:text/javascript;base64,'+Buffer.from(ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText).toString('base64');
const guideModule=toModule(readFileSync(new URL('../lib/musicHelp.ts',import.meta.url),'utf8'));
const {guideAnswer}=await import(guideModule);
const aiSource=readFileSync(new URL('../lib/musicHelpAI.ts',import.meta.url),'utf8').replace('"./musicHelp"',JSON.stringify(guideModule));
const {generateNavigationAnswer}=await import(toModule(aiSource));
test('guide points split questions to personal pending approvals',()=>{
  const answer=guideAnswer('How do I confirm my split percentage?');
  assert.equal(answer.links[0].href,'/splits?view=mine');assert.match(answer.answer,/complete proposal/);
});
test('AI request sends only navigation guidance and question; reads all output blocks',async()=>{
  const answer=await generateNavigationAnswer('Where is music?',['Artist'],'test-key','configured-model',async(url,options)=>{
    assert.equal(url,'https://api.openai.com/v1/responses');
    const body=JSON.parse(options.body);assert.equal(body.store,false);assert.equal(body.model,'configured-model');assert.equal(body.max_output_tokens,700);assert.equal(body.input,'Where is music?');assert.equal(body.tools,undefined);
    return new Response(JSON.stringify({status:'completed',output:[{type:'reasoning'},{type:'message',content:[{type:'output_text',text:'Open your project.'},{type:'output_text',text:'Choose Music.'}]}]}));
  });
  assert.equal(answer,'Open your project.\nChoose Music.');
});
test('provider failures and incomplete output fail closed for guide fallback',async()=>{
  await assert.rejects(generateNavigationAnswer('Help',[],'key','model',async()=>new Response('{}',{status:429})),/unavailable/);
  await assert.rejects(generateNavigationAnswer('Help',[],'key','model',async()=>new Response(JSON.stringify({status:'incomplete',output:[]}))),/incomplete/);
});
