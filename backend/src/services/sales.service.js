import { Sale } from '../models/Sale.js'
import { Product } from '../models/Product.js'

export const salesService = {
  async getAll({ hoy = false } = {}) {
    const filter = { status: 'completed' }

    if (hoy) {
      const startOfDay = new Date()
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date()
      endOfDay.setHours(23, 59, 59, 999)
      filter.ts = { $gte: startOfDay, $lte: endOfDay }
    }

    return Sale.find(filter).sort({ id: -1 }).lean()
  },

  async register(saleData) {
    const sku = String(saleData.sku || '').trim().toUpperCase()
    const qty = Math.max(1, Math.floor(Number(saleData.qty) || 1))

    // 1. Descontar stock atómicamente si hay disponibilidad
    const product = await Product.findOneAndUpdate(
      { sku, stock: { $gte: qty } },
      { $inc: { stock: -qty } },
      { new: true }
    )

    if (!product) {
      const current = await Product.findOne({ sku })
      if (!current) {
        const error = new Error(`El producto con SKU "${sku}" no existe`)
        error.status = 404
        throw error
      }
      const error = new Error(`Stock insuficiente para "${current.nombre}". Disponibles: ${current.stock}, solicitadas: ${qty}`)
      error.status = 400
      throw error
    }

    // 2. Registrar la venta
    const precio = Number(saleData.precio ?? product.precio)
    const total = Number(saleData.total ?? (precio * qty))

    const sale = new Sale({
      id: Number(saleData.id) || Date.now(),
      ts: saleData.ts ? new Date(saleData.ts) : new Date(),
      sku: product.sku,
      nombre: product.nombre,
      qty,
      precio,
      total,
      lat: saleData.lat ?? null,
      lng: saleData.lng ?? null,
      acc: saleData.acc ?? null,
      status: 'completed'
    })

    await sale.save()

    return {
      sale: sale.toJSON(),
      remainingStock: product.stock
    }
  },

  async undo(saleId) {
    const id = Number(saleId)
    const sale = await Sale.findOne({ id })

    if (!sale) {
      const error = new Error(`Venta con ID ${saleId} no encontrada`)
      error.status = 404
      throw error
    }

    if (sale.status === 'cancelled') {
      const error = new Error(`La venta ya se encuentra anulada`)
      error.status = 400
      throw error
    }

    // 1. Devolver el stock al producto
    await Product.findOneAndUpdate(
      { sku: sale.sku },
      { $inc: { stock: sale.qty } }
    )

    // 2. Marcar la venta como anulada
    sale.status = 'cancelled'
    await sale.save()

    return {
      success: true,
      undoneSaleId: id,
      restoredSku: sale.sku,
      restoredQty: sale.qty
    }
  },

  async updateLocation(saleId, { lat, lng, acc }) {
    const id = Number(saleId)
    const sale = await Sale.findOneAndUpdate(
      { id },
      {
        $set: {
          lat: lat !== undefined ? Number(lat) : null,
          lng: lng !== undefined ? Number(lng) : null,
          acc: acc !== undefined ? Math.round(Number(acc)) : null
        }
      },
      { new: true }
    )

    if (!sale) {
      const error = new Error(`Venta con ID ${saleId} no encontrada`)
      error.status = 404
      throw error
    }

    return sale.toJSON()
  }
}
