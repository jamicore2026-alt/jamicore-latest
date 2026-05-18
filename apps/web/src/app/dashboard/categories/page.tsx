'use client'

import { useEffect, useState } from 'react'

interface Category {
  id: string
  name: string
  slug: string
  parentId: string | null
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')

  async function load() {
    const res = await fetch('http://localhost:3001/api/v1/categories', {
      headers: { 'x-tenant-id': 'demo' },
    })
    const json = await res.json()
    setCategories(json.data || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('http://localhost:3001/api/v1/categories', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': 'demo',
      },
      body: JSON.stringify({ name, slug }),
    })
    if (res.ok) {
      setName('')
      setSlug('')
      load()
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-brand-900">Categories</h1>

      <form onSubmit={handleSubmit} className="flex max-w-md gap-3">
        <input
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        />
        <input
          placeholder="slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          required
          pattern="^[a-z0-9-]+$"
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        />
        <button type="submit" className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">Add</button>
      </form>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : categories.length === 0 ? (
        <p className="text-gray-500">No categories yet.</p>
      ) : (
        <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200">
          {categories.map((c) => (
            <li key={c.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <span className="font-medium">{c.name}</span>
                <span className="ml-2 text-xs text-gray-500">{c.slug}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
