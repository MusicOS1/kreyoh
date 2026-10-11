import {readFileSync} from "node:fs";
import {test} from "node:test";
import assert from "node:assert/strict";
import ts from "typescript";

const source=(path)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
test("fan features parse as valid TSX",()=>{
  for(const file of [
    "components/FanThemePicker.tsx","components/FanShell.tsx","components/FanMobileTabs.tsx",
    "components/ListenerExperience.tsx","components/TrackPlaylist.tsx",
    "components/ProfilePhotoUpload.tsx","app/fan/profile/page.tsx",
    "app/fan/profile/actions.ts","app/fan/page.tsx"
  ]){
    const fileSource=source(file);
    const parsed=ts.createSourceFile(file,fileSource,ts.ScriptTarget.Latest,true,
      file.endsWith(".tsx")?ts.ScriptKind.TSX:ts.ScriptKind.TS);
    assert.deepEqual(parsed.parseDiagnostics.map(item=>item.messageText),[],file);
  }
});
test("fan profile updates only the signed-in user and uses normal form navigation",()=>{
  const action=source("app/fan/profile/actions.ts");
  assert.match(action,/\.eq\("id",user\.id\)/);
  assert.match(action,/revalidatePath\("\/fan"\)/);
  assert.match(source("app/fan/profile/page.tsx"),/ProfilePhotoUpload/);
  assert.match(source("app/fan/profile/page.tsx"),/form action=\{saveFanProfile\}/);
});
test("fan themes persist without changing the creator workspace",()=>{
  const picker=source("components/FanThemePicker.tsx");
  const styles=source("app/fan-premium.css");
  assert.match(picker,/window\.localStorage\.setItem\(storageKey,next\)/);
  for(const theme of ["obsidian","ivory","afterhours"])assert.match(picker,new RegExp(theme));
  assert.match(styles,/@media\(max-width:760px\)/);
  assert.match(styles,/prefers-reduced-motion:reduce/);
  assert.match(styles,/\.fan-shell/);
});
test("player has a compact queue control; fan tabs and signup use fan-first defaults",()=>{
  assert.match(source("components/TrackPlaylist.tsx"),/compact=false/);
  assert.match(source("components/TrackPlaylist.tsx"),/fan-queue-toggle/);
  assert.match(source("app/fan/page.tsx"),/initialTab=\{initialTab\}/);
  assert.match(source("components/SignupForm.tsx"),/Fan \/ Listener/);
});
