import Link from 'next/link';
export default function FanShell({children,name='Listener',creatorMode=false}:{children:React.ReactNode;name?:string;creatorMode?:boolean}){
 return <div className="fan-shell"><header className="fan-topbar"><Link href="/listen" className="fan-logo">FACKTS <span>MUSIC</span></Link><nav aria-label="Fan navigation"><Link href="/fan">My music</Link>{creatorMode&&<Link href="/home">Creator workspace</Link>}<Link href="/billboard">Billboard</Link><Link href="/messages">Messages</Link><Link href="/settings">{name}</Link><form action="/auth/signout" method="post"><button>Sign out</button></form></nav></header>{children}</div>;
}
