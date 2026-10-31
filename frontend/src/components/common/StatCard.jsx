export default function StatCard({ label, value, icon: Icon, hint, onClick }) {
  const Wrapper = onClick ? 'button' : 'div';
  return (
    <Wrapper
      onClick={onClick}
      className={`flex items-center gap-4 rounded-card border border-border bg-surface p-4 text-left shadow-card ${
        onClick ? 'transition hover:border-primary/40 hover:shadow-pop' : ''
      }`}
    >
      {Icon && (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      )}
      <div className="min-w-0">
        <p className="truncate text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
        <p className="font-display text-2xl font-semibold text-ink">{value}</p>
        {hint && <p className="truncate text-xs text-muted">{hint}</p>}
      </div>
    </Wrapper>
  );
}
