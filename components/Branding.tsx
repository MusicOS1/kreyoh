import React from "react";

type LogoProps = {
  size?: number;
  className?: string;
  variant?: "full" | "mark" | "wordmark";
  monochrome?: boolean;
};

/** KREYOH expressive signal mark: a disciplined K with a live studio orbit. */
export function KreyohMark({
  size = 32,
  className = "",
  monochrome = false,
}: {
  size?: number;
  className?: string;
  monochrome?: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect
        x="3"
        y="3"
        width="42"
        height="42"
        rx="13"
        fill={monochrome ? "currentColor" : "#071524"}
        stroke={monochrome ? "currentColor" : "rgba(255, 255, 255, 0.16)"}
        strokeWidth="1"
      />

      <path d="M14 11v26" stroke={monochrome ? "#071524" : "#4DA3FF"} strokeWidth="4.4" strokeLinecap="round" />
      <path d="M33.5 11.5 19 23.5" stroke={monochrome ? "#071524" : "#D8ECFF"} strokeWidth="4.4" strokeLinecap="round" />
      <path d="m22.5 21.5 12 15" stroke={monochrome ? "#071524" : "#2F8FFF"} strokeWidth="4.4" strokeLinecap="round" />
      <path d="M10 31.5c5.3 4.9 13.3 6.6 20.3 3.8 4.6-1.8 7.2-4.9 8.1-8.3" stroke={monochrome ? "#071524" : "#F5A524"} strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <circle cx="37.5" cy="25.2" r="2.1" fill={monochrome ? "#071524" : "#F5A524"} />
      <circle cx="14" cy="11" r="1.2" fill={monochrome ? "#071524" : "#FFFFFF"} />
    </svg>
  );
}

/**
 * KREYOH Primary Wordmark
 */
export function KreyohWordmark({
  height = 20,
  className = "",
}: {
  height?: number;
  className?: string;
}) {
  return (
    <svg
      height={height}
      viewBox="0 0 140 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <text
        x="0"
        y="21"
        fill="#FFFFFF"
        fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        fontSize="20"
        fontWeight="900"
        letterSpacing="0.22em"
      >
        KREYOH
      </text>
    </svg>
  );
}

/**
 * Combined Executive KREYOH Logo
 */
export function KreyohLogo({
  size = 36,
  className = "",
  showTagline = true,
}: {
  size?: number;
  className?: string;
  showTagline?: boolean;
}) {
  return (
    <div className={`kreyoh-logo-lockup ${className}`} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
      <KreyohMark size={size} />
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{
            fontSize: "14.5px",
            fontWeight: 900,
            letterSpacing: "0.2em",
            color: "#FFFFFF",
            lineHeight: 1,
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          }}>
            KREYOH
          </span>
          <span style={{
            fontSize: "8px",
            fontWeight: 800,
            letterSpacing: "0.08em",
            padding: "2px 5px",
            borderRadius: "4px",
            background: "rgba(47, 143, 255, 0.14)",
            border: "1px solid rgba(47, 143, 255, 0.34)",
            color: "#8FC5FF"
          }}>
            OS
          </span>
        </div>
        {showTagline && (
          <span style={{
            fontSize: "9px",
            fontWeight: 500,
            color: "#85889C",
            letterSpacing: "0.05em",
            marginTop: "3px"
          }}>
            Music Venture Operating System
          </span>
        )}
      </div>
    </div>
  );
}
