const pool = require('../db/pool');
const { asyncHandler } = require('../utils/helpers');

function toHospital(row) {
  return {
    id: row.id,
    name: row.name,
    city: row.city,
    registrationNo: row.registration_no,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
  };
}

function toInsurer(row) {
  return {
    id: row.id,
    name: row.name,
    ircdaCode: row.ircda_code,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
  };
}

const getHospitals = asyncHandler(async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM hospitals ORDER BY name');
  res.json(rows.map(toHospital));
});

const getInsurers = asyncHandler(async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM insurers ORDER BY name');
  res.json(rows.map(toInsurer));
});

module.exports = { getHospitals, getInsurers, toHospital, toInsurer };
