"use client";

import { useEffect, useRef } from "react";

export default function LoginAtmosphere() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const updatePointer = (event: PointerEvent) => {
      root.style.setProperty("--login-pointer-x", `${Math.round((event.clientX / window.innerWidth) * 100)}%`);
      root.style.setProperty("--login-pointer-y", `${Math.round((event.clientY / window.innerHeight) * 100)}%`);
    };

    window.addEventListener("pointermove", updatePointer, { passive: true });
    return () => window.removeEventListener("pointermove", updatePointer);
  }, []);

  return (
    <div ref={rootRef} className="login-atmosphere" aria-hidden="true">
      <div className="login-atmosphere-light" />
      <div className="login-atmosphere-ripple login-atmosphere-ripple-one" />
      <div className="login-atmosphere-ripple login-atmosphere-ripple-two" />
      <div className="login-atmosphere-grain" />
    </div>
  );
}
