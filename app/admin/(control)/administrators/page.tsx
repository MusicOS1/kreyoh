import Link from "next/link";
import {createAdminClient} from "../../../../lib/supabase/admin";
import {isSuperAdmin,requireControlRoomPermission} from "../../../../lib/controlRoom";
import AdminGrantAccessForm from "../../../../components/AdminGrantAccessForm";
import AdminRevokeAccessForm from "../../../../components/AdminRevokeAccessForm";

type Grant={user_id:string;active:boolean;permissions:string[]};
type Person={id:string;full_name:string|null;stage_name:string|null;email:string|null};
const nameOf=(p:Person|undefined|null)=>p?.stage_name||p?.full_name||p?.email||"Member";

export default async function PlatformAdministrators({
 searchParams,
}:{searchParams:Promise<{q?:string;admin_user?:string}>}){
 const actor=await requireControlRoomPermission("people");
 const full=await isSuperAdmin(actor.id);
 const params=await searchParams;
 if(!full)return <main className="control-admin-directory">
   <header className="control-admin-page-header"><span className="control-eyebrow">CONTROL ROOM / ADMINISTRATION</span>
     <h1>Platform administrators</h1><p>Control Room permissions are separate from project memberships.</p></header>
   <section className="control-panel control-admin-access-restricted" role="status">
     <h2>Administrator appointments are restricted</h2>
     <p>Only an existing full-access administrator may appoint, change or revoke platform access.</p>
     <Link href="/admin/users">People & access →</Link>
   </section>
 </main>;
 const admin=createAdminClient();
 const q=(params.q||"").trim().replace(/[,%()]/g," ").slice(0,75);
 const picked=/^[0-9a-fA-F-]{36}$/.test(params.admin_user||"")?params.admin_user||"":"";
 let search=admin.from("profiles").select("id,full_name,stage_name,email")
   .order("created_at",{ascending:false}).limit(75);
 if(q)search=search.or("full_name.ilike.%"+q+"%,stage_name.ilike.%"+q+"%,email.ilike.%"+q+"%");
 const [found,assigned]=await Promise.all([
   search,admin.from("control_room_admins").select("user_id,active,permissions").order("created_at",{ascending:false}),
 ]);
 const grants=(assigned.data||[]) as Grant[];
 const ids=[...new Set([...grants.map(g=>g.user_id),...(picked?[picked]:[])])];
 const accounts=ids.length?await admin.from("profiles").select("id,full_name,stage_name,email").in("id",ids):
   {data:[] as Person[],error:null};
 const byId=new Map(((accounts.data||[]) as Person[]).map(p=>[p.id,p]));
 const person=picked?byId.get(picked)||null:null;
 const current=grants.find(g=>g.user_id===picked);
 const match=(found.data||[]) as Person[];
 return <main className="control-admin-directory">
   <header className="control-admin-page-header">
     <span className="control-eyebrow">CONTROL ROOM / PLATFORM GOVERNANCE</span>
     <h1>Platform administrators</h1>
     <p>Appoint administrators, manage their permissions and revoke access without adding
       anyone to a music project.</p>
     <Link href="/admin/users">People & access →</Link>
   </header>
   <section className="control-panel control-admin-lookup">
     <header><div><span className="control-eyebrow">APPOINTMENT</span><h2>Choose an existing account</h2></div></header>
     <form method="get" action="/admin/administrators" className="control-admin-search">
       <label htmlFor="admin-search">Search by name or email</label>
       <div><input id="admin-search" name="q" type="search" defaultValue={q} maxLength={75}
         placeholder="Search registered FACKTS Music accounts"/>
         <button type="submit">Find account</button></div>
     </form>
     {found.error?<p role="alert">Unable to search accounts right now.</p>:
       <div className="control-admin-search-results">{match.slice(0,25).map(p=>
         <Link key={p.id} href={"/admin/administrators?admin_user="+encodeURIComponent(p.id)+"#grant-admin"}>
           <strong>{nameOf(p)}</strong><small>{p.email||"No email"}</small>
         </Link>)}
         {!match.length&&<p>No matching accounts.</p>}
       </div>}
     {person&&<div id="grant-admin" className="control-admin-selected">
       <h3>Administrator permissions for {nameOf(person)}</h3>
       {current?.active&&current.permissions.includes("all")?
         <p className="control-admin-full-access">This account already has full platform authority.
           Use the access register below to review or disable it. Full access cannot be silently replaced
           by a smaller selection.</p>:
         <AdminGrantAccessForm key={person.id} userId={person.id}
           name={nameOf(person)} permissions={current?.active?current.permissions:[]}/>}
     </div>}
     {picked&&!person&&<p role="alert">Account not found.</p>}
   </section>
   <section className="control-panel control-admin-active-list">
     <header><div><span className="control-eyebrow">ACCESS REGISTER</span><h2>Existing administrators</h2></div>
       <strong>{assigned.error?"—":grants.filter(g=>g.active).length} active</strong></header>
     {assigned.error||accounts.error?<p role="alert">Unable to load administrator records.</p>:
       <div className="control-admin-grants">{grants.length===0?<p>No administrator grants found.</p>:
         grants.map(grant=>{
           const p=byId.get(grant.user_id), display=nameOf(p);
           return <article key={grant.user_id}>
             <span><strong>{display}</strong>
               <small>{grant.active?(grant.permissions||[]).join(" · "):"Access disabled"}</small></span>
             <div className="control-admin-register-actions">
               <Link href={"/admin/administrators?admin_user="+encodeURIComponent(grant.user_id)+"#grant-admin"}>
                 Review access</Link>
               {grant.active&&(grant.user_id===actor.id?
                 <small className="control-admin-protected">Your account · protected</small>:
                 <AdminRevokeAccessForm userId={grant.user_id} name={display}/>)}
             </div>
           </article>;
         })}</div>}
   </section>
 </main>;
}
