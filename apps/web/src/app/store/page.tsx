'use client'

import { useEffect, useState } from 'react'

interface Product {
  id: string
  name: string
  slug: string
  description: string | null
  price: number
  stock: number
  isActive: boolean
  categoryId: string | null
}

interface Category {
  id: string
  name: string
  slug: string
}

export default function StorePage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [addingToCart, setAddingToCart] = useState<string | null>(null)
  const [toast, setToast] = useState('')

  async function loadProducts() {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (categoryId) params.set('categoryId', categoryId)
    params.set('inStock', 'true')

    const res = await fetch(`http://localhost:3001/api/v1/products?${params.toString()}`, {
      headers: { 'x-tenant-id': 'demo' },
    })
    const json = await res.json()
    setProducts(json.data || [])
    setLoading(false)
  }

  async function loadCategories() {
    const res = await fetch('http://localhost:3001/api/v1/categories', {
      headers: { 'x-tenant-id': 'demo' },
    })
    const json = await res.json()
    setCategories(json.data || [])
  }

  useEffect(() => {
    loadProducts()
    loadCategories()
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => loadProducts(), 300)
    return () => clearTimeout(timer)
  }, [search, categoryId])

  async function addToCart(productId: string) {
    setAddingToCart(productId)
    const res = await fetch('http://localhost:3001/api/v1/cart/items', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': 'demo',
      },
      credentials: 'include',
      body: JSON.stringify({ productId, quantity: 1 }),
    })
    if (res.ok) {
      setToast('Added to cart')
      setTimeout(() => setToast(''), 2000)
    } else {
      const data = await res.json()
      setToast(data.error || 'Failed to add')
      setTimeout(() => setToast(''), 3000)
    }
    setAddingToCart(null)
  }

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-brand-900">Store</h1>
        <a
          href="/cart"
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          View Cart
        </a>
      </div>

      {toast && (
        <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-700">{toast}</div>
      )}

      <div className="mb-6 flex gap-3">
        <input
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        />
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : products.length === 0 ? (
        <p className="text-gray-500">No products found.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <div key={p.id} className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="mb-2 flex items-start justify-between">
                <h3 className="font-medium text-gray-900">{p.name}</h3>
                <span className="text-sm font-semibold text-brand-700">${p.price}</span>
              </div>
              {p.description && (
                <p className="mb-3 text-sm text-gray-500 line-clamp-2">{p.description}</p>
              )}
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">{p.stock > 0 ? `${p.stock} in stock` : 'Out of stock'}</span>
                <button
                  onClick={() => addToCart(p.id)}
                  disabled={addingToCart === p.id || p.stock === 0}
                  className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  {addingToCart === p.id ? 'Adding...' : 'Add to Cart'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
