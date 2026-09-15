"use client";

import {useEffect} from "react";
import {usePathname} from "next/navigation";

export default function InboxShellEnhancer(){
  const pathname=usePathname();

  useEffect(()=>{
    const apply=()=>{
      const links=Array.from(
        document.querySelectorAll<HTMLAnchorElement>(
          '.kreyoh-app-shell a[href="/notifications"]'
        )
      );

      links.forEach((link)=>{
        link.href="/inbox";

        if(link.classList.contains("topbar-icon-button")){
          link.setAttribute("aria-label","Inbox");
          link.setAttribute("title","Inbox");
        }

        const label=link.querySelector<HTMLElement>(".nav-label");
        if(label)label.textContent="Inbox";

        const mobileLabel=link.querySelector<HTMLElement>("span:last-child");
        if(
          mobileLabel &&
          !mobileLabel.classList.contains("notification-count") &&
          /^(Alerts|Notifications)/i.test(mobileLabel.textContent||"")
        ){
          mobileLabel.textContent=(mobileLabel.textContent||"")
            .replace(/^Alerts/i,"Inbox")
            .replace(/^Notifications/i,"Inbox");
        }
      });
    };

    apply();
    const observer=new MutationObserver(apply);
    observer.observe(document.body,{childList:true,subtree:true});

    return()=>observer.disconnect();
  },[pathname]);

  return null;
}
