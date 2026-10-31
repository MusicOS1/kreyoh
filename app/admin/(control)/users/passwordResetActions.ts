"use server";

import {requireControlRoomPermission} from "../../../../lib/controlRoom";
import {createAdminClient} from "../../../../lib/supabase/admin";
import {PASSWORD_RECOVERY_REDIRECT} from "../../../../lib/passwordRecovery";

export type ResetLinkState = {ok:boolean;message:string};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function sendManagedPasswordReset(
  _previous: ResetLinkState, formData: FormData
): Promise<ResetLinkState> {
  const actor = await requireControlRoomPermission("people");
  const targetId = String(formData.get("user_id") || "");
  if (!UUID.test(targetId)) return {ok:false,message:"Invalid account selection."};

  const admin = createAdminClient();
  // Read the actual Supabase Auth account: profile emails may be outdated.
  const {data, error:userError} = await admin.auth.admin.getUserById(targetId);
  const recipient = data?.user?.email?.trim().toLowerCase();
  if (userError || !recipient) return {
    ok:false,message:"This profile has no recoverable email account. Check the account details."
  };

  // Prevent an admin from repeatedly emailing the same person.
  const {count, error:lookupError} = await admin.from("platform_events")
    .select("id",{count:"exact",head:true})
    .eq("category","admin")
    .eq("event_name","password_reset_email_requested")
    .contains("metadata",{target_user_id:targetId})
    .gte("created_at",new Date(Date.now()-10*60*1000).toISOString());
  if (lookupError) return {ok:false,message:"Cannot verify recent reset requests. Try again later."};
  if ((count || 0) > 0) return {
    ok:false,message:"A reset email was requested recently. Try again after ten minutes."
  };

  // Sends the native Supabase one-time recovery email. Never generate or show
  // temporary passwords, admin-created tokens or reusable login links.
  let failure: {message?:string}|null = null;
  try {
    const result = await admin.auth.resetPasswordForEmail(recipient,{
      redirectTo:PASSWORD_RECOVERY_REDIRECT
    });
    failure = result.error;
  } catch {
    return {ok:false,message:"The email service could not be reached. Please retry."};
  }
  if (failure) return {
    ok:false,
    message:"The reset email could not be requested. Check email delivery and rate limits."
  };

  const {error:auditError} = await admin.from("platform_events").insert({
    user_id:actor.id,category:"admin",
    event_name:"password_reset_email_requested",
    metadata:{target_user_id:targetId,channel:"email",surface:"control_room"}
  });
  if (auditError) console.warn("Password reset request audit could not be stored");
  return {
    ok:true,
    message:"Password reset requested. The user can open the email, set a new password and sign in."
  };
}
