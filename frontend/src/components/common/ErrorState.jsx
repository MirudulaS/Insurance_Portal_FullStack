import { AlertTriangle, RotateCcw } from 'lucide-react';

export default function ErrorState({ message = 'Something went wrong. Please try again.', onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-card border border-border bg-surface py-16 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-error/10">
        <AlertTriangle className="h-5 w-5 text-error" />
      </div>
      <p className="max-w-sm text-sm text-ink">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-1 inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-sm font-medium text-primary hover:bg-background"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Try again
        </button>
      )}
    </div>
  );
}
