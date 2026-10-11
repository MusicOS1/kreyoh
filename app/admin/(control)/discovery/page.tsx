import {requireControlRoomPermission} from "../../../../lib/controlRoom";
import {discoveryContent} from "../../../../lib/discoveryContent";
import {fanHeroSettings} from "../../../../lib/fanHero";
import {chart} from "../../../../lib/community";
import DiscoveryEditor from "../../../../components/DiscoveryEditor";
import HeroAdminPanel from "../../../../components/HeroAdminPanel";
export default async function DiscoveryAdmin(){
 await requireControlRoomPermission("music");
 const [items,heroes,artwork]=await Promise.all([discoveryContent(true),fanHeroSettings(),chart()]);
 return <main className="community-page">
   <h1>Music discovery & heroes</h1>
   <HeroAdminPanel configs={heroes} artwork={artwork.map(item=>({id:item.id,title:item.title,artist_name:item.artist_name,has_cover:Boolean(item.has_cover)}))}/>
   <section className="discovery-admin-stories">
    <h2>Shows, sessions & featured stories</h2>
    <p>Manage the editorial shelves fans see when browsing. Save drafts or select Show publicly to publish.</p>
    <details className="community-card"><summary>Add content</summary><DiscoveryEditor/></details>
    {items.map(item=><details className="community-card" key={item.id}><summary>{item.title} · {item.published?"Published":"Draft"}</summary><DiscoveryEditor item={item}/></details>)}
   </section>
 </main>;
}