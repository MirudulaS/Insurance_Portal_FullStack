import { ALLOWED_FILE_TYPES, ALLOWED_FILE_EXTENSIONS, MAX_FILE_SIZE_MB } from '../config';

export function validateFile(file) {
  if (!file) return { valid: false, error: 'Please choose a file to upload.' };

  const extension = `.${file.name.split('.').pop().toLowerCase()}`;
  const typeOk = ALLOWED_FILE_TYPES.includes(file.type) || ALLOWED_FILE_EXTENSIONS.includes(extension);
  if (!typeOk) {
    return { valid: false, error: 'Only PDF, JPG, JPEG and PNG files are allowed.' };
  }

  const sizeMb = file.size / (1024 * 1024);
  if (sizeMb > MAX_FILE_SIZE_MB) {
    return { valid: false, error: `File must be smaller than ${MAX_FILE_SIZE_MB} MB.` };
  }

  return { valid: true, error: null };
}

export function formatFileSize(bytes) {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
