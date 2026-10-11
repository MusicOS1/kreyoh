export const fanHeroAreas=[
 {id:"for-you",label:"Fan home / For You",fallback:"Find your frequency."},
 {id:"artists",label:"Explore artists",fallback:"Meet the artists."},
 {id:"albums",label:"Albums & EPs",fallback:"Albums & EPs"},
 {id:"shows",label:"Shows & sessions",fallback:"Shows"},
 {id:"billboard",label:"Billboard",fallback:"This week's chart"},
 {id:"library",label:"My Library",fallback:"Your music, your space."},
 {id:"following",label:"Following",fallback:"Your people. Your sound."},
 {id:"recent",label:"Recently played",fallback:"Pick up the rhythm."},
 {id:"profile",label:"Fan profile",fallback:"Make this space yours."},
 {id:"inbox",label:"Messages / Community",fallback:"Real conversations. Real connections."}
] as const;
export type FanHeroArea=typeof fanHeroAreas[number]["id"];
export type FanHeroConfig={
 area:FanHeroArea;enabled:boolean;title:string;eyebrow:string;description:string;
 image:string;releaseId:string;layout:"editorial"|"immersive"|"spotlight";
 ctaLabel:string;ctaHref:string;
};
export const heroKey=(area:FanHeroArea)=>"music_hero_"+area;
export const heroAreaForTab=(tab:string):FanHeroArea=>({
 "For You":"for-you","Artists":"artists","Albums & EPs":"albums","Shows":"shows","Billboard":"billboard",
 "My Library":"library","Following":"following","Recently played":"recent"
} as Record<string,FanHeroArea>)[tab]||"for-you";
