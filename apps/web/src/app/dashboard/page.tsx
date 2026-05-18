import { auth } from '@jamicore/auth'

export default async function DashboardPage() {
  const session = await auth()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-brand-900">Dashboard</h1>
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <p className="text-gray-700">
          Welcome back, <span className="font-medium">{session?.user?.name || session?.user?.email}</span>
        </p>
        <p className="mt-2 text-sm text-gray-500">Role: {session?.user?.role}</p>
      </div>
    </div>
  )
}
