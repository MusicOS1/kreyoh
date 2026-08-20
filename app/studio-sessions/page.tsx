import AppShell from "../../components/AppShell";
import PlaceholderModule from "../../components/PlaceholderModule";

export default function StudioSessionsPage() {
  return (
    <AppShell>
      <PlaceholderModule
        title="Studio Sessions"
        subtitle="Live booking, recording schedules, studio engineer assignments, and call sheets."
        eyebrow="PROJECT 001 / OPERATIONS"
        phase="Phase 2 Release"
        badge="STUDIO LOGISTICS ENGINE"
        description="Coordinates physical and remote studio sessions, engineer bookings, mic sheets, attendance logs, and project hour tracking."
        plannedFeatures={[
          {
            title: "Live Session Booking",
            description: "Studio room availability, engineer rosters, session lockouts, and calendar integration.",
          },
          {
            title: "Automated Call Sheets",
            description: "Instant artist and producer reminders, arrival times, gear requirements, and address routing.",
          },
          {
            title: "Take & Session Logs",
            description: "In-session scratchpad, vocal chains used, engineer notes, and direct beat-to-track links.",
          },
          {
            title: "Cost & Hours Tracking",
            description: "Hourly studio rates, engineer billing reconciliation, and automated project spend logging.",
          },
        ]}
      />
    </AppShell>
  );
}
