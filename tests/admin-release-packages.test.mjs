import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";
const read=(path)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("release stack pages, forms and actions parse as TypeScript/TSX",()=>{
 for(const path of [
  "app/admin/(control)/releases/page.tsx",
  "app/admin/(control)/releases/songs/page.tsx",
  "app/admin/(control)/releases/packages/[packageId]/page.tsx",
  "app/admin/(control)/releases/packageActions.ts",
  "components/AdminReleasePackageFormat.tsx",
  "components/AdminReleaseRow.tsx"
 ]){
  const ast=ts.createSourceFile(path,read(path),ts.ScriptTarget.Latest,true,path.endsWith(".tsx")?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  assert.deepEqual(ast.parseDiagnostics.map(x=>x.messageText),[],path);
 }
});
test("admin catalogue has explicit types, collapsible stacks, searchable singles and paginated projects",()=>{
 const page=read("app/admin/(control)/releases/page.tsx");
 for(const marker of ['All collections','Projects','EPs','Mixtapes','Albums','LPs','Singles',
  'fm-package-card','music_release_packages','music_releases(count)','package_id', 'AdminReleasePackageFormat',
  'BulkReleaseApproval','/admin/releases/songs','fm-package-single-prompt']){
  assert.ok(page.includes(marker),marker);
 }
 const detail=read("app/admin/(control)/releases/packages/[packageId]/page.tsx");
 for(const marker of ["requireControlRoomPermission","package_id","track_number","AdminReleaseRow","AdminReleaseViewToggle","PAGE_SIZE=30"])
  assert.ok(detail.includes(marker),marker);
 assert.match(page,/\.is\("package_id",null\)/);
});
test("collection formats are music-admin-only, conditional and audit-logged",()=>{
 const action=read("app/admin/(control)/releases/packageActions.ts");
 for(const marker of ['requireControlRoomPermission("music")','release_package_classification_requested','release_package_classified',
  '.eq("format",packageRow.format)','revalidatePath("/admin/releases")'])
  assert.ok(action.includes(marker),marker);
 assert.doesNotMatch(action,/\.from\("music_releases"\)\.delete\(/);
 assert.doesNotMatch(action,/audio_key|cover_key|music_votes|music_play_sessions/);
});
test("historical grouping changes no rights or listener engagement and new uploads continue grouping",()=>{
 const migration=read("supabase/migrations/20261108185000_admin_release_packages.sql");
 for(const fragment of ["music_release_packages","package_id","music_release_package_sync","before insert or update of collection,artist_id",
  "music_releases_package_track_idx","music_releases_unpacked_recent_idx","'ep'","'mixtape'","'album'","'lp'",
  "enable row level security","revoke all on public.music_release_packages from anon, authenticated"])
  assert.ok(migration.includes(fragment),fragment);
 assert.doesNotMatch(migration,/\bdelete from public\.music_releases\b|\btruncate\b|\bdrop table public\.music_releases\b/i);
});
test("full release management remains in both the flat queue and each project",()=>{
 const flat=read("app/admin/(control)/releases/songs/page.tsx");
 const row=read("components/AdminReleaseRow.tsx");
 const group=read("app/admin/(control)/releases/packages/[packageId]/page.tsx");
 for(const marker of ["AdminReleaseViewToggle","AdminReleaseRow"])assert.ok(flat.includes(marker)&&group.includes(marker),marker);
 for(const marker of ["AdminDraftReview","ReleaseManagement","AdminReleaseDetailsEditor",
  "AdminReleaseAudioReplacement","AdminReleaseCoverReplacement"])
  assert.ok(row.includes(marker),marker);
});
