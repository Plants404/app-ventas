import { productsService } from '../services/products.service.js'

export async function getProducts(req, res, next) {
  try {
    const products = await productsService.getAll()
    res.json({ ok: true, data: products })
  } catch (error) {
    next(error)
  }
}

export async function getProductBySku(req, res, next) {
  try {
    const { sku } = req.params
    const product = await productsService.getBySku(sku)
    if (!product) {
      return res.status(404).json({ ok: false, message: 'Producto no encontrado' })
    }
    res.json({ ok: true, data: product })
  } catch (error) {
    next(error)
  }
}

export async function createProduct(req, res, next) {
  try {
    const created = await productsService.create(req.body)
    res.status(201).json({ ok: true, data: created })
  } catch (error) {
    next(error)
  }
}

export async function updateProduct(req, res, next) {
  try {
    const { sku } = req.params
    const updated = await productsService.update(sku, req.body)
    res.json({ ok: true, data: updated })
  } catch (error) {
    next(error)
  }
}

export async function deleteProduct(req, res, next) {
  try {
    const { sku } = req.params
    const result = await productsService.delete(sku)
    res.json({ ok: true, data: result })
  } catch (error) {
    next(error)
  }
}

export async function bulkSyncProducts(req, res, next) {
  try {
    const { products } = req.body
    if (!Array.isArray(products)) {
      return res.status(400).json({ ok: false, message: 'Se esperaba un array en el campo "products"' })
    }
    const result = await productsService.bulkUpsert(products)
    res.json({ ok: true, data: result })
  } catch (error) {
    next(error)
  }
}
