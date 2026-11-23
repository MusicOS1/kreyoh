"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function SupportLauncher() {
  const pathname = usePathname();
  // Do not cover Control Room controls or a conversation already open.
  if (pathname.startsWith("/admin") || pathname.startsWith("/support")) return null;
  return <Link href="/support" className="fm-support-launcher" aria-label="Talk to FACKTS Music support" title="Talk to FACKTS Music support">
    <span aria-hidden="true">?</span>
    <strong>Support</strong>
    <style>{`
      .fm-support-launcher{position:fixed;right:16px;bottom:calc(112px + env(safe-area-inset-bottom));z-index:28;
        display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:44px;padding:0 14px;
        color:#fff!important;background:#171717;border:1px solid #ff6a00;border-radius:999px;text-decoration:none!important;
        box-shadow:0 6px 18px rgba(0,0,0,.28);font:600 12px system-ui,sans-serif;transition:transform .18s ease,background .18s ease}
      .fm-support-launcher span{display:grid;place-items:center;width:24px;height:24px;color:#111;background:#ff6a00;border-radius:50%;font-weight:900;font-size:16px}
      .fm-support-launcher:hover{background:#292929;transform:translateY(-2px)}
      .fm-support-launcher:focus-visible{outline:2px solid #fff;outline-offset:3px}
      @media(min-width:850px){.fm-support-launcher{bottom:28px;right:24px}}
      @media(max-width:460px){.fm-support-launcher{width:44px;height:44px;padding:0;right:12px}.fm-support-launcher strong{position:absolute;clip:rect(0,0,0,0);width:1px;height:1px;overflow:hidden}}
      @media(prefers-reduced-motion:reduce){.fm-support-launcher{transition:none}.fm-support-launcher:hover{transform:none}}
    `}</style>
  </Link>;
}
