import AppShell from "../../components/AppShell";
import PlaceholderModule from "../../components/PlaceholderModule";

export default function OpportunitiesPage() {
  return (
    <AppShell>
      <PlaceholderModule
        title="Opportunities & Sync"
        subtitle="Sync licensing briefs, brand partnerships, pitch decks, and live performance bookings."
        eyebrow="PROJECT 001 / COMMERCIAL"
        phase="Phase 2 Release"
        badge="COMMERCIAL VENTURES"
        description="Connects Project 001 finished masters and catalogue tracks to real commercial sync briefs, film/TV opportunities, and brand licensing."
        plannedFeatures={[
          {
            title: "Live Sync Brief Feed",
            description: "Direct pitch submissions for television, film, gaming, commercial sync, and advertising briefs.",
          },
          {
            title: "Smart Catalogue Pitching",
            description: "Instant filtering by mood, tempo, instrumentation, and lyric themes for instant brief responses.",
          },
          {
            title: "Brand & Endorsement Deals",
            description: "Venture-level brand agreements, sponsorship contracts, and creator collaboration pipelines.",
          },
          {
            title: "Commercial Deal Ledger",
            description: "Deal term tracking, upfront sync fee agreements, and backend royalty waterfall accounting.",
          },
        ]}
      />
    </AppShell>
  );
}
