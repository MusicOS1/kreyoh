type AmbientMusicAtmosphereProps = {
  variant?: "shell" | "intro" | "sessions" | "beats" | "journey";
};

export default function AmbientMusicAtmosphere({ variant = "shell" }: AmbientMusicAtmosphereProps) {
  return (
    <div className={`ambient-music-atmosphere ambient-music-${variant}`} aria-hidden="true">
      <svg className="ambient-music-svg" viewBox="0 0 800 260" preserveAspectRatio="none" fill="none">
        <g className="ambient-object ambient-microphone">
          <path className="ambient-line" d="M126 47v48c0 25 17 43 39 43s39-18 39-43V47c0-22-17-38-39-38s-39 16-39 38Z" />
          <path className="ambient-line" d="M108 83v13c0 34 25 60 57 60s57-26 57-60V83M165 156v32M138 188h54" />
        </g>

        <g className="ambient-object ambient-speaker">
          <rect className="ambient-line" x="610" y="40" width="82" height="142" rx="8" />
          <circle className="ambient-line" cx="651" cy="83" r="19" />
          <circle className="ambient-line" cx="651" cy="137" r="29" />
          <path className="ambient-speaker-pulse" d="M700 73c14 10 14 37 0 47M715 58c25 21 25 61 0 82" />
        </g>

        <g className="ambient-object ambient-notepad">
          <path className="ambient-line" d="m316 47 108-21 27 132-108 22z" />
          <path className="ambient-line ambient-note-rule" d="m337 72 73-14M342 91l76-14M347 111l54-10M352 130l65-13" />
          <path className="ambient-line" d="m371 158 21-4" />
        </g>

        <g className="ambient-crowd">
          <path className="ambient-silhouette" d="M0 231c18-31 32-45 49-45 16 0 28 13 38 42 9-50 28-73 51-73 23 0 39 25 48 75 11-39 26-58 44-58 18 0 32 21 43 59 15-63 35-94 61-94 26 0 44 32 55 96 11-49 28-73 50-73 21 0 37 25 49 74 12-37 27-56 45-56 17 0 32 18 44 54 13-33 28-49 47-49 18 0 35 17 51 51 16-42 34-62 55-62 20 0 38 20 55 60 12-42 29-63 50-63 21 0 39 20 55 61" />
        </g>

        <path className="ambient-wave ambient-wave-one" d="M0 205c39-26 58 26 97 0s58-26 97 0 58 26 97 0 58-26 97 0 58 26 97 0 58-26 97 0 58 26 97 0 58-26 97 0 58 26 97 0" />
        <path className="ambient-wave ambient-wave-two" d="M0 215c39-20 58 20 97 0s58-20 97 0 58 20 97 0 58-20 97 0 58 20 97 0 58-20 97 0 58 20 97 0 58-20 97 0 58 20 97 0" />
      </svg>
    </div>
  );
}
