"use client";
import {useActionState} from "react";
import {savePlatformAdministrator} from "../app/admin/(control)/projectManagementActions";
const PERMISSIONS=[
 ["people","People & access"],["projects","All projects & editing"],["music","Music operations"],
 ["tasks","Tasks & assignments"],["sessions","Studio sessions"],["documents","Documents & minutes"],
 ["commercial","Commercial opportunities"],["finance","Finance"],["enquiries","Enquiries"],
 ["intelligence","Voting & analytics"],["reports","Project reports"],["system","System settings"],
] as const;
export default function AdminGrantAccessForm({userId,name,permissions}:{
 userId:string;name:string;permissions:string[];
}){
 const [result,action,pending]=useActionState(savePlatformAdministrator,{error:"",success:""});
 return <form action={action} className="control-admin-grant-form">
  <input type="hidden" name="user_id" value={userId}/>
  <input type="hidden" name="active" value="true"/>
  <p>Granting Control Room access to <strong>{name}</strong>.
    <small>This replaces their existing scoped permissions. Music projects are unaffected.</small>
  </p>
  <fieldset className="control-permission-checks"><legend>Allowed administration areas</legend>
    {PERMISSIONS.map(([key,label])=><label key={key}>
      <input type="checkbox" name="permissions" value={key}
        defaultChecked={permissions.includes(key)}/>
      <span>{label}</span>
    </label>)}
  </fieldset>
  <button type="submit" disabled={pending}>{pending?"Saving…":"Save administrator permissions"}</button>
  {result.error&&<p className="control-admin-feedback error" role="alert">{result.error}</p>}
  {result.success&&<p className="control-admin-feedback success" role="status">{result.success}</p>}
 </form>;
}
