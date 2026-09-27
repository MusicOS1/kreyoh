import AppShell from "../../components/AppShell";
import MusicHelper from "../../components/MusicHelper";
import {getWorkspace} from "../../lib/workspace";
export default async function HelpPage() {
  const {membership}=await getWorkspace();
  return <AppShell><MusicHelper aiEnabled={Boolean(membership&&process.env.FACKTS_AI_HELPER_ENABLED==="true"&&process.env.OPENAI_API_KEY&&process.env.OPENAI_HELPER_MODEL)}/></AppShell>;
}
