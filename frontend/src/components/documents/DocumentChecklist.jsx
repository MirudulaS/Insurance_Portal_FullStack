import { CheckCircle2, Circle } from 'lucide-react';
import { DOCUMENT_TYPE_LABELS } from '../../config';

export default function DocumentChecklist({ checklist, onUploadClick }) {
  const completed = checklist.filter((c) => c.uploaded).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-ink">Required documents</p>
        <p className="text-xs text-muted">
          {completed} of {checklist.length} uploaded
        </p>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
        <div className="h-full bg-success transition-all" style={{ width: `${(completed / checklist.length) * 100}%` }} />
      </div>
      <ul className="divide-y divide-border rounded-card border border-border bg-surface">
        {checklist.map((item) => (
          <li key={item.type} className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2.5">
              {item.uploaded ? (
                <CheckCircle2 className="h-5 w-5 text-success" />
              ) : (
                <Circle className="h-5 w-5 text-muted" />
              )}
              <span className={`text-sm ${item.uploaded ? 'text-ink' : 'text-muted'}`}>{DOCUMENT_TYPE_LABELS[item.type]}</span>
            </div>
            {!item.uploaded && onUploadClick && (
              <button onClick={() => onUploadClick(item.type)} className="text-xs font-medium text-primary hover:underline">
                Upload
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
