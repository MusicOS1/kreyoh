import { createAdminClient } from "./supabase/admin";

// Authentication diagnostics never store credentials, addresses, tokens, or raw errors.
export type AuthOutcome =
  | "login_attempted" | "login_completed" | "login_failed" | "login_access_denied"
  | "password_reset_requested" | "password_reset_request_failed"
  | "password_recovery_verified" | "password_recovery_failed"
  | "password_change_completed" | "password_change_failed";
export type AuthSurface = "main" | "control_room" | "forgot_password" | "admin_reset" | "recovery_link" | "set_password";
export type DiagnosticReason =
  | "invalid_credentials" | "email_unconfirmed" | "rate_limited" | "timeout"
  | "network" | "service_unavailable" | "access_denied" | "missing_fields"
  | "link_incomplete" | "link_expired" | "link_invalid"
  | "session_unavailable" | "password_rejected" | "unknown";

export function classifyAuthFailure(error: unknown): DiagnosticReason {
  if (!error || typeof error !== "object") return "unknown";
  const record = error as { message?: string; code?: string; name?: string; status?: number };
  const code = String(record.code || "").toLowerCase();
  const name = String(record.name || "").toLowerCase();
  const message = String(record.message || "").toLowerCase();
  if (record.status === 429 || /rate.limit|too.many.requests|over_request_rate_limit/.test(code + " " + message)) return "rate_limited";
  if (/timeout|aborterror|timed.out/.test(name + " " + code + " " + message)) return "timeout";
  if (/network|fetch.failed|failed.to.fetch|authretryablefetcherror/.test(name + " " + code + " " + message)) return "network";
  if (record.status && record.status >= 500) return "service_unavailable";
  if (/email.not.confirmed|email_not_confirmed|email.not.verified/.test(code + " " + message)) return "email_unconfirmed";
  if (/invalid_credentials|invalid.login.credentials|invalid.grant|wrong.password|incorrect.password/.test(code + " " + message)) return "invalid_credentials";
  return "unknown";
}

export async function recordAuthDiagnostic(input: {
  event: AuthOutcome; surface: AuthSurface; userId?: string | null; reason?: DiagnosticReason;
  durationMs?: number; statusCode?: number | null;
}): Promise<void> {
  try {
    const { error } = await createAdminClient().from("platform_events").insert({
      user_id: input.userId || null,
      event_name: input.event,
      category: "authentication",
      metadata: {
        surface: input.surface,
        reason: input.reason || null,
        duration_ms: typeof input.durationMs === "number" ? Math.max(0, Math.min(600000, Math.round(input.durationMs))) : null,
        status_code: typeof input.statusCode === "number" ? input.statusCode : null,
        diagnostics_version: 1,
      },
    });
    if (error) console.warn("FACKTS diagnostic event could not be recorded");
  } catch {
    console.warn("FACKTS diagnostic event logging unavailable");
  }
}

export async function recordServiceIncident(source: string, reason: DiagnosticReason): Promise<void> {
  try {
    const { error } = await createAdminClient().from("system_incidents").insert({
      severity: "medium",
      source,
      message: "A service request could not be completed.",
      context: { reason, diagnostics_version: 1 },
    });
    if (error) console.warn("FACKTS service incident logging unavailable");
  } catch {
    console.warn("FACKTS service incident logging unavailable");
  }
}

/** Only bounded, classified recovery failures; never log URLs/tokens/emails. */
export function classifyRecoveryFailure(error:unknown):DiagnosticReason{
 if(!error||typeof error!=="object")return "unknown";
 const {message,code,status}=error as {message?:string;code?:string;status?:number};
 const diagnostic=classifyAuthFailure(error);
 if(diagnostic!=="unknown")return diagnostic;
 const value=String(code||"")+" "+String(message||"");
 if(/expired|otp_expired|token.*expir/i.test(value))return "link_expired";
 if(/invalid|already.*used|access_denied|otp_disabled/i.test(value))return "link_invalid";
 if(/session.*missing|auth.session.missing/i.test(value))return "session_unavailable";
 if(/password|weak_password|same_password/i.test(value))return "password_rejected";
 if(status===403||status===401)return "access_denied";
 return "unknown";
}
