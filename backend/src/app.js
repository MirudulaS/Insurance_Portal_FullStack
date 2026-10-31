const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const env = require('./config/env');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const patientRoutes = require('./routes/patientRoutes');
const preauthRoutes = require('./routes/preauthRoutes');
const documentRoutes = require('./routes/documentRoutes');
const patientDocumentRoutes = require('./routes/patientDocumentRoutes');
const queryRoutes = require('./routes/queryRoutes');
const claimRoutes = require('./routes/claimRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const reportRoutes = require('./routes/reportRoutes');
const organizationRoutes = require('./routes/organizationRoutes'); // exposes /hospitals, /insurers
const adminRoutes = require('./routes/adminRoutes'); // exposes /users, /audit-logs

const app = express();

app.use(cors({ origin: env.clientOrigin, credentials: true }));
app.use(express.json());
app.use(morgan('dev'));

// Serves uploaded files at /uploads/<filename>, matching the fileUrl shape
// documentController returns.
app.use('/uploads', express.static(path.join(__dirname, '..', env.uploadDir)));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/preauthorizations', preauthRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/patient-documents', patientDocumentRoutes);
app.use('/api/queries', queryRoutes);
app.use('/api/claims', claimRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api', organizationRoutes);
app.use('/api', adminRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
