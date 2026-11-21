import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../app/tracks/projectPlayer.css', import.meta.url), 'utf8');
const player = readFileSync(new URL('../components/TrackPlaylist.tsx', import.meta.url), 'utf8');

test('closed results use a dedicated chart layout without changing open voting', () => {
  assert.match(player, /enableRanking&&resultsVisible\?" is-final-results"/);
  assert.match(css, /grid-template-areas:"song actions score"/);
  assert.match(css, /\.spotify-room\.is-final-results \.queue-row-actions\s*\{\s*grid-area:actions/);
  assert.match(css, /\.spotify-room\.is-final-results \.track-result-score\s*\{\s*grid-area:score/);
});
test('phone layout preserves both score and queue controls in separate rows', () => {
  assert.match(css, /@media\(max-width:760px\)[\s\S]*grid-template-areas:"song score" "actions actions"/);
  assert.match(css, /\.spotify-room\.is-final-results \.track-result-score\s*\{\s*grid-area:score;\s*display:flex/);
  assert.match(player, /aria-label=\{`Final score for /);
});
