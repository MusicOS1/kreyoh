import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
import {mockSupabase} from '../helpers/mock-supabase.mjs';
const {server,state}=mockSupabase();state.creator=true;state.hasProject=true;
await new Promise(r=>server.listen(54329,'127.0.0.1',r));
const origin='http://localhost:3100',mode='header',dir='/tmp/shared-public-header';await mkdir(dir,{recursive:true});
const child=spawn(process.execPath,['node_modules/next/dist/bin/next',process.env.AUDIT_PRODUCTION?'start':'dev',...process.env.AUDIT_PRODUCTION?[]:['--webpack'],'--hostname','127.0.0.1','--port','3100'],{env:{...process.env,NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:54329',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'local-test-publishable-key',SUPABASE_SERVICE_ROLE_KEY:'local-test-service-key',NEXT_PUBLIC_SITE_URL:origin,LOCAL_DEMO_DATA:'true',NEXT_TELEMETRY_DISABLED:'1'},stdio:['ignore','pipe','pipe']});
let startupError;child.on('exit',code=>{if(code)startupError=Error('Next exited '+code)});let logs='';child.stdout.on('data',d=>{logs+=d;process.stderr.write(d)});child.stderr.on('data',d=>{logs+=d;process.stderr.write(d)});let browser;
try {
 for(let i=0;i<120;i++){if(startupError)throw startupError;try{if((await fetch(origin+'/offline.html',{signal:AbortSignal.timeout(1000)})).ok)break;}catch{}await new Promise(r=>setTimeout(r,500));}
 browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||undefined,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});page.setDefaultNavigationTimeout(45000);
 const widths=[375,390,768,1024,1201,1280,1366,1440,1756,1920];
 const inspect=async(route,width)=>{
  await page.setViewportSize({width,height:1000});await page.evaluate(()=>document.fonts.ready);
  assert.equal(await page.locator('[data-public-navigation]').count(),1,route+' must use the shared public header');
  const issues=await page.locator('[data-public-navigation]').evaluate(header=>{
   const issues=[],nodes=[...header.querySelectorAll(':scope > div a,:scope > div button')].filter(e=>e.getBoundingClientRect().width>0),row=header.firstElementChild.getBoundingClientRect();
   for(let i=0;i<nodes.length;i++){
    const a=nodes[i].getBoundingClientRect();if(a.left<0||a.right>innerWidth+1)issues.push('Header outside viewport');if(a.top<row.top-1||a.bottom>row.bottom+1)issues.push('Header control outside its row');
    const range=document.createRange();range.selectNodeContents(nodes[i]);if(range.getClientRects().length>0){for(const rect of range.getClientRects())if(rect.left<a.left-1||rect.right>a.right+1)issues.push('Clipped header label');}
    for(let j=i+1;j<nodes.length;j++){const b=nodes[j].getBoundingClientRect();if(Math.min(a.right,b.right)-Math.max(a.left,b.left)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1)issues.push('Overlapping header controls');}
   }
   return issues;
  });assert.deepEqual(issues,[],route+' at '+width);
  const desktop=await page.getByRole('navigation',{name:'Public navigation',exact:true}).isVisible();
  const trigger=page.getByRole('button',{name:desktop?'Explore music menu':'Toggle navigation',exact:true});await trigger.click();
  const panel=page.getByRole('navigation',{name:desktop?'Explore music':'Mobile navigation',exact:true});await panel.waitFor();
  await page.keyboard.press('Escape');assert.equal(await trigger.getAttribute('aria-expanded'),'false');assert.ok(await trigger.evaluate(e=>e===document.activeElement));
 };
 for(const route of ['/','/about','/contact','/partner','/creators','/billboard']){
  const response=await page.goto(origin+route);assert.equal(response.status(),200);assert.equal(new URL(page.url()).pathname,route);
  for(const width of widths)await inspect(route,width);
  console.log('PASS anonymous shared public header '+route+' at ten widths');
 }
 await page.goto(origin+'/auth/callback?token_hash=fixture&type=signup&next=/');await page.waitForURL(origin+'/');
 for(const route of ['/','/about','/contact','/partner','/billboard','/privacy','/terms','/copyright']){
  const response=await page.goto(origin+route);assert.equal(response.status(),200);assert.equal(new URL(page.url()).pathname,route);
  for(const width of widths)await inspect(route,width);
  if(route==='/privacy'){
   for(const width of [390,1440,1756]){await page.setViewportSize({width,height:1000});await page.screenshot({path:dir+'/Privacy'+width+'.png',caret:'initial'});}
  }
  console.log('PASS signed-in shared public header '+route+' at ten widths');
 }
 console.log('PASS shared public header: 140 route/viewport combinations, anonymous and signed-in');
}catch(error){console.error(error,logs.slice(-4000));process.exitCode=1;}finally{await browser?.close();child.kill('SIGTERM');server.closeAllConnections();server.close();}
