import { useRef, useState } from 'react';
import { UploadCloud, Loader2 } from 'lucide-react';
import { validateFile } from '../../utils/fileValidation';
import { ALLOWED_FILE_EXTENSIONS, MAX_FILE_SIZE_MB } from '../../config';

export default function FileUpload({ onUpload, uploading }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');

  const handleFile = (file) => {
    const { valid, error: err } = validateFile(file);
    if (!valid) {
      setError(err);
      return;
    }
    setError('');
    onUpload(file);
  };

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files?.[0];
          if (file) handleFile(file);
        }}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-card border-2 border-dashed p-6 text-center transition ${
          dragOver ? 'border-primary bg-primary/5' : 'border-border bg-background/40'
        }`}
      >
        {uploading ? (
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        ) : (
          <UploadCloud className="h-6 w-6 text-muted" />
        )}
        <p className="text-sm text-ink">
          <span className="font-medium text-primary">Click to upload</span> or drag and drop
        </p>
        <p className="text-xs text-muted">
          {ALLOWED_FILE_EXTENSIONS.join(', ').toUpperCase()} · up to {MAX_FILE_SIZE_MB}MB
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_FILE_EXTENSIONS.join(',')}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = '';
          }}
        />
      </div>
      {error && <p className="mt-1.5 text-xs text-error">{error}</p>}
    </div>
  );
}
