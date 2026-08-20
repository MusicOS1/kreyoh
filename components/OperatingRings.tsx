type OperatingRingsProps = {
  progress: number;
  stage: string;
};

export default function OperatingRings({ progress, stage }: OperatingRingsProps) {
  const safeProgress = Math.max(0, Math.min(progress, 100));
  const circumference = 2 * Math.PI * 78;
  const offset = circumference - (safeProgress / 100) * circumference;

  return (
    <div className="operating-rings" aria-label={`${safeProgress}% project progress, ${stage} stage`}>
      <div className="operating-rings-orbit orbit-one" />
      <div className="operating-rings-orbit orbit-two" />
      <svg viewBox="0 0 210 210" role="img" aria-hidden="true">
        <circle cx="105" cy="105" r="88" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="1" />
        <circle cx="105" cy="105" r="78" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="8" />
        <circle
          cx="105"
          cy="105"
          r="78"
          fill="none"
          stroke="#4DA3FF"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 105 105)"
          className="operating-rings-progress"
        />
        <circle cx="105" cy="105" r="53" fill="rgba(7,21,36,.72)" stroke="rgba(245,165,36,.28)" strokeWidth="1" />
        <path d="M105 38v14M105 158v14M38 105h14M158 105h14" stroke="rgba(255,255,255,.35)" strokeWidth="2" strokeLinecap="round" />
        <circle cx="105" cy="105" r="4" fill="#F5A524" className="operating-rings-node" />
        <text x="105" y="101" textAnchor="middle" fill="#F7FAFF" fontSize="28" fontWeight="800">{safeProgress}%</text>
        <text x="105" y="121" textAnchor="middle" fill="#8FA4BC" fontSize="9" fontWeight="700" letterSpacing="1.8">LIVE SIGNAL</text>
      </svg>
      <div className="operating-rings-caption"><span /> {stage}</div>
    </div>
  );
}
