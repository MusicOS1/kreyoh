// Live collections under a Kenya Starter account are intentionally limited to
// FACKTS's own services while provider classification is being confirmed.
// These are NOT permitted in live mode: project crowdfunding / pooled contributions,
// fan streaming subscriptions, artist-to-artist settlement, wallets, or transfers.
export const LIVE_CHECKOUT_PURPOSES = [
  "recording_session",
  "production_service",
] as const;

export function isPurposeAllowedForPaymentMode(
  purpose: string,
  mode: "test" | "live",
): boolean {
  return mode === "test" || (LIVE_CHECKOUT_PURPOSES as readonly string[]).includes(purpose);
}
