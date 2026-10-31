import { ROLES } from '../config';

// Returns the filter object each service call should use so a user only
// sees data relevant to their role. ADMIN sees everything (no filter keys).
export function scopeFilters(user) {
  if (!user) return {};
  switch (user.role) {
    case ROLES.PATIENT:
      return { patientId: user.linkedId };
    case ROLES.HOSPITAL:
      return { hospitalId: user.linkedId };
    case ROLES.INSURER:
      return { insurerId: user.linkedId };
    default:
      return {};
  }
}
