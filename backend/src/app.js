import express from 'express'
import cors from 'cors'
import { apiRouter } from './routes/index.js'
import { notFound } from './middlewares/notFound.js'
import { errorHandler } from './middlewares/errorHandler.js'

export const app = express()

// Middlewares globales
app.use(cors())
app.use(express.json())

// Rutas de la API
app.use('/api', apiRouter)

// Manejo de errores y 404
app.use(notFound)
app.use(errorHandler)
