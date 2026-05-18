'use client'

import { useEffect, useState } from 'react'

interface OrderItem {
  id: string
  productId: string
  quantity: number
  price: number
  product: { name: string; slug: string }
}

interface Order {
  id: string
  status: string
  total: number
  userId: string
  createdAt: string
  items: OrderItem[]
}

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  SHIPPED: 'bg-purple-100 text-purple-700',
  DELIVERED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  async function load() {
    const res = await fetch('http://localhost:3001/api/v1/orders', {
      headers: { 'x-tenant-id': 'demo' },
      credentials: 'include',
    })
    const json = await res.json()
    setOrders(json.data || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function updateStatus(id: string, status: string) {
    setUpdating(id)
    const res = await fetch(`http://localhost:3001/api/v1/orders/${id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': 'demo',
      },
      credentials: 'include',
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      load()
    }
    setUpdating(null)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-brand-900">Orders</h1>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : orders.length === 0 ? (
        <p className="text-gray-500">No orders yet.</p>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">Order #{order.id.slice(0, 8)}</p>
                  <p className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusColors[order.status] || 'bg-gray-100 text-gray-700'}`}>
                    {order.status}
                  </span>
                  <select
                    value={order.status}
                    disabled={updating === order.id}
                    onChange={(e) => updateStatus(order.id, e.target.value)}
                    className="rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-brand-500 focus:outline-none"
                  >
                    <option value="PENDING">Pending</option>
                    <option value="CONFIRMED">Confirmed</option>
                    <option value="SHIPPED">Shipped</option>
                    <option value="DELIVERED">Delivered</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
              </div>
              <div className="mt-3 border-t border-gray-100 pt-3">
                <p className="text-xs font-medium text-gray-700">Items:</p>
                <ul className="mt-1 space-y-1">
                  {order.items.map((item) => (
                    <li key={item.id} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">
                        {item.product.name} x{item.quantity}
                      </span>
                      <span className="text-gray-500">${Number(item.price) * item.quantity}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-right text-sm font-medium text-gray-900">
                  Total: ${order.total}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
