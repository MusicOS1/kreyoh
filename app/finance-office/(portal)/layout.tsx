import {redirect} from "next/navigation";
import {getFinancePortalAccess} from "../../../lib/financePortalAccess";
import FinancePortalShell from "../../../components/FinancePortalShell";

export const metadata={
 title:"Finance Office | FACKTS Music",
 robots:{index:false,follow:false},
};
export default async function FinanceOfficeLayout({children}:{children:React.ReactNode}){
 const access=await getFinancePortalAccess();
 if(!access.user)redirect("/finance-office/login");
 if(!access.authorised)redirect("/finance-office/access-unavailable");
 return <FinancePortalShell email={access.user.email||"Finance member"} superAdmin={access.superAdmin}>
  {children}
 </FinancePortalShell>;
}
