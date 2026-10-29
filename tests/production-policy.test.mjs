import {test}from'node:test';import assert from'node:assert/strict';import ts from'typescript';import{readFileSync}from'node:fs';
const out={};new Function('exports',ts.transpileModule(readFileSync(new URL('../lib/productionPolicy.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(out);
test('production files accept large audio and stem archives with finite bounds and explicit allowed formats',()=>{
 for(const size of[251*1024**2,2*1024**3,20*1024**3]){assert.equal(out.productionFileError('master.wav','audio/wav',size,'master'),null);assert.equal(out.productionFileError('stems.zip','application/zip',size,'stems'),null);}
 for(const size of[0,-1,Infinity,NaN,20*1024**3+1,1.5])assert.ok(out.productionFileError('mix.wav','audio/wav',size,'mix'));
 assert.ok(out.productionFileError('script.html','audio/wav',1024,'mix'));assert.ok(out.productionFileError('mix.wav','text/html',1024,'mix'));
 assert.equal(out.productionFileError('brief.pdf','application/pdf',1024,'document'),null);assert.equal(out.productionFileError('treatment.mp4','video/mp4',1024,'visual'),null);
 assert.equal(out.partCount(20*1024**3),1280);assert.equal(out.partCount(272*1024**2),17);
});
