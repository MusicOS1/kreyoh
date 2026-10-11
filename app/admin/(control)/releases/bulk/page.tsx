import Link from "next/link";
import {requireControlRoomPermission} from "../../../../../lib/controlRoom";
import BulkReleaseImporter from "../../../../../components/BulkReleaseImporter";
export default async function BulkReleasesPage(){
 await requireControlRoomPermission("music");
 return <main className="community-page bulk-release-admin">
  <Link href="/admin/releases">← Release approvals</Link>
  <h1>Catalogue importer</h1>
  <p>Import existing releases at scale. Uploads travel from your browser directly into Cloudflare R2. They are only listed publicly after approval and the scheduled release date.</p>
  <BulkReleaseImporter/>
 </main>;
}