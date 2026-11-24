import Link from "next/link";
import styles from "../app/finance-office/portal.module.css";

export default function FinancePortalShell({children,email,superAdmin}:{
 children:React.ReactNode;email:string;superAdmin:boolean;
}){
 const nav=[
  {title:"Overview",href:"/finance-office"},
  {title:"FACKTS business finance",href:"/finance-office/platform"},
  {title:"Accounts",href:"/finance-office/accounts"},
  {title:"Partner: Third Culture",href:"/finance-office/partners/third-culture"},
  {title:"Third Culture members",href:"/finance-office/members"},
  {title:"Transactions",href:"/finance-office/transactions"},
  {title:"Bills & expenses",href:"/finance-office/bills"},
  {title:"Payments & links",href:"/finance-office/payments"},
  {title:"Fan payments",href:"/finance-office/fan-payments"},
  {title:"Reports",href:"/finance-office/reports"},
 ];
 return <div className={styles.shell}>
  <aside className={styles.sidebar} aria-label="Finance portal sidebar">
   <Link href="/finance-office" className={styles.brand}>FACKTS <span>MUSIC</span><small>Finance Office</small></Link>
   <nav className={styles.links} aria-label="Finance portal navigation">
    {nav.map(item=><Link key={item.href} href={item.href}>{item.title}</Link>)}
   </nav>
   <div className={styles.foot}><span>Signed in as {email}</span>
    {superAdmin&&<Link href="/admin">Open Super Admin Control Room</Link>}
    <form action="/auth/signout?next=/finance-office/login" method="post"><button type="submit">Sign out</button></form>
   </div>
  </aside>
  <div className={styles.main}>
   <header className={styles.top}><div><strong>FACKTS Music · Finance</strong><p>Accounts, payments and project records</p></div>
    {superAdmin?<Link href="/admin">Super Admin</Link>:<span aria-label="Current role">Finance team</span>}
   </header>
   <nav className={styles.mobileLinks} aria-label="All Finance Office sections">{nav.map(item=><Link key={item.href} href={item.href}>{item.title}</Link>)}</nav>
   <div className={styles.body}>{children}</div>
   <nav className={styles.mobileNav} aria-label="Finance portal mobile navigation">
    <Link href="/finance-office">Overview</Link>
    <Link href="/finance-office/platform">FACKTS</Link>
    <Link href="/finance-office/transactions">Activity</Link>
    <Link href="/finance-office/accounts">Accounts</Link>
   </nav>
  </div>
 </div>;
}
