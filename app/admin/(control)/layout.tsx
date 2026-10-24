import {getExperienceIdentity} from '../../../lib/experienceIdentity';
import {getControlRoomPermissions,requireControlRoomAdmin} from "../../../lib/controlRoom";
import ControlRoomShell from "../../../components/ControlRoomShell";

export default async function ProtectedControlRoom({children}:{children:React.ReactNode}){const user=await requireControlRoomAdmin();const [permissions,identity]=await Promise.all([getControlRoomPermissions(user.id),getExperienceIdentity()]);return <ControlRoomShell identity={identity} email={user.email} permissions={permissions}>{children}</ControlRoomShell>}
