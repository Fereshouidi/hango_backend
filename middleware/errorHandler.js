/**
 * 404 Route Not Found middleware
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
  });
}

/**
 * Global Express error handling middleware
 */
function errorHandler(err, req, res, next) {
  console.error('[Server Error]', err);

  if (res.headersSent) {
    return next(err);
  }

  const status = err.status || err.statusCode || 500;

  res.status(status).json({
    error:
      status >= 500
        ? 'Internal Server Error'
        : err.message || 'Request Error',
  });
}

module.exports = {
  notFoundHandler,
  errorHandler,
};
