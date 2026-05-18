'use client'

import { useEffect, useState } from 'react'

interface CartItem {
  id: string
  productId: string
  quantity: number
  product: {
    id: string
    name: string
    slug: string
    price: number
    stock: number
  }
}

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [checkingOut, setCheckingOut] = useState(false)

  async function load() {
    const res = await fetch('http://localhost:3001/api/v1/cart', {
      headers: { 'x-tenant-id': 'demo' },
      credentials: 'include',
    })
    const json = await res.json()
    setItems(json.items || [])
    setTotal(json.total || 0)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function updateQuantity(productId: string, quantity: number) {
    if (quantity < 1) {
      await removeItem(productId)
      return
    }
    const res = await fetch(`http://localhost:3001/api/v1/cart/items/${productId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': 'demo',
      },
      credentials: 'include',
      body: JSON.stringify({ quantity }),
    })
    if (res.ok) load()
  }

  async function removeItem(productId: string) {
    const res = await fetch(`http://localhost:3001/api/v1/cart/items/${productId}`, {
      method: 'DELETE',
      headers: { 'x-tenant-id': 'demo' },
      credentials: 'include',
    })
    if (res.ok) load()
  }

  async function clearCart() {
    const res = await fetch('http://localhost:3001/api/v1/cart', {
      method: 'DELETE',
      headers: { 'x-tenant-id': 'demo' },
      credentials: 'include',
    })
    if (res.ok) load()
  }

  async function checkout() {
    setCheckingOut(true)
    const res = await fetch('http://localhost:3001/api/v1/payments/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': 'demo',
      },
      credentials: 'include',
    })
    if (res.ok) {
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        window.location.href = '/dashboard/orders'
      }
    } else {
      const data = await res.json()
      alert(data.error || 'Checkout failed')
    }
    setCheckingOut(false)
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-8">
      <h1 className="text-2xl font-bold text-brand-900">Shopping Cart</h1>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-gray-200 p-6 text-center">
          <p className="text-gray-500">Your cart is empty.</p>
          <a href="/dashboard/products" className="mt-2 inline-block text-sm text-brand-600 hover:underline">
            Browse products
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200 bg-white">
            {items.map((item, idx) => (
              <div
                key={item.id}
                className={`flex items-center justify-between px-4 py-3 ${idx > 0 ? 'border-t border-gray-100' : ''}`}
              >
                <div>
                  <p className="font-medium text-gray-900">{item.product.name}</p>
                  <p className="text-sm text-gray-500">${item.product.price} each</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center rounded-md border border-gray-300">
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                      className="px-2 py-1 text-sm text-gray-600 hover:bg-gray-50"
                    >
                      -
                    </button>
                    <span className="px-2 text-sm text-gray-900">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                      className="px-2 py-1 text-sm text-gray-600 hover:bg-gray-50"
                    >
                      +
                    </button>
                  </div>
                  <span className="w-16 text-right text-sm font-medium text-gray-900">
                    ${Number(item.product.price) * item.quantity}
                  </span>
                  <button
                    onClick={() => removeItem(item.productId)}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4">
            <button
              onClick={clearCart}
              className="text-sm text-red-600 hover:text-red-700"
            >
              Clear cart
            </button>
            <div className="flex items-center gap-4">
              <span className="text-lg font-bold text-gray-900">Total: ${total}</span>
              <button
                onClick={checkout}
                disabled={checkingOut}
                className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {checkingOut ? 'Processing...' : 'Checkout'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
