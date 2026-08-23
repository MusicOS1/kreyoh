import { createAdminClient } from "../../../../lib/supabase/admin";
import { updateEnquiryStatus } from "../actions";

export default async function AdminEnquiries({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const admin = createAdminClient();
  let query = admin.from("public_enquiries").select("*").order("created_at", { ascending: false }).limit(100);
  if (status && ["new", "reviewing", "responded", "closed"].includes(status)) query = query.eq("status", status);
  const { data: enquiries = [], error } = await query;
  if (error) throw new Error("Public enquiries could not be loaded.");
  const safeEnquiries = enquiries || [];
  return <>
    <section className="control-page-hero enquiries"><span className="control-eyebrow">PUBLIC RELATIONSHIPS</span><h1>Every conversation in view.</h1><p>Review contact messages and partnership proposals, record their progress and keep valuable opportunities from disappearing in inboxes.</p></section>
    <nav className="control-pills">{["all", "new", "reviewing", "responded", "closed"].map(item => <a key={item} className={(status || "all") === item ? "active" : ""} href={item === "all" ? "/admin/enquiries" : `/admin/enquiries?status=${item}`}>{item}</a>)}</nav>
    <section className="control-enquiry-grid">{!safeEnquiries.length && <article className="control-panel"><p className="control-empty">No enquiries in this view.</p></article>}{safeEnquiries.map((item: any) => <article className="control-panel control-enquiry-card" key={item.id}><header><div><span className="control-eyebrow">{item.enquiry_type}</span><h2>{item.subject || item.partnership_type || "New conversation"}</h2></div><span className="control-status">{item.status}</span></header><h3>{item.name}{item.organisation ? ` / ${item.organisation}` : ""}</h3><a href={`mailto:${item.email}`}>{item.email}</a>{item.phone && <a href={`tel:${item.phone}`}>{item.phone}</a>}<p>{item.message}</p><time>{new Date(item.created_at).toLocaleString("en-KE")}</time><form action={updateEnquiryStatus}><input type="hidden" name="enquiry_id" value={item.id}/><select name="status" defaultValue={item.status}><option value="new">New</option><option value="reviewing">Reviewing</option><option value="responded">Responded</option><option value="closed">Closed</option></select><button>Update status</button></form></article>)}</section>
  </>;
}
