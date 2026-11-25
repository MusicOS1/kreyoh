"use server";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {requireControlRoomPermission} from "../../../../lib/controlRoom";
import {createAdminClient} from "../../../../lib/supabase/admin";
import {financeWritesEnabled,FINANCE_BOOKS} from "../../../../lib/financeBackoffice";
import {isPurposeAllowedForPaymentMode} from "../../../../lib/paystackPaymentPolicy";

const read=(f:FormData,key:string)=>String(f.get(key)||"").trim();
const uuid=/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const purposeNames=["recording_session","production_service"];

function requireWriteActivation(){
 if(!financeWritesEnabled())throw new Error("Financial entries and new payment links are not activated. Review the preview and enable Finance Back Office writes in production after the migration.");
}
export async function recordFinanceBookEntry(formData:FormData){
 const actor=await requireControlRoomPermission("finance");
 requireWriteActivation();
 const slug=read(formData,"book_slug");
 if(!FINANCE_BOOKS.some(b=>b.slug===slug))throw new Error("Choose an approved account.");
 const type=read(formData,"entry_type");
 const amount=Number(read(formData,"amount_kes"));
 const category=read(formData,"category");
 const description=read(formData,"description");
 const date=read(formData,"entry_date");
 const reference=read(formData,"reference");
 if(!["income","expense"].includes(type))throw new Error("Choose money in or money out.");
 if(!Number.isFinite(amount)||amount<=0||amount>10000000||Math.round(amount*100)!==amount*100)
  throw new Error("Enter a valid amount in KES, with no more than two decimal places.");
 if(category.length<2||category.length>90||description.length<3||description.length>500)
  throw new Error("Add a clear category and explanation.");
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date)))throw new Error("Choose a valid transaction date.");
 if(reference.length>150)throw new Error("Reference is too long.");
 const admin=createAdminClient();
 const {data:book,error:bookError}=await admin.from("finance_books")
  .select("id").eq("slug",slug).maybeSingle();
 if(bookError||!book)throw new Error("This finance account has not been activated.");
 const {data:entry,error}=await admin.from("finance_book_entries")
  .insert({book_id:book.id,entry_type:type,amount_kes:amount,category,description,entry_date:date,
    reference:reference||null,status:"draft",created_by:actor.id}).select("id").single();
 if(error||!entry)throw new Error("Could not save the draft. No money has been recorded.");
 const {error:auditError}=await admin.from("platform_events").insert({
  user_id:actor.id,event_name:"finance_book_draft_created",category:"finance",entity_type:"finance_book_entry",entity_id:entry.id,
  metadata:{book_slug:slug,amount_kes:amount,entry_type:type}});
 if(auditError)console.error("finance-entry-audit-failure",auditError.code);
 revalidatePath("/finance-office");
 revalidatePath("/finance-office/books/"+slug);
 if(slug==="fackts_music_platform")revalidatePath("/finance-office/platform");
 redirect(slug==="fackts_music_platform"?"/finance-office/platform?created=1":"/finance-office/books/"+slug+"?created=1");
}
export async function postFinanceBookEntry(formData:FormData){
 const actor=await requireControlRoomPermission("finance");
 requireWriteActivation();
 const slug=read(formData,"book_slug"),entryId=read(formData,"entry_id");
 if(!FINANCE_BOOKS.some(b=>b.slug===slug)||!uuid.test(entryId))throw new Error("Invalid finance entry.");
 const admin=createAdminClient();
 const {data:book}=await admin.from("finance_books").select("id").eq("slug",slug).maybeSingle();
 if(!book)throw new Error("Account not found.");
 const {data:updated,error}=await admin.from("finance_book_entries")
  .update({status:"posted",posted_by:actor.id,posted_at:new Date().toISOString()})
  .eq("id",entryId).eq("book_id",book.id).eq("status","draft").select("id").maybeSingle();
 if(error||!updated)throw new Error("Cannot confirm this entry. It may already be posted. Refresh before retrying.");
 const {error:auditError}=await admin.from("platform_events").insert({
  user_id:actor.id,event_name:"finance_book_entry_posted",category:"finance",entity_type:"finance_book_entry",entity_id:entryId,
  metadata:{book_slug:slug}});
 if(auditError)console.error("finance-post-audit-failure",auditError.code);
 revalidatePath("/finance-office");revalidatePath("/finance-office/books/"+slug);
 if(slug==="fackts_music_platform")revalidatePath("/finance-office/platform");
}
export async function createCentralServiceInvoice(formData:FormData){
 const actor=await requireControlRoomPermission("finance");
 requireWriteActivation();
 const projectId=read(formData,"project_id"),purpose=read(formData,"purpose");
 const description=read(formData,"description"),email=read(formData,"payer_email").toLowerCase();
 const amount=Number(read(formData,"amount_kes"));
 const mode=process.env.PAYSTACK_MODE==="live"?"live":"test";
 if(!uuid.test(projectId)||!purposeNames.includes(purpose)||!isPurposeAllowedForPaymentMode(purpose,mode))
  throw new Error("Only approved recording and production service payments may use this flow.");
 if(description.length<3||description.length>240||!Number.isSafeInteger(amount)||amount<3||amount>150000)
  throw new Error("Give the service, description and a KES 3–150,000 integer amount.");
 if(email&&(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254))
  throw new Error("Enter a valid payer email.");
 const admin=createAdminClient();
 const {data:project,error:projectError}=await admin.from("projects").select("id,status")
  .eq("id",projectId).maybeSingle();
 if(projectError||!project||project.status!=="active")throw new Error("The project is not active.");
 const {data:invoice,error}=await admin.from("project_payment_invoices")
  .insert({project_id:projectId,purpose,description,amount_kes:amount,payer_email:email||null,
    created_by:actor.id}).select("public_token").single();
 if(error||!invoice)throw new Error("Could not save the invoice. No payment link has been issued.");
 const {error:auditError}=await admin.from("platform_events").insert({
  user_id:actor.id,project_id:projectId,event_name:"central_service_invoice_created",
  category:"finance",metadata:{purpose,amount_kes:amount}});
 if(auditError)console.error("central-service-invoice-audit-failure",auditError.code);
 revalidatePath("/finance-office/projects/"+projectId);
 redirect("/finance-office/projects/"+projectId+"?created="+invoice.public_token);
}
