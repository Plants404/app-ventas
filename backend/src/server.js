import { app } from './app.js'
import { config } from './config/index.js'
import { connectDB, disconnectDB } from './config/database.js'

async function start() {
  await connectDB()

  const server = app.listen(config.port, () => {
    console.log(`[Backend] Servidor escuchando en http://localhost:${config.port}`)
    console.log(`[Backend] Entorno: ${config.nodeEnv}`)
    console.log(`[Backend] Health check: http://localhost:${config.port}/api/health`)
  })

  const shutdown = async (signal) => {
    console.log(`\n[Backend] ${signal} recibido, cerrando servidor...`)
    server.close(async () => {
      await disconnectDB()
      process.exit(0)
    })
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}

start()
