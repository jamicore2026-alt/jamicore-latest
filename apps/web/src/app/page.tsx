import { Button } from '@jamicore/ui'

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-4xl font-bold tracking-tight text-brand-900">
        JamiCore
      </h1>
      <p className="max-w-md text-center text-lg text-gray-600">
        Multi-tenant e-commerce SaaS built with Next.js 16, Fastify 5, and Prisma 7.
      </p>
      <div className="flex gap-4">
        <Button>Get Started</Button>
        <Button variant="outline">Learn More</Button>
      </div>
    </main>
  )
}
