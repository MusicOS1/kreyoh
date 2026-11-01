import 'server-only';
import {createAdminClient} from './supabase/admin';

export type PlayStat={release_id:string;lifetime_plays:number;period_plays:number;lifetime_listeners:number;period_listeners:number;lifetime_starts:number;period_starts:number;last_play_at:string|null};
export type ArtistAudience={credited_artist:string;songs:number;lifetime_plays:number;period_plays:number;lifetime_listeners:number;period_listeners:number;lifetime_starts:number;period_starts:number};
export type DayAudience={day:string;plays:number;unique_listeners:number;starts:number};
const numeric=(raw:any,fields:string[])=>Object.fromEntries(fields.map(key=>[key,Number(raw[key]||0)]));
export const kenyaToday=()=>new Date(Date.now()+3*3600000).toISOString().slice(0,10);
export function reportRange(input:{from?:string;to?:string},days=29){
 const to=kenyaToday(),from=new Date(new Date(to+'T12:00:00Z').getTime()-days*86400000).toISOString().slice(0,10);
 const valid=(v?:string)=>Boolean(v&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v+'T00:00:00Z')));
 const start=valid(input.from)?input.from!:from,end=valid(input.to)?input.to!:to;
 if(start>end||end>to||Date.parse(end)-Date.parse(start)>366*86400000)return {from,to};
 return {from:start,to:end};
}
export async function publicPlayStats(from:string,to:string){
 const {data,error}=await createAdminClient().rpc('public_music_play_stats',{p_from:from,p_to:to});
 if(error)throw new Error('Public play reporting is temporarily unavailable.');
 return ((data||[]) as any[]).map(row=>({...row,...numeric(row,['lifetime_plays','period_plays','lifetime_listeners','period_listeners','lifetime_starts','period_starts'])})) as PlayStat[];
}
export async function publicArtistAudience(from:string,to:string){
 const {data,error}=await createAdminClient().rpc('public_music_artist_audience',{p_from:from,p_to:to});
 if(error)throw new Error('Artist audience reporting is temporarily unavailable.');
 return ((data||[]) as any[]).map(row=>({...row,...numeric(row,['songs','lifetime_plays','period_plays','lifetime_listeners','period_listeners','lifetime_starts','period_starts'])})) as ArtistAudience[];
}
export async function publicPlatformAudience(from:string,to:string){
 const {data,error}=await createAdminClient().rpc('public_music_platform_audience',{p_from:from,p_to:to});
 if(error)throw new Error('Platform audience reporting is temporarily unavailable.');
 return {lifetime_listeners:Number(data?.[0]?.lifetime_listeners||0),period_listeners:Number(data?.[0]?.period_listeners||0)};
}
export async function publicDailyPlays(from:string,to:string){
 const {data,error}=await createAdminClient().rpc('public_music_daily_plays',{p_from:from,p_to:to});
 if(error)throw new Error('Daily public play reporting is temporarily unavailable.');
 return ((data||[]) as any[]).map(row=>({...row,...numeric(row,['plays','unique_listeners','starts'])})) as DayAudience[];
}
