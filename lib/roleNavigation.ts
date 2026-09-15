import {
  ActivityIcon,
  BriefcaseIcon,
  CheckIcon,
  DiscIcon,
  FileIcon,
  HomeIcon,
  LayersIcon,
  MicIcon,
  MusicIcon,
  UsersIcon,
} from "../components/Icons";

export type KreyohRole =
  | "Super Admin"
  | "Admin"
  | "Project Lead"
  | "Artist"
  | "Producer"
  | "Engineer"
  | "A&R"
  | "Finance"
  | "Manager"
  | "Studio Owner"
  | "Project Admin";

type NavItem={
  label:string;
  href:string;
  icon:typeof HomeIcon;
  roles:KreyohRole[]|"all";
  activeMatch:(pathname:string)=>boolean;
  badge?:string;
};

export const NAV_ITEMS:NavItem[]=[
  {label:"Workspace",href:"/workspace",icon:HomeIcon,roles:["Super Admin","Admin","Project Lead","Project Admin"],activeMatch:(p)=>p==="/workspace"},
  {label:"Dashboard",href:"/member-dashboard",icon:HomeIcon,roles:"all",activeMatch:(p)=>p.startsWith("/member-dashboard")},
  {label:"My Record",href:"/professional-record",icon:UsersIcon,roles:"all",activeMatch:(p)=>p.startsWith("/professional-record")},
  {label:"A&R Portal",href:"/portal/ar",icon:BriefcaseIcon,roles:["A&R"],activeMatch:(p)=>p.startsWith("/portal/ar"),badge:"PORTAL"},
  {label:"Manager Portal",href:"/portal/manager",icon:BriefcaseIcon,roles:["Manager"],activeMatch:(p)=>p.startsWith("/portal/manager"),badge:"PORTAL"},
  {label:"Studio Portal",href:"/portal/studio",icon:MicIcon,roles:["Studio Owner"],activeMatch:(p)=>p.startsWith("/portal/studio"),badge:"PORTAL"},
  {label:"Support Team",href:"/support-team",icon:UsersIcon,roles:["Super Admin","Admin","Project Lead","Artist"],activeMatch:(p)=>p.startsWith("/support-team")},
  {label:"People",href:"/people",icon:UsersIcon,roles:"all",activeMatch:(p)=>p.startsWith("/people")},
  {label:"Beats",href:"/beats",icon:MusicIcon,roles:"all",activeMatch:(p)=>p.startsWith("/beats"),badge:"LIVE"},
  {label:"Tracks",href:"/tracks",icon:DiscIcon,roles:"all",activeMatch:(p)=>p.startsWith("/tracks")},
  {label:"Track Records",href:"/track-records",icon:FileIcon,roles:"all",activeMatch:(p)=>p.startsWith("/track-records")},
  {label:"Studio Sessions",href:"/studio-sessions",icon:MicIcon,roles:"all",activeMatch:(p)=>p.startsWith("/studio-sessions")},
  {label:"Tasks",href:"/tasks",icon:CheckIcon,roles:"all",activeMatch:(p)=>p.startsWith("/tasks")},
  {label:"Documents",href:"/documents",icon:FileIcon,roles:"all",activeMatch:(p)=>p.startsWith("/documents")},
  {label:"Splits",href:"/splits",icon:LayersIcon,roles:"all",activeMatch:(p)=>p.startsWith("/splits")},
  {label:"Opportunities",href:"/opportunities",icon:BriefcaseIcon,roles:"all",activeMatch:(p)=>p.startsWith("/opportunities")},
  {label:"Reports",href:"/reports",icon:FileIcon,roles:"all",activeMatch:(p)=>p.startsWith("/reports")},
  {label:"Activity",href:"/activity",icon:ActivityIcon,roles:"all",activeMatch:(p)=>p.startsWith("/activity")},
];

export function getNavigationForRoles(roles:string[]){
  const normalized=new Set(roles.map((role)=>role.trim()));
  const isProjectAdmin=["Super Admin","Admin","Project Lead","Project Admin"].some((role)=>normalized.has(role));

  return NAV_ITEMS.filter((item)=>{
    if(item.href==="/member-dashboard"&&isProjectAdmin)return false;

    if(item.roles==="all")return true;

    return item.roles.some((role)=>normalized.has(role));
  });
}

export function hasManagementRole(roles:string[]){
  return roles.includes("Super Admin")||roles.includes("Admin")||roles.includes("Project Lead");
}
export function canManagePeople(roles:string[]){return hasManagementRole(roles);}
export function canManageProject(roles:string[]){return hasManagementRole(roles);}
export function canManageFinance(roles:string[]){return hasManagementRole(roles);}
export function canManageOpportunities(roles:string[]){
  return hasManagementRole(roles)||roles.includes("A&R")||roles.includes("Manager");
}
