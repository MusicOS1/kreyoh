import {requireControlRoomAdmin} from "../../../lib/controlRoom";
import ControlRoomShell from "../../../components/ControlRoomShell";

export default async function ProtectedControlRoom({children}:{children:React.ReactNode}){const user=await requireControlRoomAdmin();return <ControlRoomShell email={user.email}>{children}</ControlRoomShell>}
