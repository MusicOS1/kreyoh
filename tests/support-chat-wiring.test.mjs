import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Support tables are isolated, with RLS and no public policies", () => {
  const migration = read("supabase/migrations/20261123060000_music_support_conversations.sql");
  assert.match(migration, /music_support_threads.*enable row level security/s);
  assert.match(migration, /music_support_messages.*enable row level security/s);
  assert.doesNotMatch(migration, /create policy/i);
  assert.match(migration, /revoke all .* from anon,authenticated/);
});

test("Customer and agent send flows verify permissions", () => {
  const actions = read("app/support/actions.ts");
  assert.match(actions, /supabase\.auth\.getUser\(\)/);
  assert.match(actions, /requireControlRoomPermission\("enquiries"\)/);
  assert.match(actions, /eq\("requester_id", user\.id\)/);
  assert.match(actions, /sender_role: "customer"/);
  assert.match(actions, /sender_role: "agent"/);
});

test("Both ends have routes and support launcher does not cover admin", () => {
  assert.match(read("app/support/page.tsx"), /SupportConversation/);
  assert.match(read("app/admin/(control)/support/page.tsx"), /getControlRoomSupport/);
  assert.match(read("components/SupportLauncher.tsx"), /pathname\.startsWith\("\/admin"\)/);
  assert.match(read("components/ControlRoomShell.tsx"), /href: "\/admin\/support"/);
  assert.match(read("components/SupportConversation.tsx"), /SupportAutoRefresh/);
  assert.match(read("app/support/support.css"), /prefers-reduced-motion/);
});

test("APK download is hidden until a trusted URL is configured", () => {
  const page = read("app/download/page.tsx");
  assert.match(page, /ANDROID_APK_DOWNLOAD_URL/);
  assert.match(page, /https:/);
  assert.match(page, /endsWith\("\.apk"\)/);
});
