/**
 * Central configuration. The backend URL comes from VITE_API_BASE_URL
 * (see .env); nothing else in the app hard-codes it.
 */

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export const APP_NAME = 'PreAuth & Claims Tracker';

export const ROLES = {
  PATIENT: 'PATIENT',
  HOSPITAL: 'HOSPITAL',
  INSURER: 'INSURER',
  ADMIN: 'ADMIN',
};

export const PREAUTH_STATUS = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  UNDER_REVIEW: 'UNDER_REVIEW',
  QUERY_RAISED: 'QUERY_RAISED',
  RESUBMITTED: 'RESUBMITTED',
  APPROVED: 'APPROVED',
  PARTIALLY_APPROVED: 'PARTIALLY_APPROVED',
  REJECTED: 'REJECTED',
};

export const CLAIM_STATUS = {
  CLAIM_SUBMITTED: 'CLAIM_SUBMITTED',
  UNDER_VERIFICATION: 'UNDER_VERIFICATION',
  QUERY_RAISED: 'QUERY_RAISED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  SETTLEMENT_PROCESSED: 'SETTLEMENT_PROCESSED',
  SETTLED: 'SETTLED',
};

export const QUERY_STATUS = {
  OPEN: 'OPEN',
  RESPONDED: 'RESPONDED',
  RESOLVED: 'RESOLVED',
};

// Where each kind of document lives:
//  VAULT   - reusable, stored once per patient (Patient Document Vault)
//  REQUEST - specific to one pre-authorization (the treatment)
//  CLAIM   - specific to one claim (after treatment)
export const VAULT_DOCUMENT_TYPES = ['GOVERNMENT_ID', 'INSURANCE_CARD', 'POLICY_DOCUMENT'];
export const REQUEST_DOCUMENT_TYPES = ['MEDICAL_REPORT', 'DOCTOR_PRESCRIPTION', 'DIAGNOSTIC_REPORT', 'TREATMENT_ESTIMATE'];
export const CLAIM_DOCUMENT_TYPES = ['HOSPITAL_BILL', 'DISCHARGE_SUMMARY'];

export const DOCUMENT_TYPE_LABELS = {
  GOVERNMENT_ID: 'Government ID',
  INSURANCE_CARD: 'Insurance Card',
  POLICY_DOCUMENT: 'Policy Document',
  MEDICAL_REPORT: 'Medical Report',
  DOCTOR_PRESCRIPTION: 'Doctor Prescription',
  DIAGNOSTIC_REPORT: 'Diagnostic Report',
  TREATMENT_ESTIMATE: 'Treatment Estimate',
  ADDITIONAL_DOCUMENT: 'Additional Document',
  HOSPITAL_BILL: 'Hospital Bill',
  DISCHARGE_SUMMARY: 'Discharge Summary',
};

export const ALLOWED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
export const ALLOWED_FILE_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];
export const MAX_FILE_SIZE_MB = 5;
