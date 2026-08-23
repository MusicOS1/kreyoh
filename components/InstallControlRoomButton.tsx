"use client";

import {useEffect,useState} from "react";

type InstallPrompt=Event&{prompt:()=>Promise<void>;userChoice:Promise<{outcome:"accepted"|"dismissed"}>};

export default function InstallControlRoomButton(){
  const [prompt,setPrompt]=useState<InstallPrompt|null>(null);
  const [installed,setInstalled]=useState(false);
  const [help,setHelp]=useState(false);
  useEffect(()=>{const standalone=window.matchMedia("(display-mode: standalone)").matches;setInstalled(standalone||localStorage.getItem("fackts-music-installed")==="1");const ready=(event:Event)=>{event.preventDefault();setPrompt(event as InstallPrompt)};const complete=()=>{localStorage.setItem("fackts-music-installed","1");setInstalled(true);setPrompt(null)};window.addEventListener("beforeinstallprompt",ready);window.addEventListener("appinstalled",complete);return()=>{window.removeEventListener("beforeinstallprompt",ready);window.removeEventListener("appinstalled",complete)}},[]);
  if(installed)return <span className="control-installed">Available in your installed FACKTS Music app</span>;
  const install=async()=>{if(!prompt){setHelp(true);return}await prompt.prompt();const choice=await prompt.userChoice;if(choice.outcome==="accepted")localStorage.setItem("fackts-music-installed","1");setPrompt(null)};
  return <div className="control-install-wrap"><button type="button" className="control-secondary-button" onClick={install}>Install FACKTS Music</button>{help&&<small>If Chrome says it is already installed, open the existing FACKTS Music app. The Control Room is included inside it.</small>}</div>;
}
