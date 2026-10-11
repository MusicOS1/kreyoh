import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const css=readFileSync(new URL("../app/music-admin-heros.css",import.meta.url),"utf8");
test("editorial fade is alpha-based, ends early and does not whitewash published artwork",()=>{
  assert.match(css,/\.sound-feed \.listener-hero\.fan-photo-hero \.fan-photo-hero-art\s*\{[^}]*mask-image:linear-gradient\(90deg,transparent 0%,[^}]*#000 31%\)/s);
  assert.match(css,/\.sound-feed \.listener-hero\.fan-photo-hero \.fan-photo-hero-shade\s*\{[^}]*background:none/s);
  assert.doesNotMatch(css,/var\(--fan-surface\) 4%,transparent 78%/);
});
test("immersive, spotlight and stacked mobile hero do not inherit desktop fade mask",()=>{
  assert.match(css,/\.listener-hero\.fm-hero-immersive \.fan-photo-hero-art\s*\{[^}]*mask-image:none/s);
  assert.match(css,/\.listener-hero\.fm-hero-spotlight \.fan-photo-hero-art\s*\{[^}]*mask-image:none/s);
  assert.match(css,/@media\(max-width:700px\)[\s\S]*?\.listener-hero\.fan-photo-hero \.fan-photo-hero-art\s*\{[^}]*mask-image:none/s);
});
