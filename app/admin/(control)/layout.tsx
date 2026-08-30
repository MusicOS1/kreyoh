import {getControlRoomPermissions,requireControlRoomAdmin} from "../../../lib/controlRoom";
import ControlRoomShell from "../../../components/ControlRoomShell";

export default async function ProtectedControlRoom({children}:{children:React.ReactNode}){const user=await requireControlRoomAdmin();const permissions=await getControlRoomPermissions(user.id);return <ControlRoomShell email={user.email} permissions={permissions}>{children}</ControlRoomShell>}
