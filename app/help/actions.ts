"use server";
import { getWorkspace } from "../../lib/workspace";
import { guideAnswer } from "../../lib/musicHelp";
import { generateNavigationAnswer } from "../../lib/musicHelpAI";
export type HelpState = {answer?:string; mode?:string; links?:Array<{title:string;href:string}>; question?:string};
export async function askMusicHelper(_state:HelpState, fd:FormData):Promise<HelpState> {
  const {admin,user,roles,membership}=await getWorkspace();
  const question=String(fd.get("question")||"").trim();
  if(!question || question.length>1000) return {answer:"Ask a question in up to 1,000 characters.",mode:"Guide"};
  const guide=guideAnswer(question);
  const key=process.env.OPENAI_API_KEY,model=process.env.OPENAI_HELPER_MODEL;
  if(process.env.FACKTS_AI_HELPER_ENABLED!=="true" || !key || !model || !membership) return {...guide,question,mode:"Guide"};
  const {data:allowed,error}=await admin.rpc("reserve_music_helper_request",{p_user:user.id});
  if(error || !allowed) return {...guide,question,mode:"Guide — AI unavailable or daily limit reached"};
  try { return {...guide,question,answer:await generateNavigationAnswer(question,roles,key,model),mode:"AI helper"}; }
  catch { return {...guide,question,mode:"Guide — AI temporarily unavailable"}; }
}
