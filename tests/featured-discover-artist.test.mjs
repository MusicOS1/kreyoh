import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("featured artist admin and page integrations parse cleanly",()=>{
 const paths=[
  "lib/featuredArtist.ts","app/admin/(control)/discovery/featured-artist-actions.ts",
  "components/FeaturedArtistAdmin.tsx","app/admin/(control)/discovery/page.tsx",
  "app/fan/page.tsx","components/ecosystem/PublicMusicPage.tsx",
  "components/ListenerExperience.tsx"
 ];
 for(const path of paths){
  const doc=ts.createSourceFile(path,read(path),ts.ScriptTarget.Latest,true,
   path.endsWith(".tsx")?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  assert.deepEqual(doc.parseDiagnostics.map(x=>x.messageText),[],path);
 }
});
test("admin saves only eligible public artists with a safe automatic fallback",()=>{
 const save=read("app/admin/(control)/discovery/featured-artist-actions.ts");
 const picker=read("components/FeaturedArtistAdmin.tsx");
 assert.match(save,/requireControlRoomPermission\("music"\)/);
 assert.match(save,/publicMusicArtists\(\)/);
 assert.match(save,/eligible\.some\(person=>person\.id===artistId\)/);
 assert.match(save,/setting_key:FEATURED_ARTIST_KEY/);
 assert.match(save,/revalidatePath\(path\)/);
 assert.match(picker,/option value=""/);
 assert.match(picker,/Save featured artist/);
 assert.match(picker,/customForYouEnabled/);
});
test("featured artist preference affects both public and signed-in Discover while actions survive",()=>{
 const fan=read("app/fan/page.tsx");
 const publicPage=read("components/ecosystem/PublicMusicPage.tsx");
 const listening=read("components/ListenerExperience.tsx");
 assert.match(fan,/selectedDiscoverArtistId\(\)/);
 assert.match(fan,/featuredArtistId=\{selectedFeaturedArtistId\}/);
 assert.match(publicPage,/selectedDiscoverArtistId\(\)/);
 assert.match(publicPage,/featuredArtistId=\{featuredArtist\.status/);
 assert.match(listening,/artist\.id===featuredArtistId/);
 assert.match(listening,/StreamArtistHero artist=\{spotlightArtist\}/);
 for(const action of ["onPlay={id=>playSong(id)}","onFollow={id=>void change","onOpen={openArtist}"])
  assert.ok(listening.includes(action));
});
