import AppShell from "../../components/AppShell";
import {creatorDisplayName} from "../../lib/profileIdentity";
import {getWorkspace,hasAnyRole} from "../../lib/workspace";
import {
  inviteSupportMember,
  publishProjectUpdate,
  revokeSupportMember,
} from "./actions";

const first=(value:any)=>Array.isArray(value)?value[0]:value;
const MANAGE=["Super Admin","Admin","Project Lead"];

export default async function SupportTeamPage(){
  const{admin,user,project,membership,roles}=await getWorkspace();

  if(!project||!membership){
    return<AppShell><div className="content empty-state"><h2>Project access required</h2></div></AppShell>;
  }

  const canInvite=roles.includes("Artist")||hasAnyRole(roles,MANAGE);
  const canManage=hasAnyRole(roles,MANAGE);

  if(!canInvite&&!canManage){
    return<AppShell><div className="content empty-state"><h2>Support Team</h2><p>Your support relationships will appear here when an artist or project lead connects you.</p></div></AppShell>;
  }

  const[artistsR,relationshipsR,updatesR]=await Promise.all([
    admin.from("project_members")
      .select("user_id,profiles(full_name,stage_name,nickname),member_roles(roles(name))")
      .eq("project_id",project.id)
      .eq("status","active"),
    admin.from("project_support_relationships")
      .select("*,artist:profiles!project_support_relationships_artist_id_fkey(full_name,stage_name,nickname),support:profiles!project_support_relationships_support_user_id_fkey(full_name,stage_name,nickname,email)")
      .eq("project_id",project.id)
      .order("created_at",{ascending:false}),
    admin.from("project_updates")
      .select("*")
      .eq("project_id",project.id)
      .order("created_at",{ascending:false})
      .limit(8),
  ]);

  const artists=(artistsR.data||[]).filter((member:any)=>
    (member.member_roles||[]).some((row:any)=>first(row.roles)?.name==="Artist")
  );

  const relationships=relationshipsR.data||[];
  const updates=updatesR.data||[];
  const active=relationships.filter((item:any)=>item.status==="active");
  const pending=relationships.filter((item:any)=>item.status==="pending");

  return<AppShell>
    <style>{`
      .support-role-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:18px 0 24px}
      .support-role-grid article{padding:18px;border:1px solid rgba(255,255,255,.08);border-radius:16px;background:rgba(255,255,255,.025)}
      .support-role-grid h3{margin:8px 0}.support-role-grid p{color:rgba(255,255,255,.5);font-size:11px;line-height:1.55}
      .support-roster{display:grid;gap:10px}.support-person{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr) auto;gap:12px;align-items:center;padding:13px;border:1px solid rgba(255,255,255,.07);border-radius:12px}
      .support-person small{display:block;color:rgba(255,255,255,.42)}
      @media(max-width:850px){.support-role-grid{grid-template-columns:1fr}.support-person{grid-template-columns:1fr}}
    `}</style>

    <div className="content operations-page">
      <div className="heading">
        <div>
          <span className="eyebrow">{project.code} / SUPPORT NETWORK</span>
          <h1>Support Team</h1>
          <p>Artists can bring the people who actually help manage their music into the project—with clear roles, transparency and an audit trail.</p>
        </div>
      </div>

      <section className="support-role-grid">
        <article><span className="eyebrow">A&R</span><h3>Creative & repertoire oversight</h3><p>Track readiness, credits, rights, splits, sessions, issues, opportunities, finance visibility and project reports.</p></article>
        <article><span className="eyebrow">ARTIST MANAGER</span><h3>Career & project management</h3><p>Actions, sessions, opportunities, project economics, reporting and the decisions affecting the artist.</p></article>
        <article><span className="eyebrow">STUDIO OWNER</span><h3>Production environment</h3><p>Sessions, files, stems, production issues, project context, opportunity visibility, finance transparency and reports.</p></article>
      </section>

      {canInvite&&<details className="beat-intake-disclosure" open>
        <summary className="beat-intake-summary"><span>INVITE SUPPORT</span><strong>Add A&R, Artist Manager or Studio Owner</strong><small>They must already have a FACKTS Music account. Their project access starts only after they accept.</small><b>Open +</b></summary>
        <form action={inviteSupportMember} className="panel operations-form">
          {canManage&&<select name="artist_id" defaultValue={roles.includes("Artist")?user.id:""} required>
            <option value="" disabled>Which artist are they supporting?</option>
            {artists.map((artist:any)=><option key={artist.user_id} value={artist.user_id}>{creatorDisplayName(first(artist.profiles))}</option>)}
          </select>}
          {!canManage&&<input type="hidden" name="artist_id" value={user.id}/>}
          <select name="support_role" required defaultValue="">
            <option value="" disabled>Support role</option>
            <option value="A&R">A&R</option>
            <option value="Manager">Artist Manager</option>
            <option value="Studio Owner">Studio Owner</option>
          </select>
          <input name="email" type="email" required placeholder="Their FACKTS Music account email"/>
          <button>Send Support Invitation</button>
        </form>
      </details>}

      <section className="platform-home-section">
        <span className="eyebrow">ACTIVE SUPPORT</span><h2>Who is inside the project</h2>
        <div className="support-roster">
          {!active.length&&<p>No active support relationships yet.</p>}
          {active.map((item:any)=><article className="support-person" key={item.id}>
            <span><strong>{creatorDisplayName(first(item.support))}</strong><small>{item.support_role}</small></span>
            <span><small>Supporting</small><strong>{creatorDisplayName(first(item.artist))}</strong></span>
            {canManage&&<form action={revokeSupportMember}><input type="hidden" name="relationship_id" value={item.id}/><button className="member-remove-button">Revoke role</button></form>}
          </article>)}
        </div>
      </section>

      <section className="platform-home-section">
        <span className="eyebrow">PENDING INVITATIONS</span><h2>Waiting for acceptance</h2>
        <div className="support-roster">
          {!pending.length&&<p>No pending support invitations.</p>}
          {pending.map((item:any)=><article className="support-person" key={item.id}>
            <span><strong>{creatorDisplayName(first(item.support))}</strong><small>{first(item.support)?.email}</small></span>
            <span><strong>{item.support_role}</strong><small>Supporting {creatorDisplayName(first(item.artist))}</small></span>
            <em>Pending</em>
          </article>)}
        </div>
      </section>

      {canManage&&<details className="beat-intake-disclosure">
        <summary className="beat-intake-summary"><span>PROJECT UPDATE</span><strong>Tell everyone what changed</strong><small>One update becomes role-specific Inbox messages explaining how the change affects each person.</small><b>Open +</b></summary>
        <form action={publishProjectUpdate} className="panel operations-form">
          <input name="version_label" placeholder="Version / release label e.g. Sep 15 update"/>
          <input name="title" required placeholder="Update title"/>
          <textarea name="summary" required placeholder="What changed overall?"/>
          <textarea name="general_impact" placeholder="How does this affect ordinary project members?"/>
          <textarea name="impact_ar" placeholder="How does this affect A&R?"/>
          <textarea name="impact_manager" placeholder="How does this affect Artist Managers?"/>
          <textarea name="impact_studio_owner" placeholder="How does this affect Studio Owners?"/>
          <button>Publish Update to Everyone</button>
        </form>
      </details>}

      <section className="platform-home-section">
        <span className="eyebrow">UPDATE HISTORY</span><h2>What the project has communicated</h2>
        <div className="home-list">
          {!updates.length&&<p>No project updates published yet.</p>}
          {updates.map((update:any)=><div key={update.id}>
            <time>{new Date(update.created_at).toLocaleDateString("en-KE")}</time>
            <span><strong>{update.title}{update.version_label?` · ${update.version_label}`:""}</strong><small>{update.summary}</small></span>
          </div>)}
        </div>
      </section>
    </div>
  </AppShell>;
}
