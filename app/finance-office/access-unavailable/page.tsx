import Link from "next/link";
import styles from "../portal.module.css";
export const metadata={title:"Finance access required | FACKTS Music",robots:{index:false,follow:false}};
export default function FinanceAccessUnavailable(){
 return <main className={styles.auth}><section className={styles.login}>
  <Link href="/" className={styles.brand}>FACKTS <span>MUSIC</span><small>FINANCE OFFICE</small></Link>
  <h1>Finance access required</h1>
  <p>This FACKTS account has not been appointed to the Finance team. Your Super Admin needs to enable the <strong>Finance</strong> permission before you can use this office.</p>
  <p>Artist/project memberships don't grant Finance Office access.</p>
  <form action="/auth/signout?next=/finance-office/login" method="post"><button type="submit">Sign out to switch account</button></form>
  <Link href="/finance-office/login">Finance sign in</Link>
 </section></main>;
}
