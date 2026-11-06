import "server-only";
import {createAdminClient} from "./supabase/admin";

export const EDITORIAL_IMAGE_BUCKET = "music-images";
export const EDITORIAL_IMAGE_MAX_BYTES = 12 * 1024 * 1024;
const ASSET_PATTERN = /^\/api\/editorial-images\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.(jpg|png|webp)$/i;

// Only images prepared for FACKTS editorial work can be served by this URL.
export function editorialImageStoragePath(imageUrl:string):string|null {
 const match = ASSET_PATTERN.exec(imageUrl);
 return match ? `editorial/${match[1].toLowerCase()}.${match[2].toLowerCase()}` : null;
}

export async function assertEditorialImageUploaded(imageUrl:string):Promise<void>{
 const path=editorialImageStoragePath(imageUrl);
 if(!path)return;
 const file=path.slice("editorial/".length);
 const {data,error}=await createAdminClient().storage.from(EDITORIAL_IMAGE_BUCKET)
  .list("editorial",{search:file,limit:20});
 if(error||!data?.some(item=>item.name===file))throw Error("The picture has not finished uploading. Upload it again before saving.");
}
