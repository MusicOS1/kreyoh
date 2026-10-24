"use client";
import {useActionState} from "react";
import {saveProfessionalApplication} from "../app/professional-onboarding/actions";
type Application={id:string;profession:string;display_name:string;bio:string;skills:string[];
  portfolio_url:string|null;experience_years:number|null;status:string};
export default function ProfessionalApplicationForm({
 profession,current,defaults,editable,
}:{profession:string;current?:Application;defaults:{name:string;bio:string;skills:string[]};editable:boolean}){
  const [result,action,pending]=useActionState(saveProfessionalApplication,{error:"",success:""});
  return <form action={action}>
    <input type="hidden" name="profession" value={profession}/>
    <p><small>Applying as <strong>{profession}</strong>. Use the selector above to open a different profession.</small></p>
    <label>Professional or stage name
      <input name="display_name" maxLength={120} required defaultValue={current?.display_name||defaults.name} readOnly={!editable}/>
    </label>
    <label>About your work (projects and experience)
      <textarea name="bio" maxLength={2000} defaultValue={current?.bio||defaults.bio} readOnly={!editable}/>
    </label>
    <label>Skills / genres, comma separated
      <input name="skills" defaultValue={current?.skills?.join(", ")||defaults.skills.join(", ")} readOnly={!editable}/>
    </label>
    <label>Years of experience (optional)
      <input name="experience_years" type="number" min="0" max="80" defaultValue={current?.experience_years??""} readOnly={!editable}/>
    </label>
    <label>Portfolio link (optional)
      <input name="portfolio_url" type="url" maxLength={500} defaultValue={current?.portfolio_url||""} readOnly={!editable}/>
    </label>
    {editable?<div className="application-actions">
      <button type="submit" name="intent" value="save" disabled={pending} className="secondary">{pending?"Saving…":"Save draft"}</button>
      <button type="submit" name="intent" value="submit" disabled={pending}>{pending?"Submitting…":"Submit for review"}</button>
    </div>:<p>This application is locked at its current review stage.</p>}
    {result.error&&<p className="application-feedback" role="alert">{result.error}</p>}
    {result.success&&<p className="application-feedback" role="status">{result.success}</p>}
  </form>;
}
