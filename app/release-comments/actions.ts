"use server";

import {revalidatePath} from "next/cache";
import {communityAccount,uuidPattern} from "../../lib/community";
import {createAdminClient} from "../../lib/supabase/admin";

type DbComment={
  id:string;release_id:string;author_id:string;parent_id:string|null;
  body:string;created_at:string;deleted_at:string|null;
};
export type PublicReleaseComment={
  id:string;parentId:string|null;authorId:string;authorName:string;
  body:string;createdAt:string;deleted:boolean;
};

async function publishedRelease(admin:ReturnType<typeof createAdminClient>,releaseId:string){
  const {data,error}=await admin.from("music_weekly_chart").select("id").eq("id",releaseId).maybeSingle();
  if(error)throw new Error("Comments are unavailable. Try again shortly.");
  if(!data)throw new Error("This song is not available for comments.");
}

export async function listReleaseComments(releaseId:string):Promise<{ok:boolean;comments:PublicReleaseComment[];error?:string}>{
  try{
    if(!uuidPattern.test(releaseId))throw new Error("Invalid song.");
    const admin=createAdminClient();
    await publishedRelease(admin,releaseId);
    const {data,error}=await admin.from("music_release_comments")
      .select("id,release_id,author_id,parent_id,body,created_at,deleted_at")
      .eq("release_id",releaseId).order("created_at",{ascending:false}).limit(150);
    if(error)throw new Error("Could not load comments.");
    const rows=((data||[]) as DbComment[]).reverse();
    const ids=[...new Set(rows.map(row=>row.author_id))];
    const {data:profiles,error:profileError}=ids.length
      ?await admin.from("profiles").select("id,stage_name,full_name,nickname").in("id",ids)
      :{data:[],error:null};
    if(profileError)throw new Error("Could not load comments.");
    const names=new Map((profiles||[]).map(person=>[
      person.id,String(person.stage_name||person.nickname||person.full_name||"FACKTS listener").slice(0,80)
    ] as const));
    const visibleIds=new Set(rows.map(row=>row.id));
    return {ok:true,comments:rows.map(row=>({
      id:row.id,
      parentId:row.parent_id&&visibleIds.has(row.parent_id)?row.parent_id:null,
      authorId:row.author_id,authorName:names.get(row.author_id)||"FACKTS listener",
      body:row.deleted_at?"":row.body,createdAt:row.created_at,deleted:Boolean(row.deleted_at)
    }))};
  }catch(error){return {ok:false,comments:[],error:error instanceof Error?error.message:"Unable to load comments."};}
}

export async function postReleaseComment(releaseId:string,body:string,parentId:string|null=null):Promise<{ok:boolean;error?:string}>{
  try{
    if(!uuidPattern.test(releaseId))throw new Error("Choose a valid song.");
    if(typeof body!=="string"||!body.trim()||body.trim().length>600)
      throw new Error("Write a comment of up to 600 characters.");
    if(parentId!==null&&(!uuidPattern.test(parentId)))throw new Error("Invalid reply.");
    const {admin,user}=await communityAccount();
    await publishedRelease(admin,releaseId);
    if(parentId){
      const {data:parent,error}=await admin.from("music_release_comments")
        .select("id,release_id,parent_id,deleted_at").eq("id",parentId).maybeSingle();
      if(error||!parent||parent.release_id!==releaseId||parent.parent_id||parent.deleted_at)
        throw new Error("This comment is no longer available for replies.");
    }
    const minuteAgo=new Date(Date.now()-60_000).toISOString();
    const {count,error:limitError}=await admin.from("music_release_comments")
      .select("id",{head:true,count:"exact"}).eq("author_id",user.id).gte("created_at",minuteAgo);
    if(limitError)throw new Error("Comments are temporarily unavailable.");
    if((count||0)>=5)throw new Error("You've posted a few comments already. Try again in a minute.");
    const {error}=await admin.from("music_release_comments").insert({
      release_id:releaseId,author_id:user.id,parent_id:parentId,body:body.trim()
    });
    if(error)throw new Error("Could not post your comment.");
    revalidatePath("/billboard/"+releaseId);
    return {ok:true};
  }catch(error){
    return {ok:false,error:error instanceof Error?error.message:"Could not post your comment."};
  }
}

export async function deleteReleaseComment(id:string):Promise<{ok:boolean;error?:string}>{
  try{
    if(!uuidPattern.test(id))throw new Error("Invalid comment.");
    const {admin,user}=await communityAccount();
    const {data,error}=await admin.from("music_release_comments")
      .update({deleted_at:new Date().toISOString()})
      .eq("id",id).eq("author_id",user.id).is("deleted_at",null)
      .select("release_id").maybeSingle();
    if(error||!data)throw new Error("You can only delete your own comments.");
    revalidatePath("/billboard/"+data.release_id);
    return {ok:true};
  }catch(error){
    return {ok:false,error:error instanceof Error?error.message:"Could not delete comment."};
  }
}
