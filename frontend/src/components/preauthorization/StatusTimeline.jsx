import { Check } from 'lucide-react';
import { formatDateTime, statusLabel } from '../../utils/format';

export default function StatusTimeline({ history = [] }) {
  return (
    <ol className="space-y-0">
      {history.map((step, idx) => {
        const isLast = idx === history.length - 1;
        return (
          <li key={idx} className="relative flex gap-4 pb-6 last:pb-0">
            {!isLast && <span className="absolute left-[15px] top-8 h-[calc(100%-2rem)] w-px bg-border" />}
            <span
              className={`z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${
                isLast ? 'border-primary bg-primary text-white' : 'border-accent bg-surface text-accent'
              }`}
            >
              <Check className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1 pt-1">
              <p className="text-sm font-semibold text-ink">{statusLabel(step.status)}</p>
              <p className="text-xs text-muted">{formatDateTime(step.at)} · {step.by}</p>
              {step.note && <p className="mt-1 text-sm text-ink/80">{step.note}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
