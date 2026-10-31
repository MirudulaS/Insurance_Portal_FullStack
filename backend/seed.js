/* eslint-disable no-console */
// Populates the database with the same demo data the frontend's mock
// services ship with, so the walkthrough in the frontend README behaves
// identically once USE_MOCK is flipped to false.
//
// Usage: node seed.js   (run after `mysql ... < schema.sql`)

require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('./src/db/pool');

async function run() {
  const conn = await pool.getConnection();
  try {
    console.log('Clearing existing data...');
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const table of [
      'audit_logs', 'notifications', 'patient_documents', 'claim_status_history', 'claims',
      'query_messages', 'queries', 'documents', 'preauth_status_history',
      'preauthorizations', 'patients', 'insurers', 'hospitals', 'users',
    ]) {
      await conn.query(`TRUNCATE TABLE ${table}`);
    }
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');

    const pw = await bcrypt.hash('demo123', 10);

    console.log('Seeding hospitals & insurers...');
    await conn.query(
      `INSERT INTO hospitals (id, name, city, registration_no, contact_email, contact_phone) VALUES
       ('HOS-1001','Apollo Care Multispeciality Hospital','Coimbatore','TN-HSP-4471','desk@apollocare.example','+91 422 445 6600'),
       ('HOS-1002','Sri Ramakrishna Hospital','Coimbatore','TN-HSP-2290','frontdesk@srhospital.example','+91 422 331 7788')`
    );
    await conn.query(
      `INSERT INTO insurers (id, name, ircda_code, contact_email, contact_phone) VALUES
       ('INR-1001','Star Health & Allied Insurance','IRDA-SH-0912','claims@starhealth.example','+91 44 2872 0000'),
       ('INR-1002','National Wellness Insurance Co.','IRDA-NW-0447','preauth@nationalwellness.example','+91 44 4090 1122')`
    );

    console.log('Seeding users...');
    const users = [
      ['USR-1001', 'Arun Kumar', 'patient@demo.com', 'PATIENT', 'PAT-1001', '+91 98765 43210', '#1F4E5F'],
      ['USR-1002', 'Dr. Meena Raghunathan', 'hospital@demo.com', 'HOSPITAL', 'HOS-1001', '+91 98450 11223', '#4F7C82'],
      ['USR-1003', 'Karthik Subramaniam', 'insurer@demo.com', 'INSURER', 'INR-1001', '+91 90031 55678', '#7BA7A7'],
      ['USR-1004', 'Priyanka Sundaram', 'admin@demo.com', 'ADMIN', null, '+91 91234 98765', '#173C49'],
      ['USR-1005', 'Divya Prakash', 'patient2@demo.com', 'PATIENT', 'PAT-1002', '+91 99887 66554', '#1F4E5F'],
      // Every patient has their OWN login and sees only their own record.
      ['USR-1006', 'Ganesh Moorthy', 'ganesh@demo.com', 'PATIENT', 'PAT-1003', '+91 90000 12121', '#1F4E5F'],
      ['USR-1007', 'Lakshmi Narayanan', 'lakshmi@demo.com', 'PATIENT', 'PAT-1004', '+91 96000 54545', '#1F4E5F'],
    ];
    for (const [id, name, email, role, linkedId, phone, color] of users) {
      await conn.query('INSERT INTO users (id, name, email, password_hash, role, linked_id, phone, avatar_color) VALUES (?,?,?,?,?,?,?,?)', [
        id, name, email, pw, role, linkedId, phone, color,
      ]);
    }

    console.log('Seeding patients...');
    await conn.query(
      `INSERT INTO patients (id, user_id, name, age, gender, phone, email, address, policy_number, insurer_id, primary_hospital_id, blood_group) VALUES
       ('PAT-1001','USR-1001','Arun Kumar',46,'Male','+91 98765 43210','patient@demo.com','14 Race Course Road, Coimbatore, TN','SH-POL-778291','INR-1001','HOS-1001','B+'),
       ('PAT-1002','USR-1005','Divya Prakash',34,'Female','+91 99887 66554','patient2@demo.com','22 Avinashi Road, Coimbatore, TN','NW-POL-334102','INR-1002','HOS-1002','O+'),
       ('PAT-1003','USR-1006','Ganesh Moorthy',58,'Male','+91 90000 12121','ganesh@demo.com','9 DB Road, RS Puram, Coimbatore, TN','SH-POL-991027','INR-1001','HOS-1001','A+'),
       ('PAT-1004','USR-1007','Lakshmi Narayanan',29,'Female','+91 96000 54545','lakshmi@demo.com','3 Trichy Road, Coimbatore, TN','SH-POL-552091','INR-1001','HOS-1001','AB+')`
    );

    console.log('Seeding pre-authorizations + history...');
    await conn.query(
      `INSERT INTO preauthorizations (id, patient_id, hospital_id, insurer_id, policy_number, diagnosis, treatment, doctor, estimated_cost, admission_date, expected_discharge_date, status, approved_amount, reviewer, remarks) VALUES
       ('PA-1001','PAT-1001','HOS-1001','INR-1001','SH-POL-778291','Coronary artery blockage (double vessel disease)','Percutaneous Coronary Angioplasty with stent placement','Dr. Meena Raghunathan',285000,'2026-08-12','2026-08-16','APPROVED',265000,'Karthik Subramaniam','Approved after additional diagnostic report confirmed severity.'),
       ('PA-1002','PAT-1002','HOS-1002','INR-1002','NW-POL-334102','Gallstones with cholecystitis','Laparoscopic Cholecystectomy','Dr. Suresh Iyer',95000,'2026-08-06','2026-08-09','REJECTED',0,'National Wellness Review Desk','Policy is within the 90-day waiting period for this procedure.'),
       ('PA-1003','PAT-1003','HOS-1001','INR-1001','SH-POL-991027','Right knee osteoarthritis, grade 3','Total Knee Replacement (unilateral)','Dr. Meena Raghunathan',340000,'2026-08-18','2026-08-24','PARTIALLY_APPROVED',240000,'Karthik Subramaniam','Implant brand cost capped as per policy sub-limit.'),
       ('PA-1004','PAT-1004','HOS-1001','INR-1001','SH-POL-552091','Third trimester pregnancy, planned caesarean','Elective Lower Segment Caesarean Section','Dr. Kavitha Ram',120000,'2026-09-02','2026-09-06','DRAFT',NULL,NULL,''),
       ('PA-1005','PAT-1003','HOS-1001','INR-1001','SH-POL-991027','Cataract, left eye','Phacoemulsification with IOL implant','Dr. Anand Vishwanathan',48000,'2026-08-29','2026-08-29','UNDER_REVIEW',NULL,'Karthik Subramaniam','')`
    );

    const history = [
      ['PA-1001', 'DRAFT', 'Dr. Meena Raghunathan', 'Draft created for cardiac procedure.', '2026-08-09 04:30:00'],
      ['PA-1001', 'SUBMITTED', 'Dr. Meena Raghunathan', 'Submitted with initial 5 documents.', '2026-08-10 06:20:00'],
      ['PA-1001', 'UNDER_REVIEW', 'Karthik Subramaniam', 'Assigned for insurer review.', '2026-08-10 09:15:00'],
      ['PA-1001', 'QUERY_RAISED', 'Karthik Subramaniam', 'Requested angiogram diagnostic report for confirmation.', '2026-08-10 13:40:00'],
      ['PA-1001', 'RESUBMITTED', 'Dr. Meena Raghunathan', 'Angiogram report uploaded and query answered.', '2026-08-11 10:05:00'],
      ['PA-1001', 'UNDER_REVIEW', 'Karthik Subramaniam', 'Re-assigned for final review.', '2026-08-11 10:10:00'],
      ['PA-1001', 'APPROVED', 'Karthik Subramaniam', 'Approved at 265,000 (5% co-pay adjustment applied).', '2026-08-13 11:05:00'],
      ['PA-1002', 'DRAFT', 'Sri Ramakrishna Hospital Desk', 'Request drafted.', '2026-08-04 05:00:00'],
      ['PA-1002', 'SUBMITTED', 'Sri Ramakrishna Hospital Desk', 'Submitted with documents.', '2026-08-05 05:05:00'],
      ['PA-1002', 'UNDER_REVIEW', 'National Wellness Review Desk', 'Under review.', '2026-08-05 09:00:00'],
      ['PA-1002', 'REJECTED', 'National Wellness Review Desk', 'Waiting period clause applies to this diagnosis.', '2026-08-06 08:30:00'],
      ['PA-1003', 'DRAFT', 'Apollo Care Hospital Desk', 'Request drafted.', '2026-08-14 04:00:00'],
      ['PA-1003', 'SUBMITTED', 'Apollo Care Hospital Desk', 'Submitted with documents.', '2026-08-14 09:00:00'],
      ['PA-1003', 'UNDER_REVIEW', 'Karthik Subramaniam', 'Under review.', '2026-08-15 06:30:00'],
      ['PA-1003', 'PARTIALLY_APPROVED', 'Karthik Subramaniam', 'Implant sub-limit applied; balance payable by patient.', '2026-08-16 07:20:00'],
      ['PA-1004', 'DRAFT', 'Apollo Care Hospital Desk', 'Draft created, documents pending.', '2026-08-24 05:45:00'],
      ['PA-1005', 'DRAFT', 'Apollo Care Hospital Desk', 'Draft created.', '2026-08-25 06:00:00'],
      ['PA-1005', 'SUBMITTED', 'Apollo Care Hospital Desk', 'Submitted with documents.', '2026-08-25 08:30:00'],
      ['PA-1005', 'UNDER_REVIEW', 'Karthik Subramaniam', 'Assigned for review.', '2026-08-25 10:00:00'],
    ];
    for (const [preauthId, status, by, note, at] of history) {
      await conn.query('INSERT INTO preauth_status_history (preauth_id, status, by_name, note, at) VALUES (?,?,?,?,?)', [preauthId, status, by, note, at]);
    }

    console.log('Seeding patient document vault...');
    const vault = [
      ['PDOC-1001', 'PAT-1001', 'GOVERNMENT_ID', 'aadhaar_arun.pdf', 310000, 'application/pdf', '2035-12-31', 'USR-1001'],
      ['PDOC-1002', 'PAT-1001', 'INSURANCE_CARD', 'insurance_card_arun.pdf', 482000, 'application/pdf', '2027-03-31', 'USR-1001'],
      ['PDOC-1003', 'PAT-1001', 'POLICY_DOCUMENT', 'policy_arun.pdf', 910000, 'application/pdf', '2027-03-31', 'USR-1001'],
      ['PDOC-1004', 'PAT-1002', 'GOVERNMENT_ID', 'voter_id_divya.jpg', 220000, 'image/jpeg', null, 'USR-1002'],
      ['PDOC-1005', 'PAT-1002', 'INSURANCE_CARD', 'insurance_card_divya.pdf', 402000, 'application/pdf', '2027-01-31', 'USR-1002'],
      ['PDOC-1006', 'PAT-1002', 'POLICY_DOCUMENT', 'policy_divya.pdf', 870000, 'application/pdf', '2027-01-31', 'USR-1002'],
      ['PDOC-1007', 'PAT-1003', 'GOVERNMENT_ID', 'aadhaar_ganesh.pdf', 305000, 'application/pdf', null, 'USR-1002'],
      ['PDOC-1008', 'PAT-1003', 'INSURANCE_CARD', 'insurance_card_ganesh.pdf', 450000, 'application/pdf', '2027-06-30', 'USR-1002'],
      ['PDOC-1009', 'PAT-1003', 'POLICY_DOCUMENT', 'policy_ganesh.pdf', 880000, 'application/pdf', '2027-06-30', 'USR-1002'],
      // PAT-1004 is deliberately incomplete: Government ID is EXPIRED, Policy Document is missing.
      ['PDOC-1010', 'PAT-1004', 'GOVERNMENT_ID', 'old_id_lakshmi.pdf', 300000, 'application/pdf', '2025-01-01', 'USR-1002'],
      ['PDOC-1011', 'PAT-1004', 'INSURANCE_CARD', 'insurance_card_lakshmi.pdf', 420000, 'application/pdf', '2027-09-30', 'USR-1002'],
    ];
    for (const [id, patientId, type, fileName, size, mime, expiry, uploadedBy] of vault) {
      await conn.query('INSERT INTO patient_documents (id, patient_id, type, file_name, file_size, mime_type, expiry_date, uploaded_by) VALUES (?,?,?,?,?,?,?,?)', [
        id, patientId, type, fileName, size, mime, expiry, uploadedBy,
      ]);
    }

    console.log('Seeding request & claim documents...');
    // PA-1001..PA-1003 and PA-1005 already have their treatment documents; PA-1004 (draft) has none.
    const requestTypes = [
      ['MEDICAL_REPORT', 'medical_report', 1240000],
      ['DOCTOR_PRESCRIPTION', 'prescription', 198000],
      ['TREATMENT_ESTIMATE', 'treatment_estimate', 275000],
      ['DIAGNOSTIC_REPORT', 'diagnostic_report', 2100000],
    ];
    const documents = [];
    let docNo = 1001;
    for (const [paId, hospital, who] of [['PA-1001', 'HOS-1001', 'arun'], ['PA-1002', 'HOS-1002', 'divya'], ['PA-1003', 'HOS-1001', 'ganesh'], ['PA-1005', 'HOS-1001', 'ganesh']]) {
      for (const [type, base, size] of requestTypes) {
        documents.push([`DOC-${docNo++}`, paId, null, type, `${base}_${who}.pdf`, size, 'application/pdf', hospital]);
      }
    }
    documents.push([`DOC-${docNo++}`, null, 'CLM-1001', 'HOSPITAL_BILL', 'final_bill_arun.pdf', 512000, 'application/pdf', 'HOS-1001']);
    documents.push([`DOC-${docNo++}`, null, 'CLM-1002', 'HOSPITAL_BILL', 'final_bill_ganesh.pdf', 640000, 'application/pdf', 'HOS-1001']);
    for (const [id, preauthId, claimId, type, fileName, size, mime, uploadedBy] of documents) {
      await conn.query('INSERT INTO documents (id, preauthorization_id, claim_id, type, file_name, file_size, mime_type, uploaded_by) VALUES (?,?,?,?,?,?,?,?)', [
        id, preauthId, claimId, type, fileName, size, mime, uploadedBy,
      ]);
    }

    console.log('Seeding queries...');
    await conn.query(
      `INSERT INTO queries (id, preauthorization_id, question, raised_by, raised_by_role, raised_date, status) VALUES
       ('QRY-1001','PA-1001','Please upload the angiogram diagnostic report to confirm the extent of blockage before we can proceed with review.','Karthik Subramaniam (Star Health)','INSURER','2026-08-10 13:40:00','RESOLVED'),
       ('QRY-1002','PA-1003','Kindly confirm the implant brand and model being used, as costs vary by manufacturer under the policy sub-limit.','Karthik Subramaniam (Star Health)','INSURER','2026-08-15 08:10:00','RESPONDED')`
    );
    const messages = [
      ['QRY-1001', 'Karthik Subramaniam (Star Health)', 'INSURER', 'Please upload the angiogram diagnostic report to confirm the extent of blockage before we can proceed with review.', '[]', '2026-08-10 13:40:00'],
      ['QRY-1001', 'Dr. Meena Raghunathan (Apollo Care)', 'HOSPITAL', 'Uploading the angiogram report now. Please find it attached under Diagnostic Report.', '["DOC-1004"]', '2026-08-11 10:03:00'],
      ['QRY-1001', 'Karthik Subramaniam (Star Health)', 'INSURER', 'Received, thank you. This resolves our query and the request has moved back to review.', '[]', '2026-08-11 10:12:00'],
      ['QRY-1002', 'Karthik Subramaniam (Star Health)', 'INSURER', 'Kindly confirm the implant brand and model being used, as costs vary by manufacturer under the policy sub-limit.', '[]', '2026-08-15 08:10:00'],
      ['QRY-1002', 'Apollo Care Hospital Desk', 'HOSPITAL', 'We are using a Zimmer Biomet Persona implant, model quoted in the treatment estimate.', '[]', '2026-08-15 11:45:00'],
    ];
    for (const [queryId, from, role, text, attachments, at] of messages) {
      await conn.query('INSERT INTO query_messages (query_id, from_name, role, text, attachments, at) VALUES (?,?,?,?,?,?)', [queryId, from, role, text, attachments, at]);
    }

    console.log('Seeding claims + history...');
    await conn.query(
      `INSERT INTO claims (id, preauthorization_id, patient_id, hospital_id, insurer_id, treatment_cost, approved_amount, claimed_amount, settlement_amount, claim_date, status, reviewer, remarks) VALUES
       ('CLM-1001','PA-1001','PAT-1001','HOS-1001','INR-1001',285000,265000,265000,265000,'2026-08-17 05:00:00','SETTLED','Karthik Subramaniam','Verified against final hospital bill; settled in full.'),
       ('CLM-1002','PA-1003','PAT-1003','HOS-1001','INR-1001',340000,240000,240000,NULL,'2026-08-25 05:30:00','UNDER_VERIFICATION','Karthik Subramaniam','')`
    );
    const claimHistory = [
      ['CLM-1001', 'CLAIM_SUBMITTED', 'Apollo Care Hospital Desk', 'Claim submitted with final hospital bill.', '2026-08-17 05:00:00'],
      ['CLM-1001', 'UNDER_VERIFICATION', 'Karthik Subramaniam', 'Cross-checking bill against approved pre-authorization.', '2026-08-18 06:20:00'],
      ['CLM-1001', 'APPROVED', 'Karthik Subramaniam', 'Claim amount matches approved pre-authorization.', '2026-08-19 09:10:00'],
      ['CLM-1001', 'SETTLEMENT_PROCESSED', 'Star Health Finance Desk', 'Settlement initiated to hospital account.', '2026-08-21 04:00:00'],
      ['CLM-1001', 'SETTLED', 'Star Health Finance Desk', 'Payment confirmed and settled.', '2026-08-22 07:45:00'],
      ['CLM-1002', 'CLAIM_SUBMITTED', 'Apollo Care Hospital Desk', 'Claim submitted post discharge.', '2026-08-25 05:30:00'],
      ['CLM-1002', 'UNDER_VERIFICATION', 'Karthik Subramaniam', 'Verifying implant invoice against bill.', '2026-08-26 06:00:00'],
    ];
    for (const [claimId, status, by, note, at] of claimHistory) {
      await conn.query('INSERT INTO claim_status_history (claim_id, status, by_name, note, at) VALUES (?,?,?,?,?)', [claimId, status, by, note, at]);
    }

    console.log('Seeding notifications...');
    const notifications = [
      ['NOT-1001', 'USR-1001', 'PREAUTH_APPROVED', 'Pre-authorization approved', 'Your request PA-1001 was approved for ₹2,65,000.', 'PA-1001', 0],
      ['NOT-1002', 'USR-1001', 'CLAIM_SETTLED', 'Claim settled', 'Your claim CLM-1001 has been settled for ₹2,65,000.', 'CLM-1001', 0],
      ['NOT-1003', 'USR-1002', 'QUERY_RAISED', 'Query raised on PA-1003', 'Insurer requested implant brand confirmation for PA-1003.', 'PA-1003', 1],
      ['NOT-1004', 'USR-1002', 'PREAUTH_SUBMITTED', 'New request assigned', 'PA-1005 for Ganesh Moorthy is now under insurer review.', 'PA-1005', 1],
      ['NOT-1005', 'USR-1003', 'CLAIM_SUBMITTED', 'New claim submitted', 'CLM-1002 submitted for PA-1003 - verification pending.', 'CLM-1002', 0],
      ['NOT-1006', 'USR-1003', 'PREAUTH_SUBMITTED', 'New pre-authorization request', 'PA-1005 (cataract surgery) has been submitted for review.', 'PA-1005', 0],
      ['NOT-1007', 'USR-1004', 'CLAIM_SETTLED', 'Claim settled', 'CLM-1001 settled by Star Health for ₹2,65,000.', 'CLM-1001', 1],
    ];
    for (const [id, userId, type, title, message, relatedId, isRead] of notifications) {
      await conn.query('INSERT INTO notifications (id, user_id, type, title, message, related_id, is_read) VALUES (?,?,?,?,?,?,?)', [
        id, userId, type, title, message, relatedId, isRead,
      ]);
    }

    console.log('Seeding audit logs...');
    const auditLogs = [
      ['AUD-1001', 'PREAUTHORIZATION', 'PA-1001', 'SUBMITTED', 'Dr. Meena Raghunathan', 'Submitted with 5 documents.'],
      ['AUD-1002', 'PREAUTHORIZATION', 'PA-1001', 'QUERY_RAISED', 'Karthik Subramaniam', 'Requested angiogram diagnostic report.'],
      ['AUD-1003', 'PREAUTHORIZATION', 'PA-1001', 'APPROVED', 'Karthik Subramaniam', 'Approved at ₹2,65,000.'],
      ['AUD-1004', 'CLAIM', 'CLM-1001', 'SETTLED', 'Star Health Finance Desk', 'Settlement of ₹2,65,000 confirmed.'],
      ['AUD-1005', 'PREAUTHORIZATION', 'PA-1002', 'REJECTED', 'National Wellness Review Desk', 'Waiting period clause applied.'],
      ['AUD-1006', 'PREAUTHORIZATION', 'PA-1003', 'PARTIALLY_APPROVED', 'Karthik Subramaniam', 'Implant sub-limit applied.'],
      ['AUD-1007', 'CLAIM', 'CLM-1002', 'CLAIM_SUBMITTED', 'Apollo Care Hospital Desk', 'Claim submitted for PA-1003.'],
      ['AUD-1008', 'PREAUTHORIZATION', 'PA-1005', 'SUBMITTED', 'Apollo Care Hospital Desk', 'Submitted for cataract surgery.'],
    ];
    for (const [id, entityType, entityId, action, by, details] of auditLogs) {
      await conn.query('INSERT INTO audit_logs (id, entity_type, entity_id, action, by_name, details) VALUES (?,?,?,?,?,?)', [
        id, entityType, entityId, action, by, details,
      ]);
    }

    console.log('Seed complete. Demo accounts (password "demo123"): hospital@demo.com, insurer@demo.com, admin@demo.com');
    console.log('Patient logins (one per patient): patient@demo.com (Arun), patient2@demo.com (Divya), ganesh@demo.com (Ganesh), lakshmi@demo.com (Lakshmi)');
  } finally {
    conn.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
