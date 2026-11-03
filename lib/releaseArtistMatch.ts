/** Avoid assigning a bulk uploader's entire catalogue to their public artist persona.
 * Legacy releases store the uploading account as artist_id; linked project releases
 * carry explicit artist associations. Legacy name matching remains conservative:
 * a release either credits the exact artist name or names the artist among acts.
 */
const normalized=(value:string)=>value.normalize("NFKC").toLocaleLowerCase("en").trim().replace(/\s+/g," ");
export function creditedToArtist(artistName:string,profileName:string){
 const credited=normalized(artistName),person=normalized(profileName);
 if(!credited||!person)return false;
 if(credited===person)return true;
 return credited.split(/\s+(?:&|and|feat\.?|ft\.?|with|x)\s+|\s*[,;/+]\s*/i).some(part=>part===person);
}

export function releaseHasArtist(release:{artist_id:string;artist_name:string;explicit_artist_link?:boolean;featured_artist_ids?:string[];attributed_artist_profile_id?:string},id:string,name:string){
 if(release.attributed_artist_profile_id)return release.attributed_artist_profile_id===id;
 return release.explicit_artist_link ? release.artist_id===id || Boolean(release.featured_artist_ids?.includes(id)) : release.artist_id===id && creditedToArtist(release.artist_name,name);
}
