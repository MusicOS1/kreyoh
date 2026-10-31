import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const source = (path) => readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("diagnostic writes avoid credentials and preserve historical auth events",()=>{
  const helper=source("lib/diagnostics.ts");
  assert.match(helper,/from\("platform_events"\)\.insert/);
  assert.match(helper,/category: "authentication"/);
  assert.doesNotMatch(helper,/email:\s*input\.|password:\s*input\.|metadata:\s*error/);
  assert.match(source("app/login/actions.ts"),/event:"login_failed"/);
  assert.match(source("app/admin/actions.ts"),/event:"login_access_denied"/);
});
test("browser incident ingestion has authenticated, bounded and restricted fields",()=>{
  const route=source("app/api/diagnostics/route.ts");
  assert.match(route,/auth\.getUser\(\)/);
  assert.match(route,/recent\.data \|\| \[\]\)\.length >= 5/);
  assert.match(route,/!rawRoute\.includes\("\?"\)/);
  assert.doesNotMatch(route,/body\.message|body\.stack|body\.email|body\.password/);
  assert.match(route,/source: "client_runtime"/);
});
test("diagnostics are only accessible by system permission",()=>{
  assert.match(source("app/admin/(control)/diagnostics/layout.tsx"),/requireControlRoomPermission\("system"\)/);
  assert.match(source("components/ControlRoomShell.tsx"),/\/admin\/diagnostics/);
});
test("recorded errors distinguish absence from missing queries",()=>{
  const page=source("app/admin/(control)/diagnostics/page.tsx");
  assert.match(page,/authResult\.error \|\| incidentResult\.error \|\| failuresResult\.error/);
  assert.match(page,/cannot be recovered/);
  assert.match(page,/Unresolved incidents/);
  assert.match(page,/Login attempts/);
});
