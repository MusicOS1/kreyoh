import {test} from "node:test";
import {readFileSync} from "node:fs";
import assert from "node:assert/strict";
import ts from "typescript";

function file(path){return readFileSync(new URL("../"+path,import.meta.url),"utf8");}
test("all changed server and client components parse successfully",()=>{
 for(const path of ["components/ListenerExperience.tsx","components/MemberConversation.tsx","components/ChatTimeline.tsx",
   "components/FanMobileTabs.tsx","components/FanShell.tsx","app/fan/page.tsx",
   "app/messages/page.tsx","app/messages/[userId]/page.tsx","app/billboard/page.tsx",
   "app/billboard/[releaseId]/page.tsx","app/fan/profile/page.tsx"]){
  const parsed=ts.createSourceFile(path,file(path),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  assert.equal(parsed.parseDiagnostics.length,0,path+": "+parsed.parseDiagnostics.map(x=>x.messageText).join("; "));
 }
});
test("hero images are real FACKTS assets or published artwork, never generated faces",()=>{
 for(const name of ["fackts-creative-community.jpg","fackts-creator-red-wide.jpg","fackts-creator-sky.jpg","fackts-monnokid-workspace.jpg"]){
  assert.doesNotThrow(()=>file("public/branding/"+name));
 }
 assert.match(file("components/ListenerExperience.tsx"),/fallbackImage=\{featured\}/);
 assert.match(file("components/streaming/StreamArtistHero.tsx"),/src=\{photo\}/);
 assert.match(file("app/billboard/page.tsx"),/BillboardChart/);
 assert.match(file("components/BillboardChart.tsx"),/api\/releases/);
 assert.match(file("app/billboard/\[releaseId\]/page.tsx"),/fm-billboard-hero-art/);
 assert.match(file("app/fan/profile/page.tsx"),/fackts-creative-community\.jpg/);
});
test("private messaging retains identity, read states and permissions",()=>{
 const conversation=file("app/messages/[userId]/page.tsx");
 const composer=file("components/MemberConversation.tsx");
 const timeline=file("components/ChatTimeline.tsx");
 assert.match(file("lib/conversationSnapshot.ts"),/getWorkspace\(\)/);
 assert.match(file("lib/conversationSnapshot.ts"),/member_blocks/);
 assert.match(conversation,/ChatTimeline/);
 assert.match(composer,/backgroundInteraction/);
 assert.doesNotMatch(composer,/router.refresh/);
 assert.match(timeline,/read_at/);
 assert.match(file("components/FanMobileTabs.tsx"),/\/messages/);
});
test("Ivory contrast and phone font sizes are explicitly overridden",()=>{
 const styles=file("app/fan-polish.css");
 assert.match(styles,/data-fackts-fan-theme="ivory"/);
 assert.match(styles,/--fan-text:#18191b/);
 assert.match(styles,/font-size:14px!important/);
 assert.match(styles,/prefers-reduced-motion:reduce/);
 assert.match(file("app/fan/page.tsx"),/Promise\.allSettled/);
});

test("FACKTS chart is a single real-data ranking and the public comments use a read-only endpoint",()=>{
 const chart=file("app/billboard/page.tsx");
 const component=file("components/BillboardChart.tsx");
 const comments=file("components/ReleaseComments.tsx");
 const api=file("app/api/releases/[id]/comments/route.ts");
 assert.match(chart,/chart\(\)/);
 assert.match(chart,/BillboardChart/);
 assert.doesNotMatch(chart,/TrackPlaylist/);
 assert.match(component,/fc-podium/);
 assert.match(component,/position/);
 assert.match(component,/ReleaseVoteCount/);
 assert.match(comments,/api\/releases/);
 assert.match(comments,/cache:"no-store"/);
 assert.match(api,/listReleaseComments/);
 assert.match(api,/uuidPattern/);
 assert.doesNotMatch(api,/postReleaseComment/);
});
test("public listener has no blocking website footer and Shows remains scrollable",()=>{
 assert.doesNotMatch(file("components/ecosystem/PublicMusicPage.tsx"),/PublicFooter/);
 const styles=file("components/streaming/streaming.css");
 assert.match(styles,/fs-shows-empty/);
 assert.match(styles,/min-height:calc\(100dvh - 80px\)/);
});
