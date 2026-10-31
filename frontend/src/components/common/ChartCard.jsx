export default function ChartCard({ title, subtitle, children, className = '' }) {
  return (
    <div className={`rounded-card border border-border bg-surface p-4 shadow-card ${className}`}>
      <div className="mb-3">
        <h3 className="font-display text-sm font-semibold text-ink">{title}</h3>
        {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
