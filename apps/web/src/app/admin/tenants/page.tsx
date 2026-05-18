'use client'

import { useEffect, useState } from 'react'

interface Tenant {
  id: string
  name: string
  slug: string
  status: string
  plan: string
  domain: string | null
  createdAt: string
}

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  SUSPENDED: 'bg-red-100 text-red-700',
  PENDING: 'bg-yellow-100 text-yellow-700',
}

export default function AdminTenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [updating, setUpdating] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', slug: '', domain: '', plan: 'free' })
  const [error, setError] = useState('')

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

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setCreating(true)
    const res = await fetch('http://localhost:3001/api/v1/tenants', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': 'demo',
      },
      credentials: 'include',
      body: JSON.stringify(form),
    })
    if (res.ok) {
      setForm({ name: '', slug: '', domain: '', plan: 'free' })
      load()
    } else {
      const data = await res.json()
      setError(data.error || 'Failed to create tenant')
    }
    setCreating(false)
  }

  async function updateStatus(id: string, status: string) {
    setUpdating(id)
    const res = await fetch(`http://localhost:3001/api/v1/tenants/${id}/status`, {
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
      <h1 className="text-2xl font-bold text-brand-900">Tenant Management</h1>

      <form onSubmit={handleCreate} className="rounded-lg border border-gray-200 bg-white p-4">
        <p className="mb-3 text-sm font-medium text-gray-900">Create New Tenant</p>
        {error && (
          <div className="mb-3 rounded-md bg-red-50 p-2 text-sm text-red-700">{error}</div>
        )}
        <div className="flex flex-wrap gap-3">
          <input
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          />
          <input
            placeholder="slug"
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
            required
            pattern="^[a-z0-9-]+$"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          />
          <input
            placeholder="Domain (optional)"
            value={form.domain}
            onChange={(e) => setForm({ ...form, domain: e.target.value })}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          />
          <select
            value={form.plan}
            onChange={(e) => setForm({ ...form, plan: e.target.value })}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          >
            <option value="free">Free</option>
            <option value="starter">Starter</option>
            <option value="pro">Pro</option>
            <option value="enterprise">Enterprise</option>
          </select>
          <button
            type="submit"
            disabled={creating}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {creating ? 'Creating...' : 'Create Tenant'}
          </button>
        </div>
      </form>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : tenants.length === 0 ? (
        <p className="text-gray-500">No tenants yet.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-700">Name</th>
                <th className="px-4 py-3 font-medium text-gray-700">Slug</th>
                <th className="px-4 py-3 font-medium text-gray-700">Plan</th>
                <th className="px-4 py-3 font-medium text-gray-700">Status</th>
                <th className="px-4 py-3 font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {tenants.map((t) => (
                <tr key={t.id}>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium">{t.name}</p>
                      {t.domain && <p className="text-xs text-gray-500">{t.domain}</p>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{t.slug}</td>
                  <td className="px-4 py-3">{t.plan}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusColors[t.status] || 'bg-gray-100 text-gray-700'}`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={t.status}
                      disabled={updating === t.id}
                      onChange={(e) => updateStatus(t.id, e.target.value)}
                      className="rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-brand-500 focus:outline-none"
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="SUSPENDED">Suspended</option>
                      <option value="PENDING">Pending</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
