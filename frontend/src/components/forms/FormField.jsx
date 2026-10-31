import { cloneElement, isValidElement, useId } from 'react';

export default function FormField({ label, htmlFor, error, hint, required, children }) {
  // Every label is linked to its control, even when the caller does not pass
  // htmlFor: the generated id is injected into the single child element.
  const generatedId = useId();
  const controlId = htmlFor || (isValidElement(children) && children.props.id) || generatedId;
  const describedBy = error ? `${controlId}-error` : hint ? `${controlId}-hint` : undefined;
  const control = isValidElement(children)
    ? cloneElement(children, {
        id: controlId,
        'aria-describedby': describedBy,
        'aria-invalid': error ? true : undefined,
        'aria-required': required ? true : undefined,
      })
    : children;

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={controlId} className="block text-sm font-medium text-ink">
          {label} {required && <span className="text-error" aria-hidden="true">*</span>}
        </label>
      )}
      {control}
      {hint && !error && <p id={`${controlId}-hint`} className="text-xs text-muted">{hint}</p>}
      {error && <p id={`${controlId}-error`} role="alert" className="text-xs text-error">{error}</p>}
    </div>
  );
}

export function TextInput(props) {
  return (
    <input
      {...props}
      className={`w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-primary focus:outline-none ${props.className || ''}`}
    />
  );
}

export function TextArea(props) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-primary focus:outline-none ${props.className || ''}`}
    />
  );
}

export function Select({ options, ...props }) {
  return (
    <select
      {...props}
      className={`w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none ${props.className || ''}`}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
