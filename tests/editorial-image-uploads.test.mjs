import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("editorial image upload code parses as TypeScript and JSX",()=>{
 const paths=[
  "lib/editorialImages.ts","components/AdminEditorialImageUpload.tsx",
  "components/HeroAdminPanel.tsx","components/DiscoveryEditor.tsx",
  "app/api/admin/editorial-images/route.ts",
  "app/api/editorial-images/[asset]/route.ts",
  "app/admin/(control)/discovery/hero-actions.ts",
  "app/admin/(control)/discovery/actions.ts"
 ];
 for(const path of paths){
  const source=ts.createSourceFile(path,read(path),ts.ScriptTarget.Latest,true,
   path.endsWith(".tsx")?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  assert.deepEqual(source.parseDiagnostics.map(x=>x.messageText),[],path);
 }
});
test("picture upload is admin-only and uses short lived signed storage tokens",()=>{
 const prepare=read("app/api/admin/editorial-images/route.ts");
 const serve=read("app/api/editorial-images/[asset]/route.ts");
 const model=read("lib/editorialImages.ts");
 assert.match(prepare,/requireControlRoomPermission\("music"\)/);
 assert.match(prepare,/createSignedUploadUrl\(path\)/);
 assert.match(prepare,/MAX_BYTES/);
 assert.match(serve,/createSignedUrl\(path,300\)/);
 assert.match(model,/editorialImageStoragePath/);
 assert.match(model,/assertEditorialImageUploaded/);
});
test("all admin editorial forms upload pictures without passing files through the interaction API",()=>{
 const uploader=read("components/AdminEditorialImageUpload.tsx");
 const hero=read("components/HeroAdminPanel.tsx");
 const discovery=read("components/DiscoveryEditor.tsx");
 assert.match(uploader,/uploadToSignedUrl/);
 assert.match(uploader,/type="file"/);
 assert.doesNotMatch(uploader,/type="file"[^>]*name=/);
 assert.match(hero,/AdminEditorialImageUpload/);
 assert.match(discovery,/AdminEditorialImageUpload/);
 assert.match(hero,/pending\|\|imageUploading/);
 assert.match(discovery,/pending\|\|uploading/);
 assert.match(read("app/admin/(control)/discovery/hero-actions.ts"),/assertEditorialImageUploaded\(image\)/);
 assert.match(read("app/admin/(control)/discovery/actions.ts"),/assertEditorialImageUploaded\(image\)/);
});
