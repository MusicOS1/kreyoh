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
   <section className="discovery-admin-stories" id="shows-editor">
    <h2>Shows, sessions & featured stories</h2>
    <p>Create a show once here. The featured published show becomes the main Shows hero automatically, with a clickable details page, artist lineup and programme. Upload the poster and save; no separate Shows hero setup is needed.</p>
    <details className="community-card" open><summary>Add a show or story</summary><DiscoveryEditor/></details>
    {items.map(item=><details className="community-card" key={item.id}><summary>{item.title} · {item.published?"Published":"Draft"}</summary><DiscoveryEditor item={item}/></details>)}
   </section>
 </main>;
}