import AppShell from "../../components/AppShell";
import PlaceholderModule from "../../components/PlaceholderModule";

export default function TracksPage() {
  return (
    <AppShell>
      <PlaceholderModule
        title="Tracks & Catalog"
        subtitle="Venture master track catalogue, metadata, recording versions, and stem archives."
        eyebrow="PROJECT 001 / PRODUCTION"
        phase="Phase 2 Release"
        badge="CATALOG & STEM ENGINE"
        description="Tracks links writing sessions, registered beats, recording takes, mix/master iterations, and ISRC metadata into an immutable music record."
        plannedFeatures={[
          {
            title: "Master Catalog Registry",
            description: "Track version history from early scratch vocals to final approved masters with stem archives.",
          },
          {
            title: "Metadata & ISRC Assignment",
            description: "Industry-standard metadata schemas, contributor credits, and direct digital distributor exports.",
          },
          {
            title: "Mixing & Mastering Pipeline",
            description: "Engineer review stages, revision notes, approval milestones, and audio reference player.",
          },
          {
            title: "Asset & Stems Vault",
            description: "High-resolution lossless stem storage, multitrack routing, and instant producer access.",
          },
        ]}
      />
    </AppShell>
  );
}
