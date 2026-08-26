export function calculateProjectProgress(metrics: {
  members: number;
  beats: number;
  tracks: number;
  sessions: number;
}) {
  const weighted =
    10 +
    Math.min(metrics.members / 10, 1) * 15 +
    Math.min(metrics.beats / 6, 1) * 20 +
    Math.min(metrics.tracks / 5, 1) * 35 +
    Math.min(metrics.sessions / 4, 1) * 20;
  return Math.max(10, Math.min(100, Math.round(weighted)));
}
