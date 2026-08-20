import AppShell from "../../components/AppShell";
import { getWorkspace } from "../../lib/workspace";
import { ActivityIcon, ClockIcon, FlameIcon } from "../../components/Icons";

export default async function ActivityPage() {
  const { supabase, project } = await getWorkspace();

  if (!project) {
    return (
      <AppShell>
        <div className="content">
          <div className="empty-state">
            <h2>No active project access</h2>
            <p>Your KREYOH account is not linked to an active project.</p>
          </div>
        </div>
      </AppShell>
    );
  }

  const { data: activities } = await supabase
    .from("activity_log")
    .select("id, action, created_at, entity_type")
    .eq("project_id", project.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const items = activities ?? [];

  return (
    <AppShell>
      <div className="content">
        <div className="heading enter">
          <div>
            <span className="eyebrow">PROJECT 001 / AUDIT TRAIL</span>
            <h1>Operating Ledger</h1>
            <p>Complete immutable chronological record of Project 001 actions, submissions and workflow milestones.</p>
          </div>

          <div className="date">
            <span>{items.length} TOTAL EVENTS</span>
          </div>
        </div>

        <div className="panel enter d1">
          <div className="panel-header-row">
            <div className="panel-title-group">
              <span className="eyebrow">VENTURE AUDIT LOG</span>
              <h2>All Project Activity</h2>
            </div>
            <span className="phase-pill-subtle">
              <ActivityIcon size={13} /> Live Stream
            </span>
          </div>

          {items.length === 0 ? (
            <div className="panel-empty">
              No activity recorded yet for Project 001. As team members add beats, register interest, and advance stages, events will stream here.
            </div>
          ) : (
            <div className="activity-timeline-full">
              {items.map((item, idx) => (
                <div className="activity-row-full" key={item.id}>
                  <div className="activity-timeline-node">
                    <span className="timeline-dot" />
                    {idx !== items.length - 1 && <span className="timeline-connector" />}
                  </div>

                  <div className="activity-content-full">
                    <div className="activity-main-text">
                      <p>{item.action}</p>
                      {item.entity_type && (
                        <span className="activity-entity-tag">{item.entity_type}</span>
                      )}
                    </div>
                    <time className="activity-timestamp">
                      <ClockIcon size={12} />
                      {new Date(item.created_at).toLocaleString("en-KE", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </time>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
