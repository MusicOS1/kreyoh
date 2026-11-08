/** Human-readable bulk-import project notes stored in the existing release
 * description column. No migrations, changes to player data, or parallel
 * metadata table are needed; existing descriptions stay untouched.
 */
export const BULK_NOTE_HEADER="FACKTS PROJECT NOTES";
export const RELEASE_CONTEXT_OPTIONS=[
 "Previously unreleased",
 "Studio work in progress",
 "Previously released elsewhere"
] as const;
export const RECORDING_QUALITY_OPTIONS=[
 "Demo recording",
 "Rough mix",
 "Unmastered",
 "Mastered / release-ready"
] as const;

export type BulkProjectDetails={
 releaseContext:string;
 recordingQuality:string;
 about:string;
};
function allowed(value:string,values:readonly string[]){
 const item=value.trim();
 if(item&&!values.includes(item))throw Error("Choose one of the available recording labels.");
 return item;
}
export function formatBulkProjectDescription(value:BulkProjectDetails):string{
 const releaseContext=allowed(value.releaseContext,RELEASE_CONTEXT_OPTIONS);
 const recordingQuality=allowed(value.recordingQuality,RECORDING_QUALITY_OPTIONS);
 const about=value.about.trim().replace(/\r\n/g,"\n");
 if(about.length>1500)throw Error("Keep the project description within 1,500 characters.");
 if(!releaseContext&&!recordingQuality&&!about)return "";
 const parts=[BULK_NOTE_HEADER];
 if(releaseContext)parts.push("Release context: "+releaseContext);
 if(recordingQuality)parts.push("Recording quality: "+recordingQuality);
 if(about)parts.push("About the project:\n"+about);
 const description=parts.join("\n");
 if(description.length>2000)throw Error("Project information is too long for a release.");
 return description;
}
export function readBulkProjectDescription(value:string|null|undefined):BulkProjectDetails|null{
 const input=(value||"").replace(/\r\n/g,"\n");
 if(!input.startsWith(BULK_NOTE_HEADER+"\n"))return null;
 const body=input.slice(BULK_NOTE_HEADER.length+1);
 const lines=body.split("\n");
 const releaseContext=lines.find(line=>line.startsWith("Release context: "))?.slice("Release context: ".length)||"";
 const recordingQuality=lines.find(line=>line.startsWith("Recording quality: "))?.slice("Recording quality: ".length)||"";
 const marker="\nAbout the project:\n";
 const pos=("\n"+body).indexOf(marker);
 const about=pos>=0?("\n"+body).slice(pos+marker.length).trim():"";
 if(releaseContext&&!RELEASE_CONTEXT_OPTIONS.includes(releaseContext as typeof RELEASE_CONTEXT_OPTIONS[number]))return null;
 if(recordingQuality&&!RECORDING_QUALITY_OPTIONS.includes(recordingQuality as typeof RECORDING_QUALITY_OPTIONS[number]))return null;
 return{releaseContext,recordingQuality,about};
}
