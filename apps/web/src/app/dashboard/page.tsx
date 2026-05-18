'use client'

import { useEffect, useState } from 'react'

interface Order {
  id: string
  status: string
  total: number
  userId: string
  createdAt: string
}

interface Product {
  id: string
  name: string
  slug: string
  stock: number
}

export default function DashboardPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    const [ordersRes, productsRes] = await Promise.all([
      fetch('http://localhost:3001/api/v1/orders?limit=5', {
        headers: { 'x-tenant-id': 'demo' },
        credentials: 'include',
      }),
      fetch('http://localhost:3001/api/v1/products?limit=100', {
        headers: { 'x-tenant-id': 'demo' },
      }),
    ])

    const ordersJson = await ordersRes.json()
    const productsJson = await productsRes.json()
    setOrders(ordersJson.data || [])
    setProducts(productsJson.data || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total), 0)
  const orderCount = orders.length
  const pendingCount = orders.filter((o) => o.status === 'PENDING').length
  const lowStockProducts = products.filter((p) => p.stock <= 5 && p.stock > 0)

  const statusColors: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-700',
    CONFIRMED: 'bg-blue-100 text-blue-700',
    SHIPPED: 'bg-purple-100 text-purple-700',
    DELIVERED: 'bg-green-100 text-green-700',
    CANCELLED: 'bg-red-100 text-red-700',
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-brand-900">Dashboard</h1>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-sm text-gray-500">Total Revenue</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">${totalRevenue.toFixed(2)}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-sm text-gray-500">Orders</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{orderCount}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-sm text-gray-500">Pending</p>
              <p className="mt-1 text-2xl font-bold text-yellow-600">{pendingCount}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-sm text-gray-500">Products</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{products.length}</p>
            </div>
          </div>

          {lowStockProducts.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-medium text-red-800">Low Stock Alert</p>
              <ul className="mt-2 space-y-1">
                {lowStockProducts.map((p) => (
                  <li key={p.id} className="text-sm text-red-700">
                    {p.name} — {p.stock} left
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-lg border border-gray-200 bg-white">
            <div className="border-b border-gray-100 px-4 py-3">
              <h2 className="text-sm font-medium text-gray-900">Recent Orders</h2>
            </div>
            {orders.length === 0 ? (
              <p className="px-4 py-6 text-sm text-gray-500">No orders yet.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {orders.map((o) => (
                  <div key={o.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Order #{o.id.slice(0, 8)}</p>
                      <p className="text-xs text-gray-500">{new Date(o.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusColors[o.status] || 'bg-gray-100 text-gray-700'}`}>
                        {o.status}
                      </span>
                      <span className="text-sm font-medium text-gray-900">${o.total}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
