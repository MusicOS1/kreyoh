import { requireControlRoomPermission } from "../../../../lib/controlRoom";

export default async function DiagnosticsLayout({ children }: { children: React.ReactNode }) {
  await requireControlRoomPermission("system");
  return children;
}
