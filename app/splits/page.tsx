import AppShell from "../../components/AppShell";
import PlaceholderModule from "../../components/PlaceholderModule";

export default function SplitsPage() {
  return (
    <AppShell>
      <PlaceholderModule
        title="Splits & Rights Engine"
        subtitle="Master rights, publishing shares, composition splits, and digital signature agreements."
        eyebrow="PROJECT 001 / GOVERNANCE"
        phase="Phase 2 Release"
        badge="RIGHTS & SPLIT SHEETS"
        description="Eliminates music ownership disputes with real-time split negotiation, digital signature sign-offs, and PRO/CMO registration data exports."
        plannedFeatures={[
          {
            title: "Composition & Master Split Builder",
            description: "Visual percentage allocations for producers, topliners, instrumentalists, and project venture shares.",
          },
          {
            title: "One-Click In-App Signatures",
            description: "Legally binding digital approvals with time-stamped IP verification for all contributors.",
          },
          {
            title: "PRO/CMO Export Packs",
            description: "Pre-formatted registration data sheets for BMI, ASCAP, PRS, KECOBO, MCSK, and international bodies.",
          },
          {
            title: "Dispute Prevention Ledger",
            description: "Full audit trail of split proposals, revision notes, and final counter-signed agreement records.",
          },
        ]}
      />
    </AppShell>
  );
}
