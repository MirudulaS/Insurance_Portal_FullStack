// Mimics the rejected-promise shape apiClient's interceptor produces, so
// client-side validation errors (e.g. file type/size checks before a
// request is even sent) look identical to a real API error to the caller.
export function mockError(message, status = 400) {
  return { status, message, raw: null };
}
