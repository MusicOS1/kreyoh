import {NextResponse} from "next/server";
import {requireControlRoomPermission} from "../../../../lib/controlRoom";
import {loadFinanceOfficeData} from "../../../../lib/financeOfficeData";
export const dynamic="force-dynamic";
const safe=(v:unknown)=>{
 const raw=String(v??"").replace(/[\r\n\t]+/g," ").trim();
 const escaped=/^[=+@\-]/.test(raw)?"'"+raw:raw;
 return '"'+escaped.replaceAll('"','""')+'"';
};
export async function GET(){
 await requireControlRoomPermission("finance");
 const data=await loadFinanceOfficeData();
 const book=data.books.find((b:any)=>b.slug==="fackts_music_platform");
 if(!book||!data.bookDataAvailable)return NextResponse.json({error:"The FACKTS Music operating ledger has not been created. No export is available yet."},{status:409,headers:{"Cache-Control":"private, no-store"}});
 const entries=data.bookEntries.filter((e:any)=>e.book_id===book.id&&e.status==="posted");
 const lines=[["Date","Direction","Category","Description","Amount KES","Reference","Status"].map(safe).join(",")];
 for(const e of entries){lines.push([e.entry_date,e.entry_type,e.category||"",e.description,e.amount_kes,e.reference||"","posted"].map(safe).join(","));}
 const date=new Date().toISOString().slice(0,10).replaceAll("-","");
 return new NextResponse("\ufeff"+lines.join("\r\n")+"\r\n",{status:200,headers:{
  "Content-Type":"text/csv; charset=utf-8",
  "Content-Disposition":'attachment; filename="FACKTSMusicBusiness'+date+'.csv"',
  "Cache-Control":"private, no-store",
  "X-Content-Type-Options":"nosniff"
 }});
}
