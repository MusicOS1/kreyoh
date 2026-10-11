import Link from "next/link";
import FanThemePicker from "./FanThemePicker";

function FanIcon({kind}:{kind:"discover"|"library"|"charts"|"profile"}){
  return <svg aria-hidden="true" viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {kind==="discover"&&<><circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2.6 5.1-4.4 1.9 2.1-4.6z"/></>}
    {kind==="library"&&<><path d="M4 5h12M4 10h12M4 15h9"/><rect x="15" y="14" width="5" height="7" rx="1"/><path d="M20 15v-5"/></>}
    {kind==="charts"&&<><path d="M5 20V11m7 9V5m7 15v-8"/><path d="M3 20h18"/></>}
    {kind==="profile"&&<><circle cx="12" cy="8" r="4"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/></>}
  </svg>;
}

export default function FanShell({
  children,name="Listener",avatarUrl=null,creatorMode=false
}:{children:React.ReactNode;name?:string;avatarUrl?:string|null;creatorMode?:boolean}){
  const initial=(name.trim()[0]||"F").toUpperCase();
  return <div className="fan-shell">
    <header className="fan-topbar">
      <Link href="/fan" className="fan-logo" aria-label="FACKTS Music home">FACKTS <span>MUSIC</span></Link>
      <span className="fan-topbar-edition">THE LISTENING CLUB</span>
      <nav className="fan-desktop-nav" aria-label="Fan navigation">
        <Link href="/fan">Discover</Link>
        <Link href="/fan?tab=My%20Library">My library</Link>
        <Link href="/fan?tab=Billboard">Billboard</Link>
        <Link href="/messages">Messages</Link>
        {creatorMode&&<Link href="/home">Creator workspace</Link>}
      </nav>
      <div className="fan-topbar-actions">
        <FanThemePicker compact/>
        <Link className="fan-account-pill" href="/fan/profile" aria-label={"Edit "+name+" fan profile"}>
          <span className="fan-account-avatar">{avatarUrl?<img src={avatarUrl} alt=""/>:initial}</span>
          <span className="fan-account-name">{name}</span>
          <span aria-hidden="true">⌄</span>
        </Link>
      </div>
    </header>
    {children}
    <nav className="fan-mobile-nav" aria-label="Fan quick navigation">
      <Link href="/fan"><FanIcon kind="discover"/><span>Discover</span></Link>
      <Link href="/fan?tab=My%20Library"><FanIcon kind="library"/><span>Library</span></Link>
      <Link href="/fan?tab=Billboard"><FanIcon kind="charts"/><span>Billboard</span></Link>
      <Link href="/fan/profile"><FanIcon kind="profile"/><span>Profile</span></Link>
    </nav>
  </div>;
}
