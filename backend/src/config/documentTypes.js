// Single source of truth for which document types belong where.
//  - VAULT:   reusable, stored once per patient (patient_documents table)
//  - PREAUTH: specific to one pre-authorization request (documents table)
//  - CLAIM:   specific to one claim, after treatment (documents table)
const LABELS = {
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

const VAULT_TYPES = ['GOVERNMENT_ID', 'INSURANCE_CARD', 'POLICY_DOCUMENT'];
const PREAUTH_REQUIRED_TYPES = ['MEDICAL_REPORT', 'DOCTOR_PRESCRIPTION', 'DIAGNOSTIC_REPORT', 'TREATMENT_ESTIMATE'];
// ADDITIONAL_DOCUMENT is optional: used to answer insurer queries.
const PREAUTH_UPLOAD_TYPES = [...PREAUTH_REQUIRED_TYPES, 'ADDITIONAL_DOCUMENT'];
const CLAIM_UPLOAD_TYPES = ['HOSPITAL_BILL', 'DISCHARGE_SUMMARY'];

module.exports = { LABELS, VAULT_TYPES, PREAUTH_REQUIRED_TYPES, PREAUTH_UPLOAD_TYPES, CLAIM_UPLOAD_TYPES };
