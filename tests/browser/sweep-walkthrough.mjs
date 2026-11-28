import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,args:['--no-sandbox']});
const site='http://localhost:3121'; let song='/billboard/45000000-0000-4000-8000-000000000001',name='Nairobi Soundcheck';
const checks=[],width=Number(process.env.SWEEP_WIDTH||390),dir=pathToFileURL(resolve(process.env.SWEEP_EVIDENCE_DIR||'sweep-evidence')+'/');await mkdir(dir,{recursive:true});
async function page(){const ctx=await browser.newContext({viewport:{width,height:width===390?844:900},reducedMotion:'reduce'});let p=await ctx.newPage();p.setDefaultTimeout(20000);p.setDefaultNavigationTimeout(60000);return p;}
async function go(p,path){await p.goto(site+path,{waitUntil:'domcontentloaded'});}
async function login(p,who,path){await go(p,'/login?next='+encodeURIComponent(path));await p.locator('[name=email]').fill(who+'@example.test');await p.locator('[name=password]').fill('isolated-password');await p.getByRole('button',{name:'Sign In →',exact:true}).click();await p.waitForURL(u=>u.pathname===path);}
async function snap(p,n){await p.screenshot({path:new URL(n+'.png',dir).pathname});}
async function check(label,fn){let p=await page();try{await fn(p);checks.push({label,passed:true});console.log('PASS',label);}catch(e){const detail=e.message;console.log('STATUS',await p.getByRole('status').allTextContents().catch(()=>[]));checks.push({label,passed:false,detail});console.log('FAIL',label,detail.slice(0,1000));await snap(p,'failed-'+checks.length).catch(()=>{});console.log('SCREEN',p.url(),(await p.locator('body').innerText()).slice(0,1000));}finally{await p.context().close();await writeFile(new URL('journeys.json',dir),JSON.stringify(checks,null,2));}}
for (const path of ['/privacy','/terms','/copyright','/finance-office/login']) await check('Signed out '+path,async p=>{await go(p,path);assert.equal(new URL(p.url()).pathname,path);assert.ok((await p.locator('h1').first().innerText()).length>3);await snap(p,path.replaceAll('/','-'));});
await check('New artist sees zero-data home',async p=>{await login(p,'newartist','/workspaces/artist');await p.getByText('No performance data yet',{exact:true}).waitFor();await p.getByText('No releases yet',{exact:true}).waitFor();await snap(p,'newartist');});
await check('Independent artist creates project and studio session',async p=>{
 await login(p,'newartist','/projects');await p.getByLabel('Project name').fill('Nairobi studio take');await p.getByRole('button',{name:'Create project ↗'}).click();await p.waitForURL(u=>u.pathname==='/production');await go(p,'/studio-sessions');await p.locator('[name=starts_at]').fill('2026-12-01T12:00');await p.locator('[name=location]').fill('Synthetic studio');await p.getByRole('button',{name:'Schedule session ↗'}).click();await p.locator('.session-history-card').first().waitFor();await p.reload();await p.locator('.session-history-card > summary').first().click();await p.getByText(/Synthetic studio/).first().waitFor();await snap(p,'project-session');
});
name='Nairobi Studio Take';
await check('Artist uploads original WAV and artwork with off-platform credit',async p=>{
 await login(p,'newartist','/billboard/submit');
 const f=p.locator('form').filter({has:p.getByRole('button',{name:'Submit for review'})});
 await f.getByLabel('Song title').fill(name);await f.getByLabel('Artist / act name').fill('Soundcheck Artist');
 await f.locator('select').filter({has:p.locator('option[value=external]')}).selectOption('external');await f.getByLabel('Contributor’s credited name').fill('Guest Keys');await f.getByRole('button',{name:'+ Add credit'}).click();
 const {wavHeader}=await import('../helpers/mock-production-r2.mjs');const buf=Buffer.alloc(16*16000);for(let i=0;i<buf.length/2;i++)buf.writeInt16LE(Math.round(1800*Math.sin(2*Math.PI*220*i/8000)),i*2);
 await f.locator('[name=audio]').setInputFiles({name:'Studio Take.wav',mimeType:'audio/wav',buffer:Buffer.concat([wavHeader(buf.length),buf])});
 await f.locator('[name=cover]').setInputFiles(new URL('../../public/branding/fackts-music-logo.png',import.meta.url).pathname);
 await f.locator('[name=rights]').check();await f.getByRole('button',{name:'Submit for review'}).click();await p.getByRole('heading',{name,exact:true}).waitFor({timeout:45000});await p.reload();await p.locator('article').filter({hasText:name}).getByText('pending',{exact:true}).waitFor();await snap(p,'submitted');
});
await check('Reviewer publishes the artist submission and credits survive',async p=>{
 await login(p,'outsider','/admin/releases/songs');const row=p.locator('details.fm-release-item').filter({has:p.locator('summary strong',{hasText:name})});await row.locator(':scope > summary').click();const id=(await row.getAttribute('id')).slice(8);song='/billboard/'+id;
 await row.getByText(/Guest Keys/).first().waitFor();p.once('dialog',d=>d.accept());await row.getByRole('button',{name:'Approve release'}).click();await row.locator(':scope > summary').getByText('published',{exact:true}).waitFor();await go(p,song);await p.getByRole('heading',{name,exact:true}).waitFor();await p.getByText(/Featured artist.*Guest Keys/).first().waitFor();await snap(p,'new-published');
});
async function listen(p,role){await go(p,song);await p.getByRole('heading',{name}).waitFor();const q=p.waitForResponse(r=>r.url().endsWith('/api/music/plays') && r.request().postDataJSON()?.action==='qualify',{timeout:45000});q.catch(()=>{});await p.getByRole('button',{name:'Listen',exact:true}).click();const result=await q;const json=await result.json();assert.equal(json.qualified,true,JSON.stringify(json));await p.reload();await snap(p,role+'-qualified');}
await check('Guest qualified play survives reload',async p=>{await listen(p,'guest');const count=p.locator('.fm-music-play-count').first();await count.getByText('1 play',{exact:true}).waitFor();assert.equal(await count.getAttribute('aria-label'),'1 recorded play');});
await check('Fan qualified play and existing playlist persist',async p=>{await login(p,'fan',song);await listen(p,'fan');await p.getByLabel('Existing playlist',{exact:true}).selectOption({label:'Soundcheck favourites'});await p.getByRole('button',{name:'Add to playlist',exact:true}).click();await p.getByText('Added to playlist.',{exact:true}).waitFor();await go(p,'/fan?tab=My%20Library');await p.locator('.fs-library-pills').getByRole('button',{name:'Soundcheck favourites'}).click();await p.getByText(name,{exact:true}).first().waitFor();await p.getByRole('button',{name:'Play '+name,exact:true}).first().click();await p.waitForFunction(()=>[...document.querySelectorAll('audio')].some(a=>!a.paused&&a.currentTime>0));await snap(p,'playlist');});
await check('Artist sees the same two qualified plays',async p=>{await login(p,'newartist','/workspaces/artist');await p.getByText(/2 qualified plays/).first().waitFor();await snap(p,'artist-plays');});
await check('Music reviewer sees the same two plays and two listeners',async p=>{await login(p,'outsider','/admin/music-plays');const cells=await p.getByRole('row').filter({hasText:name}).getByRole('cell').allTextContents();assert.equal(cells[1],'2');assert.equal(cells[2],'2');assert.ok(Number(cells[3])>=2);assert.equal(cells[4],'2');await snap(p,'admin-plays');});
await check('Finance creates, reloads and cancels a draft',async p=>{await go(p,'/finance-office/login');await p.getByLabel('Email address').fill('finance@example.test');await p.getByLabel('Password').fill('isolated-password');await p.getByRole('button',{name:'Open Finance Office'}).click();await p.waitForURL(u=>u.pathname==='/finance-office');await go(p,'/finance-office/payment-requests');await p.locator('[name=purpose_code]').selectOption('fan_membership');await p.locator('[name=amount_kes]').fill('150');const description='Soundcheck membership · isolated draft';await p.locator('textarea[name=description]').fill(description);await p.getByRole('button',{name:'Save payment-request draft'}).click();await p.getByText(/A draft payment request was saved/).waitFor();await p.reload();const row=p.getByRole('row').filter({hasText:description}).first();assert.match(await row.innerText(),/150/);assert.match(await row.innerText(),/draft/i);await snap(p,'finance-draft');await row.getByRole('button',{name:'Cancel',exact:true}).click();await row.getByText(/cancelled/).waitFor();await p.reload();await row.getByText(/cancelled/).waitFor();await snap(p,'finance-cancelled');});
await check('Fan denied finance records',async p=>{await login(p,'fan','/fan');await go(p,'/finance-office/payment-requests');await p.waitForURL(u=>u.pathname==='/finance-office/access-unavailable');await snap(p,'finance-denied');});
await check('Music reviewer and artist cannot open the finance ledger',async p=>{
 for(const who of ['outsider','newartist']){
  await login(p,who,who==='outsider'?'/admin/music-plays':'/workspaces/artist');
  await go(p,'/finance-office/payment-requests');
  await p.waitForURL(u=>u.pathname==='/finance-office/access-unavailable');
  await p.context().clearCookies();
 }
});
await check('Creator ticker has one keyboard stop per destination',async p=>{
 await go(p,'/');const ticker=p.locator('.fm-v3-ticker-track');
 const links=ticker.getByRole('link');await links.first().waitFor();
 const hrefs=await links.evaluateAll(items=>items.map(item=>item.href));
 assert.equal(new Set(hrefs).size,hrefs.length);
 assert.equal(await ticker.locator('.fm-v3-ticker-copy[aria-hidden=true]').count(),hrefs.length);
 assert.equal(await ticker.locator('.fm-v3-ticker-copy a').count(),0);
 await links.first().focus();assert.equal(await ticker.evaluate(el=>getComputedStyle(el).animationName),'none');
 assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await snap(p,'creator-ticker');
 await links.first().press('Enter');await p.waitForURL(hrefs[0]);
});
await browser.close();
if (checks.some(result=>!result.passed)) process.exitCode=1;
