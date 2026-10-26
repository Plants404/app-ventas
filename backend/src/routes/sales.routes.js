import { Router } from 'express'
import {
  getSales,
  createSale,
  undoSale,
  updateSaleLocation
} from '../controllers/sales.controller.js'

export const salesRouter = Router()

salesRouter.get('/', getSales)
salesRouter.post('/', createSale)
salesRouter.patch('/:id/location', updateSaleLocation)
salesRouter.post('/:id/undo', undoSale)
