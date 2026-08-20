type ProjectProgressProps = {
  progress: number;
};

export default function ProjectProgress({
  progress,
}: ProjectProgressProps) {
  const safeProgress = Math.max(0, Math.min(progress, 100));

  return (
    <div className="progress-wrap">
      <div className="progress-head">
        <div>
          <span>PROJECT HEALTH</span>
          <strong>{safeProgress}% complete</strong>
        </div>

        <span className="phase-pill">Production</span>
      </div>

      <div className="progress-track">
        <div
          className="progress-fill"
          style={{ width: `${safeProgress}%` }}
        />
      </div>

      <div className="progress-legend">
        <span>Setup</span>
        <span>Writing</span>
        <span className="current">Production</span>
        <span>Rights</span>
        <span>Release ready</span>
      </div>
    </div>
  );
}