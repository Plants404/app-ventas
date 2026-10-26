export function errorHandler(err, req, res, next) {
  const status = err.status || 500
  console.error(`[Error] ${err.message}`, err.stack)

  res.status(status).json({
    ok: false,
    message: err.message || 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  })
}
