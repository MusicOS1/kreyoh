import PublicNavigationClient from "./PublicNavigationClient";
import {returningUser} from "../lib/returningUser";

// Retain the homepage prop for existing callers; every public page shares one header.
export default async function PublicNavigation(_props:{homepage?:boolean}={}) {
  return <PublicNavigationClient identity={await returningUser()}/>;
}
