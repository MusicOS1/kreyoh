import AppShell from "../../components/AppShell";
import PlaceholderModule from "../../components/PlaceholderModule";

export default function FinancePage() {
  return (
    <AppShell>
      <PlaceholderModule
        title="Finance & Recoupment"
        subtitle="Venture budgets, project expenditures, recoupment waterfall, and royalty distribution."
        eyebrow="PROJECT 001 / ECONOMICS"
        phase="Phase 2 Release"
        badge="ECONOMICS ENGINE"
        description="The financial operating room for Project 001: tracks every shilling spent on production, engineering, video, and marketing until full recoupment and profit distribution."
        plannedFeatures={[
          {
            title: "Project Spend & Budget Ledger",
            description: "Categorized expense logging for studio time, beat licensing, session musicians, mixing, and visuals.",
          },
          {
            title: "Automated Recoupment Waterfall",
            description: "Real-time calculation of venture recoupment status before net surplus payouts to contributors.",
          },
          {
            title: "Streaming & Sync Revenue Ingestion",
            description: "Direct CSV and distributor revenue import with automated per-track split allocation.",
          },
          {
            title: "Transparent Contributor Payouts",
            description: "Clear earnings breakdown per artist, producer, and stakeholder with automated settlement statements.",
          },
        ]}
      />
    </AppShell>
  );
}
