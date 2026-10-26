import mongoose from 'mongoose'
import { config } from './index.js'

let isConnected = false

export async function connectDB() {
  if (isConnected) return

  try {
    const conn = await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 5000
    })

    isConnected = true
    console.log(`[Database] Conectado a MongoDB: ${conn.connection.host}/${conn.connection.name}`)
  } catch (error) {
    console.warn(`[Database] Advertencia: No se pudo conectar a MongoDB (${error.message}).`)
    console.warn('[Database] Asegúrate de tener MongoDB ejecutándose o configurar MONGO_URI en el archivo .env.')
  }
}

export async function disconnectDB() {
  if (!isConnected) return
  await mongoose.disconnect()
  isConnected = false
  console.log('[Database] Desconectado de MongoDB.')
}
