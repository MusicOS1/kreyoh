import Link from "next/link";
import {requireControlRoomPermission} from "../../../../../lib/controlRoom";
import BulkReleaseImporter from "../../../../../components/BulkReleaseImporter";
export default async function BulkReleasesPage(){
 await requireControlRoomPermission("music");
 return <main className="community-page bulk-release-admin">
  <Link href="/admin/releases">← Release approvals</Link>
  <h1>New public releases</h1>
  <p>Upload as an artist or music administrator; the uploader is not automatically the credited artist or master owner. For project demos and working versions, use <Link href="/production">Project Production</Link>. After importing public releases, confirm artist attribution and rights ownership in <Link href="/admin/catalogue">Catalogue attribution</Link>.</p>
  <p>Import existing releases at scale. Uploads travel from your browser directly into Cloudflare R2. They are only listed publicly after approval and the scheduled release date.</p>
  <BulkReleaseImporter/>
 </main>;
}