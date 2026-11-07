import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";
const read=(path)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("new show experience, admin editor and upload code parse cleanly",()=>{
 const files=[
  "lib/discoveryContent.ts","components/ShowsLanding.tsx",
  "components/ListenerExperience.tsx","components/AdminEditorialImageUpload.tsx",
  "components/HeroAdminPanel.tsx","components/DiscoveryEditor.tsx",
  "app/admin/(control)/discovery/actions.ts",
  "app/admin/(control)/discovery/page.tsx","app/shows/[id]/page.tsx"
 ];
 for(const file of files){
  const parsed=ts.createSourceFile(file,read(file),ts.ScriptTarget.Latest,true,
   file.endsWith(".tsx")?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  assert.deepEqual(parsed.parseDiagnostics.map(x=>x.messageText),[],file);
 }
});
test("Shows have one canonical editor, featured fan hero and detail page",()=>{
 const admin=read("components/HeroAdminPanel.tsx");
 const edit=read("components/DiscoveryEditor.tsx");
 const landing=read("components/ShowsLanding.tsx");
 const listening=read("components/ListenerExperience.tsx");
 const details=read("app/shows/[id]/page.tsx");
 assert.match(admin,/\.filter\(item=>item\.id!=="shows"\)/);
 assert.match(listening,/ShowsLanding items=\{editorial\}/);
 assert.match(landing,/shows\.find\(x=>x\.featured\)\|\|shows\[0\]/);
 assert.match(landing,/href=\{showHref\(featured\)\}/);
 for(const field of ["eventStart","eventEnd","venue","artistNames","programme","programmeImage","url","featured","published"]){
  assert.ok(edit.includes('name="'+field+'"'),"Missing admin field: "+field);
 }
 assert.match(details,/programmeImage/);
 assert.match(details,/publicShowParticipants/);
 assert.match(details,/item\.url/);
 assert.match(details,/notFound\(\)/);
});
test("upload accepts large PNG posters for local optimization without changing storage limit",()=>{
 const upload=read("components/AdminEditorialImageUpload.tsx");
 assert.match(upload,/MAX_BYTES=12\*1024\*1024/);
 assert.match(upload,/MAX_SOURCE_BYTES=80\*1024\*1024/);
 assert.match(upload,/createImageBitmap/);
 assert.match(upload,/image\/webp/);
 assert.match(upload,/uploadToSignedUrl/);
 assert.match(upload,/mediaType\(selected\)/);
 assert.match(read("app/admin/(control)/discovery/actions.ts"),/assertEditorialImageUploaded\(programmeImage\)/);
});

test("a public songwriter/composer may appear on a show without being relabelled Artist",()=>{
 const resolver=read("lib/publicShowParticipants.ts");
 const details=read("app/shows/[id]/page.tsx");
 assert.match(resolver,/profile_visibility/);
 assert.match(resolver,/account_status/);
 assert.match(resolver,/\.in\("stage_name",requested\)/);
 assert.match(resolver,/creator_types/);
 assert.match(details,/artist\.roles\.slice/);
});
test("poster uploads start on selection and cropping is saved and displayed",()=>{
 const uploader=read("components/AdminEditorialImageUpload.tsx");
 const editor=read("components/DiscoveryEditor.tsx");
 const hero=read("components/HeroAdminPanel.tsx");
 const render=read("components/ShowsLanding.tsx");
 const detail=read("app/shows/[id]/page.tsx");
 const store=read("app/admin/(control)/discovery/actions.ts");
 assert.match(uploader,/void uploadSelected\(selected\)/);
 assert.match(uploader,/Picture uploaded ✓/);
 assert.match(editor,/HeroImagePositioner/);
 assert.match(editor,/name="imageX"/);
 assert.match(editor,/name="imageY"/);
 assert.match(editor,/name="imageZoom"/);
 assert.match(hero,/HeroImagePositioner/);
 assert.match(store,/normalizeImageCrop/);
 assert.match(render,/imageCropStyle\(featured\)/);
 assert.match(detail,/imageCropStyle\(item\)/);
 assert.match(read("components/ConfiguredFanHero.tsx"),/imageCropStyle\(hero\)/);
});
