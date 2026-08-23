"use client";

import {useEffect,useState} from "react";

type InstallPrompt=Event&{prompt:()=>Promise<void>;userChoice:Promise<{outcome:"accepted"|"dismissed"}>};

export default function InstallControlRoomButton(){
  const [prompt,setPrompt]=useState<InstallPrompt|null>(null);
  const [installed,setInstalled]=useState(false);
  const [help,setHelp]=useState(false);
  useEffect(()=>{setInstalled(window.matchMedia("(display-mode: standalone)").matches);const ready=(event:Event)=>{event.preventDefault();setPrompt(event as InstallPrompt)};const complete=()=>{setInstalled(true);setPrompt(null)};window.addEventListener("beforeinstallprompt",ready);window.addEventListener("appinstalled",complete);return()=>{window.removeEventListener("beforeinstallprompt",ready);window.removeEventListener("appinstalled",complete)}},[]);
  if(installed)return <span className="control-installed">Control Room installed</span>;
  const install=async()=>{if(!prompt){setHelp(true);return}await prompt.prompt();await prompt.userChoice;setPrompt(null)};
  return <div className="control-install-wrap"><button type="button" className="control-secondary-button" onClick={install}>Install Control Room</button>{help&&<small>Use your browser menu and choose Install FACKTS Music Control Room.</small>}</div>;
}
