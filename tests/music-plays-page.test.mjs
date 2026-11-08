import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
test("music plays is a protected independent dashboard with a dedicated sidebar link",()=>{
 const page=read("app/admin/(control)/music-plays/page.tsx");
 const nav=read("components/ControlRoomShell.tsx");
 assert.match(page,/requireControlRoomPermission\("music"\)/);
 assert.match(page,/public_music_play_stats/);
 assert.match(page,/music_releases/);
 assert.match(page,/lifetime_plays/);
 assert.match(page,/period_plays/);
 assert.match(page,/period_starts/);
 assert.match(page,/period_listeners/);
 assert.match(page,/last_play_at/);
 assert.match(page,/role="alert"/);
 assert.match(page,/<table className=\{styles\.table\}>/);
 assert.match(nav,/label: "Music plays", href: "\/admin\/music-plays"/);
});
test("old account metrics remain in general analytics, no duplicate or unstyled counters",()=>{
 const page=read("app/admin/(control)/analytics/page.tsx");
 assert.doesNotMatch(page,/fm-music-play-row|fm-music-play-table|rpc\("public_music_play_stats"/);
 assert.match(page,/href="\/admin\/music-plays"/);
 for(const item of ["login_attempted","password_reset_requested","beat_played","beat_claim_clicked","activeUsers","newUsers"])
  assert.ok(page.includes(item),"Unrelated account analytics removed: "+item);
});
test("dedicated music dashboard is styled for desktop and mobile",()=>{
 const css=read("app/admin/(control)/music-plays/music-plays.module.css");
 assert.match(css,/\.tableWrap\{[^}]*overflow-x:auto/);
 assert.match(css,/\.table\{[^}]*min-width:810px/);
 assert.match(css,/@media\(max-width:680px\)/);
 assert.match(css,/font-variant-numeric:tabular-nums/);
});
test("new pages and restored artist selection compile as TS syntax",()=>{
 for(const path of ["app/admin/(control)/music-plays/page.tsx",
  "app/admin/(control)/discovery/featured-artist-actions.ts",
  "app/admin/(control)/discovery/page.tsx",
  "components/HeroAdminPanel.tsx","components/FeaturedArtistAdmin.tsx",
  "components/ecosystem/PublicMusicPage.tsx","components/ListenerExperience.tsx",
  "app/fan/page.tsx","lib/featuredArtist.ts"]){
  const file=ts.createSourceFile(path,read(path),ts.ScriptTarget.Latest,true,
   path.endsWith(".tsx")?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  assert.equal(file.parseDiagnostics.length,0,path+": "+file.parseDiagnostics.map(x=>x.messageText).join("; "));
 }
});
