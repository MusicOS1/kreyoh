import ShellLayout from "./ShellLayout";
import {getWorkspace} from "../lib/workspace";
import {isControlRoomUser} from "../lib/controlRoom";
import AppExperienceEnhancer from "./AppExperienceEnhancer";
import TrackReplacementEnhancer from "./TrackReplacementEnhancer";
import SupportTransparencyEnhancer from "./SupportTransparencyEnhancer";
import InboxShellEnhancer from "./InboxShellEnhancer";

const ROLE_PRIORITY=[
  "Super Admin","Admin","Project Lead","Finance","A&R","Manager","Studio Owner",
  "Producer","Engineer","Artist"
];

function orderRoles(roles:string[]){
  return[...roles].sort((a,b)=>{
    const ai=ROLE_PRIORITY.indexOf(a),bi=ROLE_PRIORITY.indexOf(b);
    return(ai===-1?999:ai)-(bi===-1?999:bi);
  });
}

export default async function AppShell({children}:{children:React.ReactNode}){
  const{profile,user,roles,project,membership,activeProjects,admin}=await getWorkspace();
  const orderedRoles=orderRoles(roles);
  const canAccessControlRoom=await isControlRoomUser(user.id);
  const canReplaceTracks=roles.some((role)=>["Super Admin","Admin","Project Lead","A&R"].includes(role));

  const{count:unreadNotifications=0}=await admin
    .from("notifications")
    .select("id",{count:"exact",head:true})
    .eq("user_id",user.id)
    .is("read_at",null);

  const userName=
    profile?.stage_name||
    profile?.full_name||
    user.email?.split("@")[0]||
    "FACKTS Music User";

  const primaryRole=orderedRoles[0]||"Creator";

  return<>
    <AppExperienceEnhancer/>
    <TrackReplacementEnhancer enabled={canReplaceTracks}/>
    <SupportTransparencyEnhancer roles={roles}/>
    <InboxShellEnhancer/>

    <ShellLayout
      userName={userName}
      primaryRole={primaryRole}
      projectCode={project?.code||""}
      projectName={project?.name||"Your FACKTS Music home"}
      hasProject={Boolean(membership&&project)}
      activeProjects={activeProjects||[]}
      selectedProjectId={project?.id||null}
      projectStatus={project?.status||"Production"}
      roles={orderedRoles}
      userEmail={profile?.email||user.email}
      stageName={profile?.stage_name}
      avatarUrl={profile?.avatar_url}
      canAccessControlRoom={canAccessControlRoom}
      unreadNotifications={unreadNotifications||0}
    >
      {children}
    </ShellLayout>
  </>;
}
