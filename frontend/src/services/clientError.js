// Builds an error with the same shape apiClient's interceptor produces, so
// client-side validation errors (e.g. file type/size checks before a request
// is sent) look identical to a server error for the caller.
export function clientError(message, status = 400) {
  return { status, message, raw: null };
}
