import Link from "next/link";
import {redirect} from "next/navigation";
import {getFinancePortalAccess} from "../../../lib/financePortalAccess";
import {financeOfficeLogin} from "./actions";
import styles from "../portal.module.css";

export const metadata={title:"Finance sign in | FACKTS Music",robots:{index:false,follow:false}};
export default async function FinanceSignIn({searchParams}:{searchParams:Promise<{error?:string}>}){
 const [access,params]=await Promise.all([getFinancePortalAccess(),searchParams]);
 if(access.authorised)redirect("/finance-office");
 return <main className={styles.auth}><section className={styles.login}>
  <Link href="/" className={styles.brand}>FACKTS <span>MUSIC</span><small>FINANCE OFFICE</small></Link>
  <h1>Finance sign in</h1>
  <p>Welcome to the FACKTS Music Finance Office. Only team members with Finance access approved by Super Admin can enter.</p>
  {params.error&&<div className={styles.error} role="alert">{params.error.slice(0,150)}</div>}
  {access.user&&<p className={styles.error}>You're signed in to a FACKTS account without Finance access. Switch accounts or request Finance access from Super Admin.</p>}
  <form action={financeOfficeLogin}>
   <label>Email address<input type="email" name="email" autoComplete="email" required placeholder="you@example.com"/></label>
   <label>Password<input type="password" name="password" autoComplete="current-password" required/></label>
   <button type="submit">Open Finance Office</button>
  </form>
  <Link href="/forgot-password">Forgot password?</Link>
  {access.user&&<form action="/auth/signout?next=/finance-office/login" method="post"><button type="submit">Sign out and change account</button></form>}
  <p>Same FACKTS Music login. Separate Finance workspace and permissions.</p>
 </section></main>;
}
