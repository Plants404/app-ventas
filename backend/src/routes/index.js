import { Router } from 'express'
import { productsRouter } from './products.routes.js'
import { salesRouter } from './sales.routes.js'

export const apiRouter = Router()

// Health check
apiRouter.get('/health', (req, res) => {
  res.json({
    ok: true,
    service: 'app-ventas-backend',
    status: 'online',
    timestamp: new Date().toISOString()
  })
})

apiRouter.use('/products', productsRouter)
apiRouter.use('/sales', salesRouter)
