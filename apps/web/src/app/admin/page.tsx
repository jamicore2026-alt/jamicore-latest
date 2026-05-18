'use client'

import { useEffect, useState } from 'react'

interface Tenant {
  id: string
  name: string
  slug: string
  status: string
  plan: string
  createdAt: string
}

export default function AdminPage() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    const res = await fetch('http://localhost:3001/api/v1/tenants', {
      headers: { 'x-tenant-id': 'demo' },
      credentials: 'include',
    })
    const json = await res.json()
    setTenants(json.data || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const activeCount = tenants.filter((t) => t.status === 'ACTIVE').length
  const suspendedCount = tenants.filter((t) => t.status === 'SUSPENDED').length
  const pendingCount = tenants.filter((t) => t.status === 'PENDING').length

  const statusColors: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-700',
    SUSPENDED: 'bg-red-100 text-red-700',
    PENDING: 'bg-yellow-100 text-yellow-700',
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-brand-900">Platform Admin</h1>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-sm text-gray-500">Active Tenants</p>
              <p className="mt-1 text-2xl font-bold text-green-600">{activeCount}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-sm text-gray-500">Suspended</p>
              <p className="mt-1 text-2xl font-bold text-red-600">{suspendedCount}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-sm text-gray-500">Pending</p>
              <p className="mt-1 text-2xl font-bold text-yellow-600">{pendingCount}</p>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white">
            <div className="border-b border-gray-100 px-4 py-3">
              <h2 className="text-sm font-medium text-gray-900">Recent Tenants</h2>
            </div>
            {tenants.length === 0 ? (
              <p className="px-4 py-6 text-sm text-gray-500">No tenants yet.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {tenants.slice(0, 10).map((t) => (
                  <div key={t.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{t.name}</p>
                      <p className="text-xs text-gray-500">{t.slug} · {t.plan}</p>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusColors[t.status] || 'bg-gray-100 text-gray-700'}`}>
                      {t.status}
                    </span>
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
