import { auth } from '@jamicore/auth'
import { redirect } from 'next/navigation'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (session?.user?.role !== 'PLATFORM_ADMIN') {
    redirect('/dashboard')
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 border-r border-gray-200 bg-gray-50 p-6">
        <nav className="flex flex-col gap-2">
          <a href="/admin" className="rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">Overview</a>
          <a href="/admin/tenants" className="rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">Tenants</a>
          <a href="/dashboard" className="rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">Back to Dashboard</a>
        </nav>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  )
}
