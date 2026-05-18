import { auth } from '@jamicore/auth'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 border-r border-gray-200 bg-gray-50 p-6">
        <nav className="flex flex-col gap-2">
          <a href="/dashboard" className="rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">Overview</a>
          <a href="/dashboard/products" className="rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">Products</a>
          <a href="/dashboard/categories" className="rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">Categories</a>
          <a href="/dashboard/orders" className="rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">Orders</a>
        </nav>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  )
}
