import {requireControlRoomPermission} from "../../../../lib/controlRoom";

export default async function ScopedControlRoomSection({children}:{children:React.ReactNode}) {
  await requireControlRoomPermission("enquiries");
  return children;
}