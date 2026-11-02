"use server";

import {creatorDisplayName} from "../../lib/profileIdentity";
import {revalidatePath} from "next/cache";
import {getWorkspace,hasAnyRole} from "../../lib/workspace";
import {notifyUser} from "../../lib/projectNotifications";

const read=(fd:FormData,key:string)=>String(fd.get(key)||"").trim();
const ADMIN_ROLES=["Super Admin","Admin","Project Lead","Project Admin"];
const MONTHLY_FEE=2000;

function requireFinanceAdmin(roles:string[]){
  if(!hasAnyRole(roles,ADMIN_ROLES)){
    throw new Error("Only project administrators can edit project finance.");
  }
}

function transactionCode(){
  const date=new Date();
  const y=String(date.getFullYear()).slice(-2);
  const m=String(date.getMonth()+1).padStart(2,"0");
  const d=String(date.getDate()).padStart(2,"0");
  return `TXN-${y}${m}${d}-${crypto.randomUUID().replaceAll("-","").slice(0,7).toUpperCase()}`;
}

function memberCode(projectId:string,userId:string){
  let hash=0;
  const source=`${projectId}:${userId}`;
  for(let i=0;i<source.length;i++)hash=((hash<<5)-hash)+source.charCodeAt(i);
  return `FM-${Math.abs(hash).toString(16).toUpperCase().padStart(8,"0").slice(0,8)}`;
}

function monthStart(value:string){
  const match=/^(\d{4})-(\d{2})/.exec(value);
  if(!match)throw new Error("Choose a valid membership month.");
  return `${match[1]}-${match[2]}-01`;
}

export async function saveProjectBudget(fd:FormData){
  const{admin,user,project,roles}=await getWorkspace();
  if(!project)throw new Error("Project access required.");
  requireFinanceAdmin(roles);

  const amount=Number(read(fd,"budget_amount"));
  if(!Number.isFinite(amount)||amount<0)throw new Error("Enter a valid budget.");

  const{error}=await admin.from("project_budgets").upsert({
    project_id:project.id,
    budget_amount:amount,
    currency:read(fd,"currency")||"KES",
    updated_by:user.id,
    updated_at:new Date().toISOString()
  });
  if(error)throw new Error(error.message);
  revalidatePath("/finance");
}

export async function addProjectExpense(fd:FormData){
  const{admin,user,project,roles}=await getWorkspace();
  if(!project)throw new Error("Project access required.");
  requireFinanceAdmin(roles);

  const amount=Number(read(fd,"amount"));
  if(!Number.isFinite(amount)||amount<=0)throw new Error("Enter a valid expense.");

  const{error}=await admin.from("project_expenses").insert({
    project_id:project.id,
    track_id:read(fd,"track_id")||null,
    amount,
    currency:read(fd,"currency")||"KES",
    expense_date:read(fd,"expense_date")||new Date().toISOString().slice(0,10),
    category:read(fd,"category"),
    vendor:read(fd,"vendor")||null,
    payment_status:read(fd,"payment_status")||"committed",
    notes:read(fd,"notes")||null,
    created_by:user.id
  });

  if(error)throw new Error(error.message);
  revalidatePath("/finance");
}

export async function addRevenueRecord(fd:FormData){
  const{admin,user,project,roles}=await getWorkspace();
  if(!project)throw new Error("Project access required.");
  requireFinanceAdmin(roles);

  const amount=Number(read(fd,"amount"));
  if(!Number.isFinite(amount)||amount<0)throw new Error("Enter a valid amount.");

  const{error}=await admin.from("revenue_records").insert({
    project_id:project.id,
    track_id:read(fd,"track_id")||null,
    opportunity_id:read(fd,"opportunity_id")||null,
    revenue_source:read(fd,"revenue_source"),
    amount,
    currency:read(fd,"currency")||"KES",
    expected_date:read(fd,"expected_date")||null,
    received_date:read(fd,"received_date")||null,
    payment_status:read(fd,"payment_status")||"expected",
    notes:read(fd,"notes")||null,
    created_by:user.id
  });

  if(error)throw new Error(error.message);
  revalidatePath("/finance");
}

export async function recordMembershipPayment(fd:FormData):Promise<{id:string;code:string;alreadyRecorded:boolean}>{
  const{admin,user,project,roles}=await getWorkspace();
  if(!project)throw new Error("Project access required.");
  requireFinanceAdmin(roles);

  const memberUserId=read(fd,"member_user_id");
  const amount=Number(read(fd,"amount"));
  const method=read(fd,"payment_method")||"Other";
  const reference=read(fd,"payment_reference");
  const period=monthStart(read(fd,"payment_period")||new Date().toISOString().slice(0,7));
  const token=read(fd,"payment_entry_token");
  if(token&&!/^[0-9a-f-]{36}$/i.test(token))throw new Error("Payment form expired. Refresh and try again.");
  const incomingCode=token?"TXN-"+token.replaceAll("-","").toUpperCase():transactionCode();

  if(!memberUserId)throw new Error("Choose a project member.");
  if(!Number.isFinite(amount)||amount<=0)throw new Error("Enter a valid payment amount.");
  if(method!=="Cash"&&!reference)throw new Error("Add the payment reference for non-cash payments.");
  if(reference.length>120)throw new Error("Payment reference is too long.");

  // A timed-out browser may have sent the payment already. A stable token
  // prevents retrying the same form from posting a second ledger entry.
  if(token){
    const {data:previous,error:lookupError}=await admin.from("project_membership_transactions")
      .select("id,transaction_code,member_user_id,amount,payment_period,status")
      .eq("project_id",project.id).eq("transaction_code",incomingCode).maybeSingle();
    if(lookupError)throw new Error("Could not confirm the earlier payment attempt. Check the ledger before retrying.");
    if(previous){
      if(previous.member_user_id!==memberUserId||Number(previous.amount)!==amount||String(previous.payment_period)!==period)
        throw new Error("This payment form was used for another transaction. Reload Finance.");
      return {id:previous.id,code:previous.transaction_code,alreadyRecorded:true};
    }
  }
  if(method!=="Cash"){
    const {data:matching,error:matchingError}=await admin.from("project_membership_transactions")
      .select("id,transaction_code,member_user_id,amount,payment_period")
      .eq("project_id",project.id).eq("payment_method",method)
      .ilike("payment_reference",reference).eq("status","posted").limit(1);
    if(matchingError)throw new Error("Could not check the payment reference. Check the ledger before retrying.");
    if(matching?.length)throw new Error("This payment reference is already posted in this project ("+matching[0].transaction_code+"). Do not record it twice.");
  }

  const{data:membership}=await admin.from("project_members")
    .select("id")
    .eq("project_id",project.id)
    .eq("user_id",memberUserId)
    .eq("status","active")
    .maybeSingle();

  if(!membership)throw new Error("That person is not an active project member.");

  let{data:account}=await admin.from("project_membership_accounts")
    .select("id,member_user_id,member_code,monthly_fee,currency,status")
    .eq("project_id",project.id)
    .eq("member_user_id",memberUserId)
    .maybeSingle();

  if(!account){
    const{data:created,error:createError}=await admin.from("project_membership_accounts").insert({
      project_id:project.id,
      member_user_id:memberUserId,
      member_code:memberCode(project.id,memberUserId),
      allocated_amount:0,
      monthly_fee:MONTHLY_FEE,
      currency:"KES",
      allocation_note:"Standard FACKTS Music membership due: KES 2,000 per month.",
      needs_reconciliation:false,
      status:"active",
      created_by:user.id,
    }).select("id,member_user_id,member_code,monthly_fee,currency,status").single();

    if(createError)throw new Error(createError.message);
    account=created;
  }

  const code=incomingCode;

  const{data:transaction,error}=await admin.from("project_membership_transactions").insert({
    account_id:account.id,
    project_id:project.id,
    member_user_id:memberUserId,
    transaction_code:code,
    amount,
    currency:"KES",
    transaction_date:read(fd,"transaction_date")||new Date().toISOString().slice(0,10),
    payment_period:period,
    payment_method:method,
    payment_reference:reference||null,
    note:read(fd,"note")||null,
    status:"posted",
    recorded_by:user.id,
  }).select("id").single();

  if(error){
    if(error.code==="23505"&&token){
      const {data:existing}=await admin.from("project_membership_transactions")
        .select("id,transaction_code,member_user_id,amount,payment_period")
        .eq("project_id",project.id).eq("transaction_code",code).maybeSingle();
      if(existing&&existing.member_user_id===memberUserId&&Number(existing.amount)===amount&&String(existing.payment_period)===period)
        return {id:existing.id,code,alreadyRecorded:true};
    }
    throw new Error(error.message);
  }

  // Once saved, notification or audit failures must NOT produce a false
  // “payment failed” response that encourages a duplicate retry.
  try{await notifyUser(admin,{
    userId:memberUserId,
    projectId:project.id,
    type:"membership_payment_recorded",
    title:"Membership payment recorded",
    body:`${code}: KES ${amount.toLocaleString("en-KE")} was recorded for ${new Date(`${period}T12:00:00`).toLocaleDateString("en-KE",{month:"long",year:"numeric"})}.`,
    entityType:"membership_transaction",
    entityId:transaction!.id
  });}catch(error){console.error("Membership payment saved; notification failed",error);}

  try{await admin.from("platform_events").insert({
    user_id:user.id,
    project_id:project.id,
    event_name:"membership_payment_recorded",
    category:"finance",
    entity_type:"membership_transaction",
    entity_id:transaction!.id,
    metadata:{
      member_user_id:memberUserId,
      transaction_code:code,
      amount,
      currency:"KES",
      payment_period:period
    }
  });}catch(error){console.error("Membership payment saved; audit notification failed",error);}

  revalidatePath("/finance");
  revalidatePath(`/finance/members/${account.id}`);
  revalidatePath(`/finance/transactions/${transaction!.id}`);
  revalidatePath("/inbox");
  return {id:transaction!.id,code,alreadyRecorded:false};
}

export async function reverseMembershipPayment(fd:FormData){
  const{admin,user,project,roles}=await getWorkspace();
  if(!project)throw new Error("Project access required.");
  requireFinanceAdmin(roles);

  const transactionId=read(fd,"transaction_id");
  const reason=read(fd,"reversal_reason");

  if(!transactionId||!reason)throw new Error("Transaction and reversal reason are required.");

  const{data:transaction}=await admin.from("project_membership_transactions")
    .select("id,account_id,member_user_id,transaction_code,status")
    .eq("id",transactionId)
    .eq("project_id",project.id)
    .maybeSingle();

  if(!transaction)throw new Error("Transaction not found.");
  if(transaction.status==="reversed")throw new Error("This transaction is already reversed.");

  const{error}=await admin.from("project_membership_transactions").update({
    status:"reversed",
    reversal_reason:reason,
    reversed_by:user.id,
    reversed_at:new Date().toISOString(),
  }).eq("id",transaction.id).eq("project_id",project.id);

  if(error)throw new Error(error.message);

  await admin.from("platform_events").insert({
    user_id:user.id,
    project_id:project.id,
    event_name:"membership_payment_reversed",
    category:"finance",
    entity_type:"membership_transaction",
    entity_id:transaction.id,
    metadata:{transaction_code:transaction.transaction_code,reason}
  });

  revalidatePath("/finance");
  revalidatePath(`/finance/members/${transaction.account_id}`);
  revalidatePath(`/finance/transactions/${transaction.id}`);
}

export async function recordSimpleTransaction(_state:{message?:string},fd:FormData):Promise<{message:string}>{
 try{
  const {admin,user,project,roles}=await getWorkspace();
  if(!project)throw new Error('Project access required.');requireFinanceAdmin(roles);
  const kind=read(fd,'kind'),amount=Number(read(fd,'amount')),description=read(fd,'description'),category=read(fd,'category'),date=read(fd,'date'),track=read(fd,'track_id'),member=read(fd,'member_user_id');
  if(!['income','expense'].includes(kind)||!Number.isFinite(amount)||amount<=0||!description||!category||!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(new Date(date).getTime())||new Date(date).toISOString().slice(0,10)!==date)throw new Error('Enter a valid type, positive amount, date, description and category.');
  if(track){const {data,error}=await admin.from('tracks').select('id').eq('id',track).eq('project_id',project.id).maybeSingle();if(error||!data)throw new Error('Choose a track from this project.');}
  let memberName='';
  if(member){const {data,error}=await admin.from('project_members').select('user_id,profiles(full_name,stage_name,nickname)').eq('user_id',member).eq('project_id',project.id).eq('status','active').maybeSingle();if(error||!data)throw new Error('Choose an active project member.');memberName=creatorDisplayName(Array.isArray(data.profiles)?data.profiles[0]:data.profiles);}
  // Reuse existing ledgers and their write validation. Optional attribution is a note, not an ownership claim.
  const entry=new FormData();entry.set('amount',String(amount));entry.set('currency','KES');entry.set('track_id',track);entry.set('payment_status','paid');entry.set('notes',`${description}\nCategory: ${category}${member?`\nRelated member: ${memberName}`:''}`);
  if(kind==='income'){entry.set('revenue_source',description);entry.set('received_date',date);await addRevenueRecord(entry);}else{entry.set('category',category);entry.set('expense_date',date);await addProjectExpense(entry);}
  const audit=await admin.from('platform_events').insert({user_id:user.id,project_id:project.id,event_name:'finance_transaction_recorded',category:'finance',entity_type:kind==='income'?'revenue_record':'project_expense',metadata:{kind,amount,currency:'KES',date,description,category,track_id:track||null,member_user_id:member||null}});
  revalidatePath('/finance');return {message:audit.error?'Transaction saved. Audit logging is temporarily unavailable; do not submit again.':'Transaction saved.'};
 }catch(error){return {message:error instanceof Error?error.message:'Transaction could not be saved.'};}
}

/** UI wrapper reports actionable status rather than a generic connection error. */
export async function recordMembershipPaymentWithFeedback(
  _state:{ok:boolean;message:string;code?:string},fd:FormData
):Promise<{ok:boolean;message:string;code?:string}>{
 try{
  const result=await recordMembershipPayment(fd);
  return {ok:true,code:result.code,
   message:result.alreadyRecorded
     ?"Payment already recorded ("+result.code+"). No duplicate was created."
     :"Payment recorded successfully. Reference: "+result.code+"."};
 }catch(error){
  console.error("recordMembershipPaymentWithFeedback",error);
  return {ok:false,message:error instanceof Error?error.message:"Payment not confirmed. Check the ledger before submitting again."};
 }
}

/** Keep older member-detail forms compatible without exposing action results. */
export async function recordMembershipPaymentLegacy(fd:FormData):Promise<void>{
 await recordMembershipPayment(fd);
}
