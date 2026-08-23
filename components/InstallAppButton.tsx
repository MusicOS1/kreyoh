"use client";

import { useEffect, useState } from "react";
import { DownloadIcon } from "./Icons";

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function InstallAppButton() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(false);
  const [help, setHelp] = useState(false);

  useEffect(() => {
    setInstalled(window.matchMedia("(display-mode: standalone)").matches);
    const ready = (event: Event) => { event.preventDefault(); setPrompt(event as InstallPrompt); };
    const complete = () => { setInstalled(true); setPrompt(null); setHelp(false); };
    window.addEventListener("beforeinstallprompt", ready);
    window.addEventListener("appinstalled", complete);
    return () => { window.removeEventListener("beforeinstallprompt", ready); window.removeEventListener("appinstalled", complete); };
  }, []);

  if (installed) return <span className="public-install-confirmed">FACKTS Music is installed</span>;

  const install = async () => {
    if (!prompt) { setHelp(true); return; }
    await prompt.prompt();
    const choice = await prompt.userChoice;
    if (choice.outcome === "accepted") setHelp(false);
    setPrompt(null);
  };

  return <div className="public-install-wrap"><button type="button" className="public-button public-button-install" onClick={install}><DownloadIcon size={16}/><span>Install App</span></button>{help && <span className="public-install-help">On Chrome, open the browser menu and choose <b>Install FACKTS Music</b>. On iPhone, use Share → Add to Home Screen.</span>}</div>;
}
