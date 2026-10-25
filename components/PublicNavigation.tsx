import HomepageNavigationClient from "./HomepageNavigationClient";
import PublicNavigationClient from "./PublicNavigationClient";
import {returningUser} from "../lib/returningUser";
export default async function PublicNavigation({homepage=false}:{homepage?:boolean}) {
  const identity=await returningUser();
  return homepage ? <HomepageNavigationClient identity={identity}/> : <PublicNavigationClient identity={identity}/>;
}
