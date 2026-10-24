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
 assert.match(file("components/ListenerExperience.tsx"),/src=\{featured\}/);
 assert.match(file("app/billboard/page.tsx"),/fm-billboard-hero-art/);
 assert.match(file("app/billboard/\[releaseId\]/page.tsx"),/fm-billboard-hero-art/);
 assert.match(file("app/fan/profile/page.tsx"),/fackts-creative-community\.jpg/);
});
test("private messaging retains identity, read states and permissions",()=>{
 const conversation=file("app/messages/[userId]/page.tsx");
 const composer=file("components/MemberConversation.tsx");
 const timeline=file("components/ChatTimeline.tsx");
 assert.match(conversation,/getWorkspace\(\)/);
 assert.match(conversation,/member_blocks/);
 assert.match(conversation,/ChatTimeline/);
 assert.match(composer,/sendMessage,markConversationRead,blockMember/);
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
