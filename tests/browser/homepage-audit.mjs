import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {mockSupabase} from '../helpers/mock-supabase.mjs';
const golden=JSON.parse(await readFile(new URL('../fixtures/approved-homepage-layout.json',import.meta.url),'utf8'));
const {server,state}=mockSupabase();state.creator=true;state.hasProject=true;
await new Promise(r=>server.listen(54329,'127.0.0.1',r));
const origin='http://localhost:3100',mode=process.env.AUDIT_MODE||'verified',dir=`/tmp/homepage-recovery/${mode}`;await mkdir(dir,{recursive:true});
const child=spawn(process.execPath,['node_modules/next/dist/bin/next',process.env.AUDIT_PRODUCTION?'start':'dev',...process.env.AUDIT_PRODUCTION?[]:['--webpack'],'--hostname','127.0.0.1','--port','3100'],{env:{...process.env,NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:54329',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'local-test-publishable-key',SUPABASE_SERVICE_ROLE_KEY:'local-test-service-key',NEXT_PUBLIC_SITE_URL:origin,LOCAL_DEMO_DATA:'true',NEXT_TELEMETRY_DISABLED:'1'},stdio:['ignore','pipe','pipe']});
let startupError;child.on('exit',code=>{if(code)startupError=Error('Next exited '+code)});let logs='';child.stdout.on('data',d=>{logs+=d;process.stderr.write(d)});child.stderr.on('data',d=>{logs+=d;process.stderr.write(d)});let browser;const results=[];
try{
 for(let i=0;i<120;i++){if(startupError)throw startupError;try{if((await fetch(origin+'/offline.html',{signal:AbortSignal.timeout(1000)})).ok)break;}catch{}await new Promise(r=>setTimeout(r,500));}
 browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||undefined,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});page.setDefaultTimeout(10000);page.setDefaultNavigationTimeout(45000);
 for(const width of [375,390,768,1024,1366,1440,1920]){
 await page.setViewportSize({width,height:1000});await page.goto(origin+'/');await page.locator('h1').waitFor();await page.evaluate(()=>document.fonts.ready);
 const dimensions=await page.evaluate(()=>{const box=s=>{const e=document.querySelector(s);if(!e)return null;const b=e.getBoundingClientRect(),c=getComputedStyle(e);return {x:b.x,y:b.y,width:b.width,height:b.height,display:c.display,font:c.fontSize,position:c.position,grid:c.gridTemplateColumns}};return{viewport:innerWidth,scroll:document.documentElement.scrollWidth,brand:box('a[aria-label="FACKTS Music home"]'),nav:box('nav[aria-label="Public navigation"]'),hero:box('#top'),title:box('h1'),world:box('[aria-label="FACKTS Music visual world"]'),links:[...document.querySelectorAll('nav[aria-label="Public navigation"] a')].map(e=>({text:e.textContent,...e.getBoundingClientRect().toJSON(),display:getComputedStyle(e).display}))}});
 results.push(dimensions);await page.waitForFunction(()=>[...document.querySelectorAll('#top img[loading="eager"]')].every(img=>img.complete&&img.naturalWidth>0));await page.screenshot({path:`${dir}/${width}-hero.png`,caret:'initial'});
 if(mode!=='before') {
  assert.ok(dimensions.scroll<=width+1,`Page overflow at ${width}`);
  const expected=golden.viewports[String(width)];if(expected){
   const actual={font:dimensions.title.font,titleWidth:dimensions.title.width,titleHeight:dimensions.title.height,offsetX:dimensions.title.x-dimensions.hero.x,offsetY:dimensions.title.y-dimensions.hero.y,heroHeight:dimensions.hero.height,brandWidth:dimensions.brand.width};
   for(const key of Object.keys(expected)){if(key==='font')assert.equal(actual[key],expected[key]);else assert.ok(Math.abs(actual[key]-expected[key])<=1.5,`Approved reference ${width}px ${key}: ${actual[key]} vs ${expected[key]}`);}
  }
  const issues=await page.evaluate(()=>{
   const issues=[],title=document.querySelector('h1'),bounds=title.getBoundingClientRect();
   for(const line of title.childNodes){if(line.nodeName==='BR')continue;const range=document.createRange();range.selectNodeContents(line);const rect=range.getBoundingClientRect();if(rect.left<bounds.left-1||rect.right>bounds.right+1)issues.push('Headline line exceeds its column');}
   const elements=[...document.querySelectorAll('[data-home-navigation] > div a,[data-home-navigation] > div button')].filter(e=>e.getBoundingClientRect().width>0);
   for(let i=0;i<elements.length;i++){const a=elements[i].getBoundingClientRect();if(a.left<0||a.right>innerWidth)issues.push('Header control outside viewport');for(let j=i+1;j<elements.length;j++){const b=elements[j].getBoundingClientRect();if(Math.min(a.right,b.right)-Math.max(a.left,b.left)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1)issues.push('Overlapping header controls');}}
   for(const img of document.querySelectorAll('#top img[loading="eager"]'))if(!img.complete||!img.naturalWidth)issues.push('Missing hero photography');
   return issues;
  });assert.deepEqual(issues,[],`${width}px layout`);
  const desktop=await page.getByRole('navigation',{name:'Public navigation',exact:true}).isVisible();
  const trigger=page.getByRole('button',{name:desktop?'Explore music menu':'Toggle navigation',exact:true});await trigger.click();
  const menu=page.getByRole('navigation',{name:desktop?'Explore music':'Mobile navigation',exact:true});
  const labels=desktop?['Discover music','Meet the artists','The Billboard','Your music library','Your creative workspace','Stay connected']:['About','How It Works','Creators','Explore Music','Partners','Contact','Sign In','Join FACKTS'];
  for(const label of labels)assert.ok(await menu.getByRole('link',{name:label,exact:!desktop}).isVisible());
  if([390,1440].includes(width))await page.screenshot({path:`${dir}/menu-${width}.png`,caret:'initial'});
  await page.keyboard.press('Escape');assert.equal(await trigger.getAttribute('aria-expanded'),'false');assert.ok(await trigger.evaluate(e=>e===document.activeElement));
  await page.keyboard.press('Enter');if(desktop)await page.keyboard.press('ArrowDown');else await page.keyboard.press('Tab');assert.ok(await menu.locator('a:visible').first().evaluate(e=>e===document.activeElement));await page.keyboard.press('Escape');
  await trigger.click();await page.mouse.click(5,150);assert.equal(await trigger.getAttribute('aria-expanded'),'false');
  const covers=page.locator('[data-artwork="curated"] img');assert.equal(await covers.count(),40);assert.equal(await covers.evaluateAll(images=>new Set(images.map(i=>i.getAttribute('src'))).size),12);
  assert.equal(await page.locator('h1 em').evaluate(e=>getComputedStyle(e).color),'rgb(221, 188, 139)');
  for(const href of ['/privacy','/terms','/copyright'])assert.ok(await page.locator(`footer a[href="${href}"]`).count()>0);
  console.log(`PASS homepage ${width}px: geometry, headline, photography, menu, keyboard, footer`);
 }
 await page.screenshot({path:`${dir}/${width}-hero.png`,fullPage:false,caret:'initial'});await page.screenshot({path:`${dir}/${width}.png`,fullPage:true,caret:'initial'});
 }
 if(mode!=='before') {
 await page.setViewportSize({width:1440,height:1000});await page.emulateMedia({reducedMotion:'no-preference'});await page.goto(origin+'/');
 const wall=page.locator('[data-artwork="curated"]');await page.waitForFunction(()=>document.querySelector('[data-artwork="curated"]')?.dataset.running==='true');
 const track=wall.locator('div').nth(1);const first=await track.evaluate(e=>getComputedStyle(e).transform);await new Promise(resolve=>setTimeout(resolve,150));assert.notEqual(await track.evaluate(e=>getComputedStyle(e).transform),first);
 await page.getByRole('button',{name:'Pause background artwork',exact:true}).click();await page.waitForFunction(()=>document.querySelector('[data-artwork="curated"]')?.dataset.running==='false');
 await page.getByRole('button',{name:'Play background artwork',exact:true}).click();await page.waitForFunction(()=>document.querySelector('[data-artwork="curated"]')?.dataset.running==='true');
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>document.querySelector('[data-artwork="curated"]')?.dataset.running==='false');assert.ok(await page.getByRole('button',{name:'Background motion disabled by your device preference',exact:true}).isDisabled());
 for(const src of await wall.locator('img').evaluateAll(images=>[...new Set(images.map(i=>i.getAttribute('src')))])){const response=await page.request.get(origin+src);assert.equal(response.status(),200);assert.match(response.headers()['content-type'],/image\/webp/);}
 console.log('PASS supplied artwork loads; motion runs, pauses, resumes and respects reduced motion');
 }
 for(const route of ['/listen','/creators','/about','/admin/users','/privacy','/terms','/copyright']){await page.setViewportSize({width:1440,height:1000});const response=await page.goto(origin+route);assert.equal(response.status(),200);if(['/listen','/creators','/about'].includes(route))assert.equal(new URL(page.url()).pathname,route);assert.equal(await page.getByRole('heading',{name:'We couldn’t load this page.',exact:true}).count(),0);await page.screenshot({path:`${dir}/route-${route.slice(1).replaceAll('/','-')}.png`,fullPage:true,caret:'initial'});results.push({route,status:response.status(),url:page.url()});}
 if(mode!=='before') {
 await page.setViewportSize({width:390,height:900});await page.goto(origin+'/');
 await page.getByRole('button',{name:'Toggle navigation',exact:true}).click();await page.getByRole('navigation',{name:'Mobile navigation'}).getByRole('link',{name:'How It Works',exact:true}).click();assert.equal(await page.getByRole('button',{name:'Toggle navigation',exact:true}).getAttribute('aria-expanded'),'false');await page.waitForURL('**/#how-it-works');
 await page.goto(origin+'/auth/callback?token_hash=fixture&type=signup&next=/');await page.waitForURL(origin+'/');
 assert.match(await page.locator('h1').innerText(),/Discover music/);
 await page.getByRole('button',{name:'Toggle navigation',exact:true}).click();
 for(const label of ['My Library','My Workspace','Continue Listening'])await page.getByRole('navigation',{name:'Mobile navigation'}).getByRole('link',{name:label,exact:true}).waitFor();
 for(const width of [1201,1280,1366,1440,1920]){await page.setViewportSize({width,height:1000});const boxes=await page.locator('[data-home-navigation] > div a,[data-home-navigation] > div button').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect()).filter(b=>b.width>0).map(b=>({left:b.left,right:b.right,top:b.top,bottom:b.bottom})));for(let i=0;i<boxes.length;i++){assert.ok(boxes[i].left>=0&&boxes[i].right<=width+1);for(let j=i+1;j<boxes.length;j++)assert.ok(Math.min(boxes[i].right,boxes[j].right)-Math.max(boxes[i].left,boxes[j].left)<=1||Math.min(boxes[i].bottom,boxes[j].bottom)-Math.max(boxes[i].top,boxes[j].top)<=1);}}
 console.log('PASS signed-in desktop navigation fits 1201/1280/1366/1440/1920px');
 state.admin=true;
 for(const route of ['/admin/users','/privacy','/terms','/copyright']){const response=await page.goto(origin+route);assert.equal(response.status(),200);assert.equal(new URL(page.url()).pathname,route);assert.equal(await page.getByRole('heading',{name:'We couldn’t load this page.',exact:true}).count(),0);await page.screenshot({path:`${dir}/authenticated-${route.slice(1).replaceAll('/','-')}.png`,fullPage:true,caret:'initial'});}
 console.log('PASS signed-in homepage, hash navigation, authorised admin and legal routes');
 const touch=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});const phone=await touch.newPage();const hydrated=phone.waitForResponse(response=>new URL(response.url()).pathname==='/api/session/status');await phone.goto(origin+'/');await hydrated;await phone.getByRole('button',{name:'Toggle navigation',exact:true}).tap();await phone.getByRole('navigation',{name:'Mobile navigation'}).getByRole('link',{name:'Creators',exact:true}).tap();await phone.waitForURL('**/creators');await touch.close();console.log('PASS touchscreen menu opens and follows Creators');
 // Chromium headless-shell has no browser-chrome zoom controls. Model desktop
 // zoom with the corresponding CSS viewport and device scale, never pinch zoom.
 for(const physicalWidth of [1366,1440,1920]){
 const zoom=await browser.newContext({viewport:{width:Math.floor(physicalWidth/1.25),height:800},deviceScaleFactor:1.25,reducedMotion:'reduce'});const zoomPage=await zoom.newPage();await zoomPage.goto(origin+'/');
 const geometry=await zoomPage.evaluate(()=>{const title=document.querySelector('h1').getBoundingClientRect();return {width:innerWidth,scroll:document.documentElement.scrollWidth,lines:[...document.querySelector('h1').childNodes].filter(n=>n.nodeName!=='BR').map(line=>{const r=document.createRange();r.selectNodeContents(line);const b=r.getBoundingClientRect();return b.left>=title.left-1&&b.right<=title.right+1}),dpr:devicePixelRatio};});assert.ok(geometry.scroll<=geometry.width+1);assert.ok(geometry.lines.every(Boolean));assert.equal(geometry.dpr,1.25);await zoomPage.screenshot({path:`${dir}/zoom125-emulated-${physicalWidth}.png`,caret:'initial'});await zoom.close();console.log(`PASS 125% effective desktop scale at ${physicalWidth}px (emulated)`);
 }

 }
 await writeFile(`${dir}/dimensions.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
}catch(e){console.error(e,logs.slice(-4000));process.exitCode=1;}finally{await browser?.close();child.kill('SIGTERM');server.closeAllConnections();server.close();}
