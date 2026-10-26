const API_BASE = '/api'

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  }

  const response = await fetch(url, {
    ...options,
    headers
  })

  const json = await response.json().catch(() => null)

  if (!response.ok) {
    const errorMsg = json?.message || `Error en la solicitud: ${response.status} ${response.statusText}`
    const error = new Error(errorMsg)
    error.status = response.status
    error.data = json
    throw error
  }

  return json
}

export const api = {
  async checkHealth() {
    return request('/health')
  },

  async getProducts() {
    const res = await request('/products')
    return res.data || []
  },

  async createProduct(product) {
    const res = await request('/products', {
      method: 'POST',
      body: JSON.stringify(product)
    })
    return res.data
  },

  async updateProduct(sku, data) {
    const res = await request(`/products/${encodeURIComponent(sku)}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
    return res.data
  },

  async deleteProduct(sku) {
    const res = await request(`/products/${encodeURIComponent(sku)}`, {
      method: 'DELETE'
    })
    return res.data
  },

  async bulkSyncProducts(products) {
    const res = await request('/products/bulk', {
      method: 'POST',
      body: JSON.stringify({ products })
    })
    return res.data
  },

  async getSales(rango = 'todas') {
    const query = rango ? `?rango=${encodeURIComponent(rango)}` : ''
    const res = await request(`/sales${query}`)
    return res.data || []
  },

  async createSale(saleData) {
    const res = await request('/sales', {
      method: 'POST',
      body: JSON.stringify(saleData)
    })
    return res.data
  },

  async updateSaleLocation(saleId, { lat, lng, acc }) {
    const res = await request(`/sales/${encodeURIComponent(saleId)}/location`, {
      method: 'PATCH',
      body: JSON.stringify({ lat, lng, acc })
    })
    return res.data
  },

  async undoSale(saleId) {
    const res = await request(`/sales/${encodeURIComponent(saleId)}/undo`, {
      method: 'POST'
    })
    return res.data
  }
}
