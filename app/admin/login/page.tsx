import Link from "next/link";
import {redirect} from "next/navigation";
import {FacktsMusicLogo} from "../../../components/Branding";
import InstallControlRoomButton from "../../../components/InstallControlRoomButton";
import {getControlRoomAccess} from "../../../lib/controlRoom";
import {controlRoomLogin} from "../actions";

export default async function ControlRoomLogin({searchParams}:{searchParams:Promise<{error?:string}>}){
  const [params,access]=await Promise.all([searchParams,getControlRoomAccess()]);
  if(access.authorised)redirect("/admin");
  return <main className="control-login-page"><section className="control-login-image" aria-hidden="true"><div className="control-image-caption"><span>PRIVATE MANAGEMENT ENVIRONMENT</span><strong>Keep the whole music system in view.</strong></div></section><section className="control-login-panel"><div className="control-login-lockup"><FacktsMusicLogo size={52}/><span>CONTROL ROOM</span></div><form action={controlRoomLogin} className="control-login-card"><header><span>FACKTS MUSIC</span><h1>Control Room</h1><p>Sign in to continue</p></header>{params.error&&<div className="control-error" role="alert">{params.error}</div>}{access.user&&<div className="control-error" role="alert">Your current FACKTS Music session does not have Control Room access. Sign out below to switch accounts.</div>}<label>Email<input name="email" type="email" autoComplete="email" required/></label><label>Password<input name="password" type="password" autoComplete="current-password" required/></label><button className="control-primary-button" type="submit">Sign In</button><Link href="/forgot-password">Forgot Password</Link>{access.user&&<Link href="/auth/signout?next=/admin/login">Sign out and switch account</Link>}</form><InstallControlRoomButton/></section></main>
}
