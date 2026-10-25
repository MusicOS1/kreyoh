import EcosystemShell from './ecosystem/EcosystemShell';
// Keep legacy call sites compatible; identity and permitted workspaces come from the server.
export default function FanShell({children}:{children:React.ReactNode;name?:string;avatarUrl?:string|null;creatorMode?:boolean;activeTab?:string;showBottomNav?:boolean}){
 return <EcosystemShell active="listener">{children}</EcosystemShell>;
}
