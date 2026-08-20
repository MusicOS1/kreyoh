type MetricCardProps = {
  label: string;
  value: string;
  note: string;
  warning?: boolean;
};

export default function MetricCard({
  label,
  value,
  note,
  warning = false,
}: MetricCardProps) {
  return (
    <article className="metric-card motion-card">
      <div className="metric-label">{label}</div>

      <div className="metric-row">
        <strong>{value}</strong>

        <span className={warning ? "metric-note warning" : "metric-note"}>
          {note}
        </span>
      </div>
    </article>
  );
}