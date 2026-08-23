import { createAdminClient } from "../../../../lib/supabase/admin";
import { updateSystemSetting } from "../actions";

export default async function AdminSystem() {
  const admin = createAdminClient();
  const [{ data: settings }, { data: incidents }] = await Promise.all([
    admin.from("system_settings").select("*").order("setting_key"),
    admin.from("system_incidents").select("*").is("resolved_at", null).order("created_at", { ascending: false }).limit(25),
  ]);
  const services: Array<[string, boolean | string]> = [
    ["Supabase", Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL)],
    ["Service role", Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)],
    ["Cloudflare R2", Boolean(process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_BUCKET_NAME)],
    ["Resend SMTP", "Configured in Supabase Dashboard"],
  ];
  return <><section className="control-page-hero system"><span className="control-eyebrow">SYSTEM CONTROL</span><h1>Important variables, editable.</h1><p>Manage operational defaults and see infrastructure readiness without exposing secrets to the browser.</p></section><section className="control-grid"><article className="control-panel"><header><div><span className="control-eyebrow">INFRASTRUCTURE</span><h2>Service readiness</h2></div></header>{services.map(([name, ready]) => <div className="control-row" key={name}><div><strong>{name}</strong><small>{typeof ready === "boolean" ? (ready ? "Configured" : "Configuration required") : ready}</small></div><span className={`control-status ${ready === true ? "ready" : ""}`}>{ready === true ? "ready" : ready === false ? "attention" : "manual"}</span></div>)}</article><article className="control-panel"><header><div><span className="control-eyebrow">INCIDENTS</span><h2>Open system issues</h2></div></header>{!(incidents || []).length ? <p className="control-empty">No recorded open incidents.</p> : (incidents || []).map((item: any) => <div className="control-row" key={item.id}><span className="control-status">{item.severity}</span><div><strong>{item.source}</strong><small>{item.message}</small></div></div>)}</article></section><section className="control-settings-grid">{(settings || []).map((setting: any) => <form action={updateSystemSetting} className="control-panel" key={setting.setting_key}><span className="control-eyebrow">{setting.setting_key}</span><h2>{setting.description}</h2><input type="hidden" name="setting_key" value={setting.setting_key} /><textarea name="setting_value" defaultValue={JSON.stringify(setting.setting_value, null, 2)} rows={8} /><button>Save {setting.setting_key} settings</button></form>)}</section></>;
}
