import { signIn } from '@jamicore/auth'

export default function LoginPage() {
  async function handleLogin(formData: FormData) {
    'use server'
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    await signIn('credentials', {
      email,
      password,
      redirectTo: '/',
    })
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-3xl font-bold text-brand-900">Sign In</h1>
      <form
        action={handleLogin}
        className="flex w-full max-w-sm flex-col gap-4"
      >
        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-sm font-medium text-gray-700">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-sm font-medium text-gray-700">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            required
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <button
          type="submit"
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          Sign In
        </button>
      </form>
      <p className="text-sm text-gray-600">
        Don&apos;t have an account?{' '}
        <a href="/register" className="text-brand-600 hover:underline">Register</a>
      </p>
    </main>
  )
}
