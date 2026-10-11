import 'server-only';
import {createAdminClient} from './supabase/admin';
export type DiscoveryItem={id:string;kind:'show'|'feature';title:string;description:string;image:string;url:string;published:boolean;position:number};
export async function discoveryContent(includeDrafts=false):Promise<DiscoveryItem[]>{
 const{data,error}=await createAdminClient().from('system_settings').select('setting_key,setting_value').like('setting_key','music_discovery_%');
 if(error)throw new Error('Could not load discovery content.');
 return (data||[]).map(x=>({...x.setting_value,id:x.setting_key} as DiscoveryItem)).filter(x=>includeDrafts||x.published===true).sort((a,b)=>(a.position||0)-(b.position||0));
}
