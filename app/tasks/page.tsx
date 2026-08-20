import AppShell from "../../components/AppShell";
import PlaceholderModule from "../../components/PlaceholderModule";

export default function TasksPage() {
  return (
    <AppShell>
      <PlaceholderModule
        title="Tasks & Deliverables"
        subtitle="Operational action items, creative deadlines, asset deliverables, and team accountability."
        eyebrow="PROJECT 001 / EXECUTION"
        phase="Phase 2 Release"
        badge="ACTION ENGINE"
        description="Tracks every deliverable across writing, recording, mixing, artwork, video shoots, and digital release milestones."
        plannedFeatures={[
          {
            title: "Venture Kanban & Milestones",
            description: "Visual workflow boards mapped directly to Project 001 phases and writing deadlines.",
          },
          {
            title: "Role-Specific Action Queues",
            description: "Tailored to-do views for Artists (verse delivery), Producers (stems), and Leads (approvals).",
          },
          {
            title: "Automated Reminders & Alerts",
            description: "Smart notifications before writing deadlines and session dates without administrative clutter.",
          },
          {
            title: "Activity Dependency Mapping",
            description: "Links task completion to track pipeline status changes automatically.",
          },
        ]}
      />
    </AppShell>
  );
}
