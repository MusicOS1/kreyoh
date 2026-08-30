import Link from "next/link";
import AppShell from "../../components/AppShell";
import { getWorkspace } from "../../lib/workspace";
import { createProjectDocument, deleteProjectDocument } from "./actions";

const PAGE_SIZE = 15;

const TYPE_LABELS: Record<string, string> = {
  meeting_minutes: "Meeting Minutes",
  brief: "Project Brief",
  agreement: "Agreement",
  report: "Report",
  reference: "Reference",
  other: "Other",
};

function readableDate(value?: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("en-KE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

function fileSize(value?: number | null) {
  if (!value) return null;
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    view?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const { admin, user, project, roles } = await getWorkspace();

  if (!project) {
    return (
      <AppShell>
        <div className="content">
          <section className="panel">
            <span className="eyebrow">PROJECT RECORDS</span>
            <h1>Choose a project first.</h1>
            <p>Documents and meeting minutes live inside a specific project.</p>
            <Link href="/projects" className="secondary-button-inline">Open My Projects →</Link>
          </section>
        </div>
      </AppShell>
    );
  }

  const page = Math.max(1, Number(params.page) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const q = String(params.q || "").trim().replace(/[,%()]/g, " ");
  const view = params.view === "minutes" ? "minutes" : params.view === "documents" ? "documents" : "all";

  let query = admin
    .from("project_documents")
    .select("*,profiles(full_name,stage_name)", { count: "exact" })
    .eq("project_id", project.id)
    .order("meeting_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (view === "minutes") query = query.eq("document_type", "meeting_minutes");
  if (view === "documents") query = query.neq("document_type", "meeting_minutes");
  if (q) query = query.or(`title.ilike.%${q}%,summary.ilike.%${q}%`);

  const { data: rawDocuments = [], count = 0, error } = await query;

  const documents = await Promise.all(
    (rawDocuments || []).map(async (document: any) => {
      let signedUrl: string | null = null;

      if (document.file_storage_key) {
        const { data } = await admin.storage
          .from("project-documents")
          .createSignedUrl(document.file_storage_key, 60 * 60);

        signedUrl = data?.signedUrl || null;
      }

      return { ...document, signedUrl };
    }),
  );

  const totalPages = Math.max(1, Math.ceil((count || 0) / PAGE_SIZE));
  const canManage = roles.some((role) =>
    ["Super Admin", "Admin", "Project Lead"].includes(role),
  );

  const linkFor = (targetPage: number, targetView = view) => {
    const next = new URLSearchParams();
    if (q) next.set("q", q);
    if (targetView !== "all") next.set("view", targetView);
    next.set("page", String(targetPage));
    return `/documents?${next.toString()}`;
  };

  return (
    <AppShell>
      <style>{`
        .documents-page{padding-block:28px 85px}
        .documents-hero{position:relative;overflow:hidden;padding:clamp(26px,4vw,46px);border:1px solid rgba(255,255,255,.09);border-radius:26px;background:radial-gradient(circle at 90% 10%,rgba(249,115,22,.14),transparent 32%),linear-gradient(145deg,#12100e,#080808 64%);box-shadow:0 28px 80px rgba(0,0,0,.25)}
        .documents-hero:after{content:"";position:absolute;right:-100px;bottom:-140px;width:340px;height:340px;border-radius:50%;background:radial-gradient(circle,rgba(249,115,22,.15),transparent 68%);pointer-events:none}
        .documents-hero>*{position:relative;z-index:1}
        .documents-hero h1{max-width:850px;margin:9px 0;font-size:clamp(38px,5vw,68px);line-height:.98}
        .documents-hero p{max-width:720px;margin:0;color:rgba(255,255,255,.62);line-height:1.65}
        .documents-tabs{display:flex;gap:8px;margin:18px 0;overflow-x:auto}
        .documents-tabs a{flex:0 0 auto;padding:9px 13px;border:1px solid rgba(255,255,255,.09);border-radius:999px;color:rgba(255,255,255,.56);font-size:11px;font-weight:800}
        .documents-tabs a.active{border-color:rgba(249,115,22,.45);background:rgba(249,115,22,.12);color:#ffad63}
        .documents-toolbar{display:flex;align-items:center;justify-content:space-between;gap:16px;margin:20px 0}
        .documents-search{display:flex;flex:1;max-width:660px;height:48px;border:1px solid rgba(255,255,255,.1);border-radius:15px;background:#0d0d0f;overflow:hidden}
        .documents-search input{flex:1;min-width:0;padding:0 16px;border:0;outline:0;background:transparent;color:#fff}
        .documents-search button{padding:0 18px;border:0;border-left:1px solid rgba(249,115,22,.18);background:rgba(249,115,22,.09);color:#ffad63;font-weight:850}
        .documents-count{color:rgba(255,255,255,.4);font-size:11px}
        .documents-layout{display:grid;grid-template-columns:minmax(320px,.72fr) minmax(0,1.28fr);gap:16px;align-items:start}
        .document-create-panel,.document-list-panel{padding:22px;border:1px solid rgba(255,255,255,.075);border-radius:22px;background:linear-gradient(145deg,rgba(17,17,18,.97),rgba(8,8,9,.99))}
        .document-create-panel{position:sticky;top:88px}
        .document-create-panel h2,.document-list-panel h2{margin:5px 0 4px}
        .document-create-panel>p,.document-list-panel>header p{margin:0 0 18px;color:rgba(255,255,255,.48);font-size:12px;line-height:1.55}
        .document-form{display:grid;gap:10px}
        .document-form label{display:grid;gap:6px;color:rgba(255,255,255,.62);font-size:10px;font-weight:800;letter-spacing:.04em}
        .document-form input,.document-form select,.document-form textarea{width:100%;min-width:0;padding:12px 13px;border:1px solid rgba(255,255,255,.1);border-radius:11px;outline:none;background:#09090a;color:#fff}
        .document-form input:focus,.document-form select:focus,.document-form textarea:focus{border-color:rgba(249,115,22,.48);box-shadow:0 0 0 3px rgba(249,115,22,.06)}
        .document-form textarea{min-height:88px;resize:vertical}
        .document-form .meeting-fields{display:grid;gap:10px;padding:12px;border:1px solid rgba(249,115,22,.12);border-radius:13px;background:rgba(249,115,22,.035)}
        .document-form small{color:rgba(255,255,255,.36);line-height:1.5}
        .document-form button{min-height:46px;border:1px solid rgba(255,158,73,.45);border-radius:12px;background:linear-gradient(180deg,#ff9637,#f97316);color:#130b05;font-weight:900}
        .document-records{display:grid;gap:10px}
        .document-card{padding:17px;border:1px solid rgba(255,255,255,.075);border-radius:16px;background:#0b0b0c}
        .document-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:15px}
        .document-card-head h3{margin:5px 0;font-size:18px}
        .document-type{display:inline-flex;padding:5px 8px;border:1px solid rgba(249,115,22,.2);border-radius:999px;background:rgba(249,115,22,.07);color:#ff9a46;font-size:8px;font-weight:900;letter-spacing:.09em;text-transform:uppercase}
        .document-meta{display:flex;flex-wrap:wrap;gap:7px 13px;color:rgba(255,255,255,.39);font-size:10px}
        .document-summary{margin:13px 0;color:rgba(255,255,255,.67);font-size:12px;line-height:1.65}
        .minutes-detail{display:grid;gap:8px;margin:12px 0;padding:12px;border-left:2px solid rgba(249,115,22,.45);background:rgba(249,115,22,.035)}
        .minutes-detail div{display:grid;gap:3px}
        .minutes-detail b{color:#ffad63;font-size:9px;text-transform:uppercase;letter-spacing:.08em}
        .minutes-detail span{color:rgba(255,255,255,.58);font-size:11px;white-space:pre-wrap}
        .document-actions{display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin-top:14px}
        .document-actions a,.document-actions button{display:inline-flex;min-height:34px;align-items:center;justify-content:center;padding:0 11px;border:1px solid rgba(255,255,255,.1);border-radius:9px;background:rgba(255,255,255,.025);color:#fff;font-size:10px;font-weight:800}
        .document-actions a:hover{border-color:rgba(249,115,22,.32);color:#ffad63}
        .document-actions .delete-document{border-color:rgba(251,113,133,.17);background:rgba(251,113,133,.05);color:#fda4af}
        .documents-empty{padding:36px;border:1px dashed rgba(255,255,255,.1);border-radius:16px;color:rgba(255,255,255,.42);text-align:center}
        .documents-pagination{display:flex;align-items:center;justify-content:center;gap:10px;margin-top:18px}
        .documents-pagination a{padding:9px 12px;border:1px solid rgba(255,255,255,.1);border-radius:9px;font-size:10px}
        .documents-pagination a[aria-disabled="true"]{pointer-events:none;opacity:.35}
        .documents-pagination span{color:rgba(255,255,255,.42);font-size:10px}
        .documents-error{margin:18px 0;padding:14px;border:1px solid rgba(251,113,133,.3);border-radius:12px;background:rgba(251,113,133,.08);color:#fecdd3}
        @media(max-width:960px){.documents-layout{grid-template-columns:1fr}.document-create-panel{position:static}}
        @media(max-width:620px){.documents-page{padding-block:12px 100px}.documents-hero{padding:25px 20px;border-radius:20px}.documents-toolbar{align-items:flex-start;flex-direction:column}.documents-search{width:100%;max-width:none}.document-create-panel,.document-list-panel{padding:16px;border-radius:18px}.document-card-head{flex-direction:column}.documents-count{padding-left:2px}}
      `}</style>

      <div className="content documents-page">
        <section className="documents-hero">
          <span className="eyebrow">PROJECT RECORDS</span>
          <h1>Minutes, decisions and documents — in one room.</h1>
          <p>
            Keep the project memory inside FACKTS Music. Meeting minutes, briefs,
            agreements, reports and working documents stay attached to {project.name}.
          </p>
        </section>

        <nav className="documents-tabs" aria-label="Document views">
          <Link className={view === "all" ? "active" : ""} href={linkFor(1, "all")}>All Records</Link>
          <Link className={view === "minutes" ? "active" : ""} href={linkFor(1, "minutes")}>Meeting Minutes</Link>
          <Link className={view === "documents" ? "active" : ""} href={linkFor(1, "documents")}>Project Documents</Link>
        </nav>

        <div className="documents-toolbar">
          <form className="documents-search" method="get">
            <input name="q" defaultValue={q} placeholder="Search minutes, briefs, reports or decisions…" />
            {view !== "all" && <input type="hidden" name="view" value={view} />}
            <button>Search</button>
          </form>
          <span className="documents-count">
            Showing {count ? from + 1 : 0}–{Math.min(from + PAGE_SIZE, count || 0)} of {count || 0}
          </span>
        </div>

        {error && (
          <div className="documents-error">
            Documents storage has not been initialised yet. Run the supplied
            Supabase migration before using this page. Database message: {error.message}
          </div>
        )}

        <section className="documents-layout">
          <article className="document-create-panel">
            <span className="eyebrow">ADD PROJECT RECORD</span>
            <h2>Capture the record.</h2>
            <p>
              Use Meeting Minutes for formal meeting records. Use the other types
              for project documents and reference material.
            </p>

            <form action={createProjectDocument} className="document-form">
              <label>
                Record type
                <select name="document_type" defaultValue="meeting_minutes" required>
                  <option value="meeting_minutes">Meeting Minutes</option>
                  <option value="brief">Project Brief</option>
                  <option value="agreement">Agreement</option>
                  <option value="report">Report</option>
                  <option value="reference">Reference</option>
                  <option value="other">Other</option>
                </select>
              </label>

              <label>
                Title
                <input name="title" placeholder="e.g. Project 001 Producers Meeting" required />
              </label>

              <div className="meeting-fields">
                <label>
                  Meeting date
                  <input type="date" name="meeting_date" />
                </label>

                <label>
                  Attendees
                  <textarea name="attendees" placeholder="Names separated by commas or new lines" />
                </label>

                <label>
                  Decisions made
                  <textarea name="decisions" placeholder="What was agreed?" />
                </label>

                <label>
                  Action items
                  <textarea name="action_items" placeholder="Who needs to do what next?" />
                </label>
              </div>

              <label>
                Summary / notes
                <textarea name="summary" placeholder="The key context, discussion or document description" />
              </label>

              <label>
                Upload document
                <input
                  type="file"
                  name="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,image/jpeg,image/png,image/webp"
                />
                <small>PDF, Word, Excel, PowerPoint, text or image. Maximum 25 MB.</small>
              </label>

              <label>
                External document link
                <input type="url" name="external_url" placeholder="https://drive.google.com/…" />
                <small>Optional. Useful for a Google Doc, Drive file or other controlled source.</small>
              </label>

              <button type="submit">Save Project Record</button>
            </form>
          </article>

          <article className="document-list-panel">
            <header>
              <span className="eyebrow">
                {view === "minutes" ? "MEETING MINUTES" : view === "documents" ? "PROJECT DOCUMENTS" : "PROJECT MEMORY"}
              </span>
              <h2>{project.name}</h2>
              <p>15 records per page. Search and switch between formal minutes and the wider document library.</p>
            </header>

            <div className="document-records">
              {!documents.length && !error && (
                <div className="documents-empty">
                  No records found here yet.
                </div>
              )}

              {documents.map((document: any) => {
                const creator = Array.isArray(document.profiles) ? document.profiles[0] : document.profiles;
                const author = creator?.stage_name || creator?.full_name || "Project member";
                const isOwner = document.created_by === user.id;
                const canDelete = isOwner || canManage;

                return (
                  <article className="document-card" key={document.id}>
                    <div className="document-card-head">
                      <div>
                        <span className="document-type">
                          {TYPE_LABELS[document.document_type] || "Project Record"}
                        </span>
                        <h3>{document.title}</h3>
                        <div className="document-meta">
                          <span>Added by {author}</span>
                          {document.meeting_date && <span>Meeting: {readableDate(document.meeting_date)}</span>}
                          <span>{new Intl.DateTimeFormat("en-KE", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(document.created_at))}</span>
                          {document.file_name && <span>{document.file_name}{fileSize(document.file_size) ? ` · ${fileSize(document.file_size)}` : ""}</span>}
                        </div>
                      </div>
                    </div>

                    {document.summary && <p className="document-summary">{document.summary}</p>}

                    {document.document_type === "meeting_minutes" && (
                      <div className="minutes-detail">
                        {!!document.attendees?.length && (
                          <div>
                            <b>Attendees</b>
                            <span>{document.attendees.join(" · ")}</span>
                          </div>
                        )}
                        {document.decisions && (
                          <div>
                            <b>Decisions</b>
                            <span>{document.decisions}</span>
                          </div>
                        )}
                        {document.action_items && (
                          <div>
                            <b>Action Items</b>
                            <span>{document.action_items}</span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="document-actions">
                      {document.signedUrl && (
                        <a href={document.signedUrl} target="_blank" rel="noreferrer">Open File ↗</a>
                      )}
                      {document.external_url && (
                        <a href={document.external_url} target="_blank" rel="noreferrer">Open External Link ↗</a>
                      )}
                      {canDelete && (
                        <form action={deleteProjectDocument}>
                          <input type="hidden" name="document_id" value={document.id} />
                          <button type="submit" className="delete-document">Remove</button>
                        </form>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>

            {totalPages > 1 && (
              <nav className="documents-pagination" aria-label="Document pages">
                <Link aria-disabled={page <= 1} href={linkFor(Math.max(1, page - 1))}>Previous</Link>
                <span>Page {page} of {totalPages}</span>
                <Link aria-disabled={page >= totalPages} href={linkFor(Math.min(totalPages, page + 1))}>Next</Link>
              </nav>
            )}
          </article>
        </section>
      </div>
    </AppShell>
  );
}
