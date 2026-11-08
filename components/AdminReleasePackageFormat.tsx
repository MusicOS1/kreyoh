"use client";
import {useActionState,useEffect} from "react";
import {useRouter} from "next/navigation";
import {changeReleasePackageFormat,type PackageFormatState} from "../app/admin/(control)/releases/packageActions";

const initial:PackageFormatState={ok:false,message:""};
const formats=[
 {value:"project",name:"Project"},
 {value:"ep",name:"EP"},
 {value:"mixtape",name:"Mixtape"},
 {value:"album",name:"Album"},
 {value:"lp",name:"LP (Long Play)"}
];
export default function AdminReleasePackageFormat({id,format}:{id:string;format:string}){
 const [state,action,pending]=useActionState(changeReleasePackageFormat,initial);
 const router=useRouter();
 useEffect(()=>{if(state.ok)router.refresh()},[state.ok,state.message,router]);
 return <form action={action} className="fm-package-format-form">
  <input type="hidden" name="package_id" value={id}/>
  <label>Release category
   <select name="format" key={format} defaultValue={format} disabled={pending}>
    {formats.map(item=><option key={item.value} value={item.value}>{item.name}</option>)}
   </select>
  </label>
  <button type="submit" disabled={pending}>{pending?"Saving…":"Save category"}</button>
  {state.message&&<p role="status" className={state.ok?"fm-package-success":"fm-package-error"}>{state.message}</p>}
 </form>;
}
