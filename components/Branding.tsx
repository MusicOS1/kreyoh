import Image from "next/image";

type BrandProps = {
  size?: number;
  className?: string;
  showTagline?: boolean;
};

const logo = "/branding/fackts-music-logo.png";

/** Uses the official supplied FACKTS Music artwork without alteration. */
export function FacktsMusicMark({ size = 40, className = "" }: BrandProps) {
  return (
    <Image
      src={logo}
      alt="FACKTS Music"
      width={size}
      height={size}
      className={`fackts-music-mark ${className}`}
      priority
    />
  );
}

export function FacktsMusicWordmark({
  height = 22,
  className = "",
}: { height?: number; className?: string }) {
  return (
    <span className={`fackts-music-wordmark ${className}`} style={{ fontSize: Math.max(14, height * 0.72) }}>
      <strong>FACKTS</strong> MUSIC
    </span>
  );
}

export function FacktsMusicLogo({ size = 38, className = "", showTagline = true }: BrandProps) {
  return (
    <span className={`fackts-music-logo-lockup ${className}`}>
      <FacktsMusicMark size={size} />
      <span className="fackts-music-logo-copy">
        <FacktsMusicWordmark height={20} />
        {showTagline && <small>A FACKTS Africa platform</small>}
      </span>
    </span>
  );
}

// Compatibility exports keep the existing component architecture intact.
export const KreyohMark = FacktsMusicMark;
export const KreyohWordmark = FacktsMusicWordmark;
export const KreyohLogo = FacktsMusicLogo;
