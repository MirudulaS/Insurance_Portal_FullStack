-- Patient Insurance Pre-Authorization & Claim Status Tracking Dashboard
-- MySQL schema. Run with: mysql -u root -p preauth_claims_db < schema.sql

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS patient_documents;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS claim_status_history;
DROP TABLE IF EXISTS claims;
DROP TABLE IF EXISTS query_messages;
DROP TABLE IF EXISTS queries;
DROP TABLE IF EXISTS documents;
DROP TABLE IF EXISTS preauth_status_history;
DROP TABLE IF EXISTS preauthorizations;
DROP TABLE IF EXISTS patients;
DROP TABLE IF EXISTS insurers;
DROP TABLE IF EXISTS hospitals;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE users (
  id            VARCHAR(20) PRIMARY KEY,
  name          VARCHAR(150) NOT NULL,
  email         VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('PATIENT','HOSPITAL','INSURER','ADMIN') NOT NULL,
  linked_id     VARCHAR(20) NULL,
  phone         VARCHAR(30) NULL,
  avatar_color  VARCHAR(10) NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE hospitals (
  id              VARCHAR(20) PRIMARY KEY,
  name            VARCHAR(200) NOT NULL,
  city            VARCHAR(100),
  registration_no VARCHAR(50),
  contact_email   VARCHAR(150),
  contact_phone   VARCHAR(30)
) ENGINE=InnoDB;

CREATE TABLE insurers (
  id            VARCHAR(20) PRIMARY KEY,
  name          VARCHAR(200) NOT NULL,
  ircda_code    VARCHAR(50),
  contact_email VARCHAR(150),
  contact_phone VARCHAR(30)
) ENGINE=InnoDB;

CREATE TABLE patients (
  id                   VARCHAR(20) PRIMARY KEY,
  user_id              VARCHAR(20) NULL,
  name                 VARCHAR(150) NOT NULL,
  age                  INT,
  gender               VARCHAR(20),
  phone                VARCHAR(30),
  email                VARCHAR(150),
  address              VARCHAR(255),
  policy_number        VARCHAR(50),
  insurer_id           VARCHAR(20),
  primary_hospital_id  VARCHAR(20),
  blood_group          VARCHAR(10),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (insurer_id) REFERENCES insurers(id) ON DELETE SET NULL,
  FOREIGN KEY (primary_hospital_id) REFERENCES hospitals(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE patient_documents (
  id            VARCHAR(20) PRIMARY KEY,
  patient_id    VARCHAR(20) NOT NULL,
  type          ENUM('GOVERNMENT_ID','INSURANCE_CARD','POLICY_DOCUMENT') NOT NULL,
  file_name     VARCHAR(255) NOT NULL,
  file_size     INT,
  mime_type     VARCHAR(100),
  expiry_date   DATE NULL,
  uploaded_by   VARCHAR(20),
  uploaded_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  file_path     VARCHAR(255),
  UNIQUE KEY uq_patient_doc_type (patient_id, type),
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE preauthorizations (
  id                       VARCHAR(20) PRIMARY KEY,
  patient_id               VARCHAR(20) NOT NULL,
  hospital_id              VARCHAR(20) NOT NULL,
  insurer_id               VARCHAR(20) NOT NULL,
  policy_number            VARCHAR(50),
  diagnosis                TEXT,
  treatment                TEXT,
  doctor                   VARCHAR(150),
  estimated_cost           DECIMAL(12,2),
  admission_date           DATE,
  expected_discharge_date  DATE,
  status ENUM('DRAFT','SUBMITTED','UNDER_REVIEW','QUERY_RAISED','RESUBMITTED',
              'APPROVED','PARTIALLY_APPROVED','REJECTED') NOT NULL DEFAULT 'DRAFT',
  approved_amount          DECIMAL(12,2) NULL,
  reviewer                 VARCHAR(150) NULL,
  remarks                  TEXT NULL,
  created_at               DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at               DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id),
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id),
  FOREIGN KEY (insurer_id) REFERENCES insurers(id)
) ENGINE=InnoDB;

CREATE TABLE preauth_status_history (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  preauth_id    VARCHAR(20) NOT NULL,
  status        VARCHAR(30) NOT NULL,
  at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  by_name       VARCHAR(150),
  note          TEXT,
  FOREIGN KEY (preauth_id) REFERENCES preauthorizations(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE documents (
  id                   VARCHAR(20) PRIMARY KEY,
  preauthorization_id  VARCHAR(20) NULL,
  claim_id             VARCHAR(20) NULL,
  type                 VARCHAR(50) NOT NULL,
  file_name            VARCHAR(255) NOT NULL,
  file_size            INT,
  mime_type            VARCHAR(100),
  uploaded_by          VARCHAR(20),
  uploaded_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  file_path            VARCHAR(255),
  FOREIGN KEY (preauthorization_id) REFERENCES preauthorizations(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE queries (
  id                   VARCHAR(20) PRIMARY KEY,
  preauthorization_id  VARCHAR(20) NOT NULL,
  question             TEXT NOT NULL,
  raised_by            VARCHAR(150),
  raised_by_role       VARCHAR(20),
  raised_date          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status ENUM('OPEN','RESPONDED','RESOLVED') NOT NULL DEFAULT 'OPEN',
  FOREIGN KEY (preauthorization_id) REFERENCES preauthorizations(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE query_messages (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  query_id      VARCHAR(20) NOT NULL,
  from_name     VARCHAR(150),
  role          VARCHAR(20),
  text          TEXT,
  attachments   JSON,
  at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (query_id) REFERENCES queries(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE claims (
  id                   VARCHAR(20) PRIMARY KEY,
  preauthorization_id  VARCHAR(20) NOT NULL,
  patient_id           VARCHAR(20) NOT NULL,
  hospital_id          VARCHAR(20) NOT NULL,
  insurer_id           VARCHAR(20) NOT NULL,
  treatment_cost       DECIMAL(12,2),
  approved_amount      DECIMAL(12,2),
  claimed_amount       DECIMAL(12,2),
  settlement_amount    DECIMAL(12,2) NULL,
  claim_date           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status ENUM('CLAIM_SUBMITTED','UNDER_VERIFICATION','QUERY_RAISED','APPROVED',
              'REJECTED','SETTLEMENT_PROCESSED','SETTLED') NOT NULL DEFAULT 'CLAIM_SUBMITTED',
  reviewer             VARCHAR(150) NULL,
  remarks              TEXT NULL,
  FOREIGN KEY (preauthorization_id) REFERENCES preauthorizations(id),
  FOREIGN KEY (patient_id) REFERENCES patients(id),
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id),
  FOREIGN KEY (insurer_id) REFERENCES insurers(id)
) ENGINE=InnoDB;

CREATE TABLE claim_status_history (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  claim_id      VARCHAR(20) NOT NULL,
  status        VARCHAR(30) NOT NULL,
  at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  by_name       VARCHAR(150),
  note          TEXT,
  FOREIGN KEY (claim_id) REFERENCES claims(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE notifications (
  id            VARCHAR(20) PRIMARY KEY,
  user_id       VARCHAR(20) NOT NULL,
  type          VARCHAR(50),
  title         VARCHAR(200),
  message       VARCHAR(500),
  related_id    VARCHAR(20) NULL,
  is_read       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE audit_logs (
  id            VARCHAR(20) PRIMARY KEY,
  entity_type   VARCHAR(30) NOT NULL,
  entity_id     VARCHAR(20) NOT NULL,
  action        VARCHAR(50) NOT NULL,
  by_name       VARCHAR(150),
  at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  details       TEXT
) ENGINE=InnoDB;

CREATE INDEX idx_preauth_hospital ON preauthorizations(hospital_id);
CREATE INDEX idx_preauth_insurer ON preauthorizations(insurer_id);
CREATE INDEX idx_preauth_patient ON preauthorizations(patient_id);
CREATE INDEX idx_claims_hospital ON claims(hospital_id);
CREATE INDEX idx_claims_insurer ON claims(insurer_id);
CREATE INDEX idx_claims_patient ON claims(patient_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_documents_preauth ON documents(preauthorization_id);
CREATE INDEX idx_documents_claim ON documents(claim_id);
CREATE INDEX idx_patient_documents_patient ON patient_documents(patient_id);
