/** Avoid assigning a bulk uploader's entire catalogue to their public artist persona.
 * Releases currently store uploading account as artist_id; explicit rights linkage
 * is not yet represented in the release schema. Name matching here is conservative:
 * a release either credits the exact artist name or names the artist among acts.
 */
const normalized=(value:string)=>value.normalize("NFKC").toLocaleLowerCase("en").trim().replace(/\s+/g," ");
export function creditedToArtist(artistName:string,profileName:string){
 const credited=normalized(artistName),person=normalized(profileName);
 if(!credited||!person)return false;
 if(credited===person)return true;
 return credited.split(/\s+(?:&|and|feat\.?|ft\.?|with|x)\s+|\s*[,;/+]\s*/i).some(part=>part===person);
}
