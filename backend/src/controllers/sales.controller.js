import { salesService } from '../services/sales.service.js'

export async function getSales(req, res, next) {
  try {
    const hoy = req.query.rango === 'hoy'
    const sales = await salesService.getAll({ hoy })
    res.json({ ok: true, data: sales })
  } catch (error) {
    next(error)
  }
}

export async function createSale(req, res, next) {
  try {
    const result = await salesService.register(req.body)
    res.status(201).json({ ok: true, data: result })
  } catch (error) {
    next(error)
  }
}

export async function undoSale(req, res, next) {
  try {
    const { id } = req.params
    const result = await salesService.undo(id)
    res.json({ ok: true, data: result })
  } catch (error) {
    next(error)
  }
}

export async function updateSaleLocation(req, res, next) {
  try {
    const { id } = req.params
    const { lat, lng, acc } = req.body
    const updated = await salesService.updateLocation(id, { lat, lng, acc })
    res.json({ ok: true, data: updated })
  } catch (error) {
    next(error)
  }
}
