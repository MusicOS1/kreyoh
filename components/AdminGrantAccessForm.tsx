"use client";
import {useActionState,useState} from "react";
import {savePlatformAdministrator} from "../app/admin/(control)/projectManagementActions";

const PERMISSIONS=[
 ["people","People & access"],["projects","Project administration"],["music","Music operations"],
 ["tasks","Tasks & assignments"],["sessions","Studio sessions"],["documents","Documents & minutes"],
 ["commercial","Sales & commercial opportunities"],["finance","Finance Back Office — all project accounts"],
 ["enquiries","Enquiries"],["intelligence","Voting & analytics"],
 ["reports","Project reports"],["system","System settings"],
] as const;
const PRESETS=[
 {id:"finance",label:"Finance leader",keys:["finance"] as string[],hint:"View all project finances and the FACKTS Music/Third Culture accounts. No creative or user-administration rights."},
 {id:"sales",label:"Sales & partnerships",keys:["commercial","enquiries"] as string[],hint:"Sales and enquiries only. No financial books or platform administrator settings."},
 {id:"operations",label:"Music operations admin",keys:["people","projects","music","tasks","sessions"] as string[],hint:"Manage platform operations without automatically granting Finance or full Super Admin access."},
 {id:"custom",label:"Custom permissions",keys:[] as string[],hint:"Choose exactly the areas this person needs."},
] as const;
export default function AdminGrantAccessForm({userId,name,permissions}:{
 userId:string;name:string;permissions:string[];
}){
 const [result,action,pending]=useActionState(savePlatformAdministrator,{error:"",success:""});
 const [selected,setSelected]=useState<string[]>(permissions.filter(p=>p!=="all"));
 const [preset,setPreset]=useState("custom");
 const hint=PRESETS.find(item=>item.id===preset)?.hint||"";
 return <form action={action} className="control-admin-grant-form">
  <input type="hidden" name="user_id" value={userId}/>
  <input type="hidden" name="active" value="true"/>
  <p>Granting Control Room access to <strong>{name}</strong>.
    <small>These are platform-team permissions, not music-project ownership or royalty rights. Saving replaces this person's existing scoped permissions.</small>
  </p>
  <label style={{display:"grid",gap:7,marginBottom:12}}>Choose a simple team role
   <select aria-label="Team role preset" value={preset} onChange={event=>{
     const value=event.target.value;setPreset(value);
     const found=PRESETS.find(item=>item.id===value);
     if(found&&value!=="custom")setSelected([...found.keys]);
   }}>
    {PRESETS.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}
   </select>
  </label>
  <p>{hint}</p>
  <fieldset className="control-permission-checks"><legend>Exactly what this person can manage</legend>
    {PERMISSIONS.map(([key,label])=><label key={key}>
      <input type="checkbox" name="permissions" value={key}
        checked={selected.includes(key)} onChange={event=>{
          setPreset("custom");
          setSelected(old=>event.target.checked?[...old,key]:old.filter(p=>p!==key));
        }}/>
      <span>{label}</span>
    </label>)}
  </fieldset>
  <button type="submit" disabled={pending||selected.length===0}>{pending?"Saving…":"Save team permissions"}</button>
  {result.error&&<p className="control-admin-feedback error" role="alert">{result.error}</p>}
  {result.success&&<p className="control-admin-feedback success" role="status">{result.success}</p>}
 </form>;
}
