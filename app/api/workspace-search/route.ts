import {NextRequest} from "next/server";
import {getWorkspace} from "../../../lib/workspace";
import {createAdminClient} from "../../../lib/supabase/admin";
export const dynamic="force-dynamic";
export async function GET(request:NextRequest){
 const headers={"Cache-Control":"private, no-store"};
 const q=(new URL(request.url).searchParams.get("q")||"").trim().slice(0,64).replace(/[%,()]/g," ");
 if(q.length<2)return Response.json({items:[]},{headers});
 try{
 const workspace=await getWorkspace(),admin=createAdminClient();
 const items:{kind:string;title:string;href:string;subtitle:string}[]=[];
 for(const item of workspace.activeProjects||[]){
  const p=item as {name?:string;code?:string};
  if(((p.name||"")+" "+(p.code||"")).toLowerCase().includes(q.toLowerCase()))
   items.push({kind:"Project",title:p.name||p.code||"Project",href:"/projects",subtitle:"Your projects"});
 }
 const id=workspace.project?.id;
 const [artists,tracks,beats]=await Promise.all([
  admin.from("profiles").select("id,stage_name,public_slug").eq("profile_visibility","public").eq("account_status","active").contains("creator_types",["Artist"]).ilike("stage_name",`%${q}%`).limit(8),
  id?admin.from("tracks").select("id,title").eq("project_id",id).ilike("title",`%${q}%`).limit(12):Promise.resolve({data:[],error:null}),
  id?admin.from("beats").select("id,title,producer_name").eq("project_id",id).ilike("title",`%${q}%`).limit(12):Promise.resolve({data:[],error:null}),
 ]);
 for(const a of artists.data||[])items.push({kind:"Artist",title:a.stage_name||"Artist",subtitle:"Public artist",href:"/creators/"+encodeURIComponent(a.public_slug||a.id)});
 for(const t of tracks.data||[])items.push({kind:"Track",title:t.title||"Track",subtitle:"Selected project",href:"/tracks"});
 for(const b of beats.data||[])items.push({kind:"Beat",title:b.title||"Beat",subtitle:b.producer_name||"Selected project",href:"/beats?q="+encodeURIComponent(b.title||"")});
 return Response.json({items},{headers});
 }catch{return Response.json({items:[],error:"Search temporarily unavailable."},{status:503,headers})}
}
