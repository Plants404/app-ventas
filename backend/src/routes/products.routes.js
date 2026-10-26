import { Router } from 'express'
import {
  getProducts,
  getProductBySku,
  createProduct,
  updateProduct,
  deleteProduct,
  bulkSyncProducts
} from '../controllers/products.controller.js'

export const productsRouter = Router()

productsRouter.get('/', getProducts)
productsRouter.get('/:sku', getProductBySku)
productsRouter.post('/', createProduct)
productsRouter.post('/bulk', bulkSyncProducts)
productsRouter.put('/:sku', updateProduct)
productsRouter.delete('/:sku', deleteProduct)
