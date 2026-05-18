import fp from 'fastify-plugin'
import { createPrismaClient } from '@jamicore/db'

export const tenantPlugin = fp(async (fastify) => {
  fastify.addHook('onRequest', async (request) => {
    request.tenant = null
    request.tenantPrisma = null

    const host = request.headers.host || ''
    const subdomain = host.split('.')[0]
    const headerTenant = request.headers['x-tenant-id'] as string | undefined

    const slug = headerTenant || subdomain

    if (!slug || slug === 'localhost' || slug === 'www') {
      return
    }

    try {
      const tenant = await fastify.prisma.tenant.findUnique({
        where: { slug },
      })

      if (!tenant || tenant.status !== 'ACTIVE') {
        return
      }

      request.tenant = tenant
      request.tenantPrisma = createPrismaClient(tenant.dbSchema)
    } catch {
      // Gracefully ignore tenant lookup failures (e.g., no DB in tests)
    }
  })
})

declare module 'fastify' {
  interface FastifyRequest {
    tenant: import('@jamicore/db').Tenant | null
    tenantPrisma: ReturnType<typeof createPrismaClient> | null
  }
}
