import { CheckCircle2, XCircle, AlertTriangle, FileText, Archive } from 'lucide-react';
import { formatDate, fileHref } from '../../utils/format';

const GROUPS = [
  { key: 'DETAILS', title: 'Required information' },
  { key: 'VAULT', title: 'Patient Document Vault', note: 'Reused automatically - no need to upload again for every request.' },
  { key: 'REQUEST', title: 'Documents for this treatment' },
];

/**
 * Pre-Authorization Readiness Check.
 * `readiness` comes straight from GET /preauthorizations/:id/readiness - the
 * same check the server runs again when the request is submitted.
 *
 * canUpload: only hospital staff, and only while the request is editable.
 * onUploadVault(type) / onUploadRequest(type): open the matching upload dialog.
 */
export default function ReadinessPanel({ readiness, canUpload, onUploadVault, onUploadRequest }) {
  const { ready, items, missing } = readiness;

  return (
    <div className="space-y-4">
      <div
        className={`rounded-card border p-4 ${ready ? 'border-success/30 bg-success/5' : 'border-warning/30 bg-warning/5'}`}
        role="status"
      >
        <div className="flex items-center gap-2">
          {ready ? <CheckCircle2 className="h-5 w-5 text-success" /> : <AlertTriangle className="h-5 w-5 text-warning" />}
          <p className="font-display text-sm font-semibold text-ink">
            {ready ? 'Ready for submission' : 'Not ready for submission'}
          </p>
        </div>
        {ready ? (
          <p className="mt-1 text-sm text-muted">All required information and documents are available.</p>
        ) : (
          <>
            <p className="mt-1 text-sm text-muted">Still needed before this can be sent to the insurer:</p>
            <ul className="mt-1.5 list-inside list-disc text-sm text-ink">
              {missing.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </>
        )}
      </div>

      {GROUPS.map((group) => {
        const groupItems = items.filter((i) => i.group === group.key);
        return (
          <section key={group.key}>
            <div className="mb-2 flex items-center gap-1.5">
              {group.key === 'VAULT' && <Archive className="h-4 w-4 text-secondary" />}
              <h4 className="text-sm font-semibold text-ink">{group.title}</h4>
            </div>
            {group.note && <p className="mb-2 text-xs text-muted">{group.note}</p>}
            <ul className="divide-y divide-border rounded-card border border-border bg-surface">
              {groupItems.map((item) => (
                <li key={item.key} className="flex items-start justify-between gap-3 px-4 py-3">
                  <div className="flex min-w-0 items-start gap-2.5">
                    {item.satisfied ? (
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                    ) : (
                      <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-error" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink">{item.label}</p>
                      {item.document ? (
                        <p className="flex items-center gap-1 truncate text-xs text-muted">
                          <FileText className="h-3 w-3 shrink-0" />
                          {item.document.fileUrl ? (
                            <a href={fileHref(item.document.fileUrl)} target="_blank" rel="noreferrer" className="truncate text-primary hover:underline">
                              {item.document.fileName}
                            </a>
                          ) : (
                            <span className="truncate">{item.document.fileName}</span>
                          )}
                          {item.document.expiryDate && <span className="shrink-0">· valid until {formatDate(item.document.expiryDate)}</span>}
                        </p>
                      ) : null}
                      {item.hint && <p className={`text-xs ${item.expired ? 'text-error' : 'text-muted'}`}>{item.hint}</p>}
                    </div>
                  </div>
                  {canUpload && !item.satisfied && item.group !== 'DETAILS' && (
                    <button
                      onClick={() => (item.group === 'VAULT' ? onUploadVault(item.key) : onUploadRequest(item.key))}
                      className="shrink-0 text-xs font-medium text-primary hover:underline"
                    >
                      {item.expired ? 'Replace' : 'Upload'}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
