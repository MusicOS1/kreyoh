'use client';
import Link from 'next/link';
import {useState} from 'react';
import SplitPlanEditor,{SplitAction,SplitUpdateContext} from './SplitPlanEditor';
import {creatorDisplayName} from '../lib/profileIdentity';
export default function SplitPanel({projectId,track,userId,canManage,members,initial}:{projectId:string;track:any;userId:string;canManage:boolean;members:any[];initial:{rows:any[];version:number;status:string}}){
 const[state,setState]=useState(initial),[notice,setNotice]=useState('');
 const {rows,version,status}=state;const context={projectId,trackId:track.id,version};
 const total=rows.reduce((sum:number,row:any)=>sum+Math.round(Number(row.percentage)*100),0)/100;
 const first=(value:any)=>Array.isArray(value)?value[0]:value;
 return <SplitUpdateContext.Provider value={result=>{if(result.snapshot)setState(result.snapshot);if(result.success)setNotice(result.success);}}><section className="panel split-detail"><Link href="/splits">← All songs</Link><h2>{track.working_title}</h2><p><strong>{total.toFixed(2)}% allocated</strong> · {String(status).replaceAll('_',' ')} · Version {version}</p><Link href={`/track-records/${track.id}`}>Song details, credits & files →</Link>
 <p>Review the full proposal before confirming your share. A revision or change request resets all approvals.</p>{notice&&<p role="status">{notice}</p>}
 <div className="split-table-wrap"><table><thead><tr><th>Contributor</th><th>Role</th><th>Share</th><th>Status</th></tr></thead><tbody>{rows.map(row=><tr key={row.id}><td>{creatorDisplayName(first(row.profiles))}{row.contributor_id===userId?' (you)':''}</td><td>{row.contribution_role}</td><td>{row.percentage}%</td><td>{row.status.replaceAll('_',' ')}</td></tr>)}</tbody></table></div>
 {!rows.length&&<p>No shares drafted yet. Project management can add the contributors below.</p>}
 {rows.filter(row=>row.contributor_id===userId).map(row=><div key={`${row.id}-${version}`} className="split-my-share">{row.status==='awaiting_confirmation'&&<SplitAction context={context} operation="confirm" splitId={row.id} label={`Confirm my ${row.percentage}% (${row.contribution_role})`}/>} {status!=='draft'&&<details><summary>Request a change to my share</summary><SplitAction context={context} operation="request_change" splitId={row.id} label="Send change request"/></details>}</div>)}
 {canManage&&<details className="split-edit-disclosure" open={status==='draft'}><summary>Edit allocation table</summary><SplitPlanEditor key={`${track.id}-${version}`} context={context} status={status} members={members} initialRows={rows.map(row=>({contributor_id:row.contributor_id,contribution_role:row.contribution_role,percentage:String(row.percentage)}))}/></details>}
 </section></SplitUpdateContext.Provider>;
}
