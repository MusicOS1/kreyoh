import {redirect} from "next/navigation";
import {getWorkspace} from "../../lib/workspace";

const PROJECT_ADMIN_ROLES=["Super Admin","Admin","Project Lead","Project Admin"];

export default async function WorkspaceLayout({children}:{children:React.ReactNode}){
  const{project,membership,roles}=await getWorkspace();

  if(project&&membership&&!roles.some((role)=>PROJECT_ADMIN_ROLES.includes(role))){
    redirect("/member-dashboard");
  }

  return children;
}
