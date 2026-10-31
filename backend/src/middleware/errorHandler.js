// Normalizes every thrown error into the { message } shape the frontend's
// apiClient interceptor already expects (see frontend src/services/apiClient.js).
function errorHandler(err, req, res, next) {  // eslint-disable-line no-unused-vars
  if (err.code === 'LIMIT_FILE_SIZE') err = Object.assign(new Error('File is too large. The limit is 5 MB.'), { status: 400 });
  const status = err.status || 500;
  const message = status === 500 ? 'Something went wrong. Please try again.' : err.message;

  if (status === 500) {
    // eslint-disable-next-line no-console
    console.error(err);
  }

  res.status(status).json({ message });
}

function notFound(req, res) {
  res.status(404).json({ message: 'Route not found.' });
}

module.exports = { errorHandler, notFound };
