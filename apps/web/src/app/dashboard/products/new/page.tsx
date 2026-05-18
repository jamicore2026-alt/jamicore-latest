'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function NewProductPage() {
  const router = useRouter()
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')

    const formData = new FormData(e.currentTarget)
    const res = await fetch('http://localhost:3001/api/v1/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': 'demo',
      },
      body: JSON.stringify({
        name: formData.get('name'),
        slug: formData.get('slug'),
        description: formData.get('description'),
        price: Number(formData.get('price')),
        stock: Number(formData.get('stock')),
        categoryId: formData.get('categoryId') || undefined,
      }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Failed to create product')
      return
    }

    router.push('/dashboard/products')
  }

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-bold text-brand-900">Add Product</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Name</label>
          <input name="name" required className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Slug</label>
          <input name="slug" required pattern="^[a-z0-9-]+$" className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Description</label>
          <textarea name="description" rows={3} className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
        </div>
        <div className="flex gap-4">
          <div className="flex flex-1 flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Price</label>
            <input name="price" type="number" step="0.01" min="0" required className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Stock</label>
            <input name="stock" type="number" min="0" defaultValue="0" className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Category ID</label>
          <input name="categoryId" className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
        </div>
        <div className="flex gap-3">
          <button type="submit" className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">Create</button>
          <a href="/dashboard/products" className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</a>
        </div>
      </form>
    </div>
  )
}
