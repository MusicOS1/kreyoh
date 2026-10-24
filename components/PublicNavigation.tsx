import PublicNavigationClient from "./PublicNavigationClient";
import {returningUser} from "../lib/returningUser";
export default async function PublicNavigation() {
  return <PublicNavigationClient identity={await returningUser()}/>;
}
