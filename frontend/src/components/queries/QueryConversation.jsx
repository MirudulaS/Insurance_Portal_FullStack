import { useRef, useState } from 'react';
import { Send, Paperclip, X, Loader2 } from 'lucide-react';
import { formatDateTime } from '../../utils/format';
import { validateFile } from '../../utils/fileValidation';
import StatusBadge from '../common/StatusBadge';

/**
 * canAttach + onUploadAttachment(file) -> Promise<{id, fileName}>:
 *   lets the hospital attach a document to its reply. The file is uploaded
 *   right away as an "Additional Document" on the request, and its id is sent
 *   with the message.
 * onRespond(text, attachmentIds)
 */
export default function QueryConversation({ query, currentUserRole, onRespond, onResolve, canResolve, canAttach, onUploadAttachment }) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [attachments, setAttachments] = useState([]); // [{ id, fileName }]
  const [attaching, setAttaching] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  const handleFile = async (file) => {
    if (!file) return;
    const { valid, error: err } = validateFile(file);
    if (!valid) {
      setError(err);
      return;
    }
    setError('');
    setAttaching(true);
    try {
      const doc = await onUploadAttachment(file);
      setAttachments((prev) => [...prev, { id: doc.id, fileName: doc.fileName }]);
    } catch (err) {
      setError(err.message || 'Unable to attach the file.');
    } finally {
      setAttaching(false);
    }
  };

  const handleSend = async () => {
    if (!text.trim()) return;
    setSending(true);
    setError('');
    try {
      await onRespond(text.trim(), attachments.map((a) => a.id));
      setText('');
      setAttachments([]);
    } catch (err) {
      setError(err.message || 'Unable to send your response.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-card border border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <p className="font-mono-ids text-xs text-muted">{query.id}</p>
          <p className="text-sm font-medium text-ink">Query on {query.preAuthorizationId}</p>
        </div>
        <StatusBadge status={query.status} />
      </div>

      <div className="max-h-80 space-y-4 overflow-y-auto px-4 py-4">
        {query.messages.map((msg) => {
          const isMine = msg.role === currentUserRole;
          return (
            <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-lg px-3.5 py-2.5 ${isMine ? 'bg-primary text-white' : 'bg-background text-ink'}`}>
                <p className={`text-[11px] font-medium ${isMine ? 'text-white/80' : 'text-muted'}`}>{msg.from}</p>
                <p className="mt-0.5 text-sm">{msg.text}</p>
                {msg.attachments?.length > 0 && (
                  <div className={`mt-1.5 flex items-center gap-1 text-xs ${isMine ? 'text-white/80' : 'text-muted'}`}>
                    <Paperclip className="h-3 w-3" />
                    {msg.attachments.length} attachment{msg.attachments.length > 1 ? 's' : ''}
                  </div>
                )}
                <p className={`mt-1 text-[10px] ${isMine ? 'text-white/70' : 'text-muted'}`}>{formatDateTime(msg.at)}</p>
              </div>
            </div>
          );
        })}
      </div>

      {query.status !== 'RESOLVED' && (
        <div className="border-t border-border p-3">
          {attachments.length > 0 && (
            <ul className="mb-2 flex flex-wrap gap-2">
              {attachments.map((a) => (
                <li key={a.id} className="flex items-center gap-1 rounded-full bg-background px-2.5 py-1 text-xs text-ink">
                  <Paperclip className="h-3 w-3" />
                  {a.fileName}
                  <button
                    onClick={() => setAttachments((prev) => prev.filter((x) => x.id !== a.id))}
                    aria-label={`Remove ${a.fileName}`}
                    className="text-muted hover:text-error"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex items-end gap-2">
            {canAttach && (
              <>
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={attaching}
                  aria-label="Attach a document"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border text-muted hover:bg-background disabled:opacity-50"
                >
                  {attaching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={(e) => {
                    handleFile(e.target.files?.[0]);
                    e.target.value = '';
                  }}
                />
              </>
            )}
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type your response…"
              rows={2}
              className="flex-1 resize-none rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-primary focus:outline-none"
            />
            <button
              onClick={handleSend}
              disabled={sending || attaching || !text.trim()}
              aria-label="Send response"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary text-white disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          {error && <p className="mt-2 text-xs text-error">{error}</p>}
          {canResolve && query.status === 'RESPONDED' && (
            <button onClick={onResolve} className="mt-2 text-xs font-medium text-success hover:underline">
              Mark query as resolved
            </button>
          )}
        </div>
      )}
    </div>
  );
}
