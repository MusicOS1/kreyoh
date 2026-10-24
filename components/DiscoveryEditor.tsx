"use client";
import {useActionState} from 'react';
import {backgroundFormAction} from "../lib/backgroundInteraction";
import type {DiscoveryItem} from '../lib/discoveryContent';
export default function DiscoveryEditor({item}:{item?:DiscoveryItem}){
 const[state,action,pending]=useActionState(backgroundFormAction<{message:string;id?:string;removed?:boolean}>("editorial",{message:''}),{message:''});
 if(state.removed)return <p role="status">{state.message}</p>;
 return <form action={action} className="discovery-editor"><input type="hidden" name="id" value={state.id||item?.id||''}/><label>Section<select name="kind" defaultValue={item?.kind||'show'}><option value="show">Shows & sessions</option><option value="feature">Featured story / announcement</option></select></label><label>Title<input name="title" required maxLength={120} defaultValue={item?.title}/></label><label>Description<textarea name="description" maxLength={600} defaultValue={item?.description}/></label><label>Artwork URL<input type="url" name="image" placeholder="https://…" defaultValue={item?.image}/></label><label>Watch / details URL<input type="url" name="url" placeholder="https://…" defaultValue={item?.url}/></label><label>Display order<input name="position" type="number" min={0} max={999} defaultValue={item?.position||0}/></label><label><input name="published" type="checkbox" defaultChecked={item?.published}/> Show publicly</label><button disabled={pending} name="intent" value="save">{pending?'Saving…':'Save content'}</button>{(item||state.id)&&<button disabled={pending} name="intent" value="delete" formNoValidate onClick={e=>{if(!confirm('Remove this content item?'))e.preventDefault();}}>Delete</button>}{state.message&&<p role="status">{state.message}</p>}</form>;
}
