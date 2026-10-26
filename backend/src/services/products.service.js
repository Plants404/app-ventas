import { Product } from '../models/Product.js'

export const productsService = {
  async getAll() {
    return Product.find().sort({ stock: 1, nombre: 1 }).lean()
  },

  async getBySku(sku) {
    if (!sku) return null
    return Product.findOne({ sku: String(sku).trim().toUpperCase() }).lean()
  },

  async create(productData) {
    const sku = String(productData.sku || '').trim().toUpperCase()
    const existing = await Product.findOne({ sku })
    if (existing) {
      const error = new Error(`Ya existe un producto con el SKU "${sku}"`)
      error.status = 409
      throw error
    }

    const product = new Product({
      sku,
      nombre: String(productData.nombre || '').trim(),
      precio: Number(productData.precio) || 0,
      stock: Math.max(0, Math.floor(Number(productData.stock) || 0))
    })

    await product.save()
    return product.toJSON()
  },

  async update(sku, updateData) {
    const targetSku = String(sku).trim().toUpperCase()
    const product = await Product.findOne({ sku: targetSku })
    if (!product) {
      const error = new Error(`Producto con SKU "${targetSku}" no encontrado`)
      error.status = 404
      throw error
    }

    if (updateData.nombre !== undefined) product.nombre = String(updateData.nombre).trim()
    if (updateData.precio !== undefined) product.precio = Number(updateData.precio)
    if (updateData.stock !== undefined) product.stock = Math.max(0, Math.floor(Number(updateData.stock)))

    await product.save()
    return product.toJSON()
  },

  async delete(sku) {
    const targetSku = String(sku).trim().toUpperCase()
    const result = await Product.findOneAndDelete({ sku: targetSku })
    if (!result) {
      const error = new Error(`Producto con SKU "${targetSku}" no encontrado`)
      error.status = 404
      throw error
    }
    return { success: true, sku: targetSku }
  },

  async bulkUpsert(productsList) {
    if (!Array.isArray(productsList) || productsList.length === 0) {
      return { inserted: 0, updated: 0 }
    }

    const operations = productsList
      .filter(p => p.sku && !/^ejemplo/i.test(p.sku))
      .map(p => {
        const sku = String(p.sku).trim().toUpperCase()
        const nombre = String(p.nombre || p.producto || sku).trim()
        const precio = Number(p.precio) || 0
        const stock = Math.max(0, Math.floor(Number(p.stock) || 0))

        return {
          updateOne: {
            filter: { sku },
            update: {
              $set: { nombre, precio, stock },
              $setOnInsert: { sku }
            },
            upsert: true
          }
        }
      })

    if (operations.length === 0) return { inserted: 0, updated: 0 }

    const res = await Product.bulkWrite(operations)
    return {
      inserted: res.upsertedCount,
      updated: res.modifiedCount
    }
  }
}
