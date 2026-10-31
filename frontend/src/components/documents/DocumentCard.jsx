import { Eye, FileText, Image as ImageIcon, Trash2 } from 'lucide-react';
import { DOCUMENT_TYPE_LABELS } from '../../config';
import { formatFileSize } from '../../utils/fileValidation';
import { formatDateTime, fileHref } from '../../utils/format';

export default function DocumentCard({ document, onRemove }) {
  const isImage = document.mimeType?.startsWith('image/');

  return (
    <div className="flex items-center gap-3 rounded-card border border-border bg-surface p-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        {isImage ? <ImageIcon className="h-5 w-5 text-primary" /> : <FileText className="h-5 w-5 text-primary" />}
      </div>
      <div className="min-w-0 flex-1">
        {document.fileUrl ? (
          <a href={fileHref(document.fileUrl)} target="_blank" rel="noreferrer" className="block truncate text-sm font-medium text-primary hover:underline">
            {document.fileName}
          </a>
        ) : (
          <p className="truncate text-sm font-medium text-ink">{document.fileName}</p>
        )}
        <p className="text-xs text-muted">
          {DOCUMENT_TYPE_LABELS[document.type] || document.type} · {formatFileSize(document.fileSize)} · {formatDateTime(document.uploadedAt)}
        </p>
      </div>
      {document.fileUrl && (
        <a
          href={fileHref(document.fileUrl)}
          target="_blank"
          rel="noreferrer"
          className="flex shrink-0 items-center gap-1 rounded-md border border-primary px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary/5"
        >
          <Eye className="h-3.5 w-3.5" />
          View
        </a>
      )}
      {onRemove && (
        <button onClick={() => onRemove(document.id)} className="shrink-0 rounded-md p-1.5 text-muted hover:bg-error/10 hover:text-error">
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
