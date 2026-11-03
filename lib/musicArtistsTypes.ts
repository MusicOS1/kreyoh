export type ArtistPick = {title:string;url:string};
export type MusicArtist={
 id:string;name:string;avatar:string|null;hero:string|null;bio:string;tagline:string;
 location:string;genres:string[];slug:string;roles:string[];
 // Only public, artist-supplied promotional fields. Never expose account/contact data.
 socialUrl?:string|null;streamingUrl?:string|null;
 topSongs?:ArtistPick[];photos?:string[];achievements?:string[];
 interview?:{title:string;url:string}|null;
};
