import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
import {mockSupabase} from '../helpers/mock-supabase.mjs';
const {server,state}=mockSupabase();state.creator=true;state.hasProject=true;state.externalArtist=true;
await new Promise(resolve=>server.listen(54329,'127.0.0.1',resolve));
const origin='http://localhost:3100',screenshots='/tmp/kreyoh-interaction-cards';await mkdir(screenshots,{recursive:true});
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--webpack','--hostname','127.0.0.1','--port','3100'],{cwd:process.cwd(),env:{...process.env,NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:54329',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'local-test-publishable-key',SUPABASE_SERVICE_ROLE_KEY:'local-test-service-key',NEXT_PUBLIC_SITE_URL:origin,LOCAL_DEMO_DATA:'true',NEXT_TELEMETRY_DISABLED:'1'},stdio:['ignore','pipe','pipe']});
let logs='';child.stdout.on('data',data=>{logs+=data});child.stderr.on('data',data=>{logs+=data});let browser,page;const errors=[];
try{
 for(let i=0;i<90;i++){try{if((await fetch(origin+'/offline.html')).ok)break;}catch{}await new Promise(resolve=>setTimeout(resolve,500));if(i===89)throw Error('Dev server unavailable');}
 browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage']});
 page=await browser.newPage({viewport:{width:390,height:844}});page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error'){console.error('BROWSER CONSOLE',message.text());if(/same key|Hydration|hydration|cannot be a descendant/.test(message.text()))errors.push(message.text());}});page.setDefaultTimeout(12000);page.setDefaultNavigationTimeout(45000);
 await page.goto(origin+'/');
 for(const width of [320,390,768,1024,1440]){
  await page.setViewportSize({width,height:900});
  const desktop=await page.getByRole('navigation',{name:'Public navigation',exact:true}).isVisible();
  if(desktop){
   const brand=await page.getByRole('link',{name:'FACKTS Music home',exact:true}).boundingBox();
   const about=await page.getByRole('navigation',{name:'Public navigation',exact:true}).getByRole('link',{name:'About',exact:true}).boundingBox();
   assert.ok(about.x>=brand.x+brand.width-1,`Public brand overlaps About at ${width}px`);
  }else{
   await page.getByRole('button',{name:'Toggle navigation',exact:true}).click();
   const menu=page.getByRole('navigation',{name:'Mobile navigation',exact:true});
   for(const name of ['About','How It Works','Creators','Explore Music','Partners','Contact','Sign In','Join FACKTS'])assert.ok(await menu.getByRole('link',{name,exact:false}).isVisible());
   await page.getByRole('button',{name:'Toggle navigation',exact:true}).click();
  }
  const size=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth}));assert.ok(size.scroll<=size.width+1);
 }
 await page.screenshot({path:screenshots+'/PublicHomepageHeader.png',fullPage:false});
 console.log('PASS Public homepage navigation and brand stay accessible across phone, tablet and desktop widths');
 await page.goto(origin+'/auth/callback?token_hash=fixture&type=signup&next=/fan?tab=Billboard');await page.waitForLoadState('networkidle');
 const header=await page.locator('[data-fm-header]').elementHandle();let requests=0;page.on('request',request=>{if(request.headers()['next-action'])requests++});
 let delayed;await page.route('**/api/interactions/releaseVote',route=>{delayed=route});
 await page.getByRole('button',{name:'Vote this week',exact:true}).click();
 await page.getByRole('button',{name:'Voted ✓ · Undo',exact:true}).waitFor();
 assert.equal(await page.getByRole('button',{name:'Save Test song 1',exact:true}).isEnabled(),true);
 await page.getByLabel('Search music',{exact:true}).fill('Test');await page.getByLabel('Search music',{exact:true}).fill('');
 await delayed.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,value:{ok:false,error:'Fixture vote failure.'}})});
 await page.getByRole('button',{name:'Vote this week',exact:true}).waitFor();assert.equal(await header.evaluate(node=>node.isConnected),true);await page.unroute('**/api/interactions/releaseVote');
 console.log('PASS Vote is optimistic, isolated, and rolls back without page actions');
 const first=page.getByRole('article').filter({has:page.getByRole('heading',{name:'Test song 1',exact:true})}).first();
 await first.getByRole('button',{name:/Comment/}).click();await first.getByLabel('Join the conversation').fill('Keep this failed comment draft');
 await page.route('**/api/interactions/commentPost',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,value:{ok:false,error:'Fixture comment failure.'}})}));
 await first.locator('form').evaluate(form=>form.scrollIntoView({block:'center',behavior:'instant'}));
 await first.getByRole('button',{name:'Post comment',exact:true}).click();await first.getByRole('alert').waitFor();assert.equal(await first.getByLabel('Join the conversation').inputValue(),'Keep this failed comment draft');assert.equal(await page.getByRole('button',{name:'Save Test song 2',exact:true}).isEnabled(),true);assert.equal(await header.evaluate(node=>node.isConnected),true);assert.equal(requests,0);
 console.log('PASS Failed comments preserve their draft and do not refresh or block other song controls');
 await first.getByRole('button',{name:/Comment/}).first().click();await page.getByRole('button',{name:'For You',exact:true}).first().click();await first.evaluate(element=>window.scrollTo(0,window.scrollY+element.getBoundingClientRect().top-100));await page.screenshot({path:screenshots+'/CompactCardsMobile.png',scale:'css'});
 await page.setViewportSize({width:1440,height:1000});await first.evaluate(element=>window.scrollTo(0,window.scrollY+element.getBoundingClientRect().top-110));await page.screenshot({path:screenshots+'/CompactCardsDesktop.png',scale:'css'});
 for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
 assert.deepEqual(errors,[]);console.log('PASS Compact social cards fit 320/390/768/1440px without page errors');
} catch(error){console.error(error);if(page){await page.screenshot({path:screenshots+'/Failure.png',fullPage:true}).catch(()=>{});}console.error(logs.slice(-5000));process.exitCode=1;}
finally{await browser?.close();child.kill('SIGTERM');server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
