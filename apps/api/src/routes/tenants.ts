import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { provisionTenant } from '@jamicore/db'

const createTenantSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  domain: z.string().optional(),
  plan: z.string().optional(),
})

export async function tenantRoutes(app: FastifyInstance) {
  app.get('/', {
    preHandler: [app.authenticate, app.requireRole('PLATFORM_ADMIN')],
  }, async (request) => {
    const tenants = await request.server.prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return { data: tenants }
  })

  app.post('/', {
    preHandler: [app.authenticate, app.requireRole('PLATFORM_ADMIN')],
  }, async (request, reply) => {
    const body = createTenantSchema.parse(request.body)
    const tenant = await provisionTenant(body)
    return reply.status(201).send({ data: tenant })
  })

  app.get('/:id', {
    preHandler: [app.authenticate, app.requireRole('PLATFORM_ADMIN')],
  }, async (request) => {
    const { id } = request.params as { id: string }
    const tenant = await request.server.prisma.tenant.findUnique({ where: { id } })
    if (!tenant) {
      throw new Error('Tenant not found')
    }
    return { data: tenant }
  })

  app.patch('/:id/status', {
    preHandler: [app.authenticate, app.requireRole('PLATFORM_ADMIN')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = request.body as { status: string }
    const validStatuses = ['ACTIVE', 'SUSPENDED', 'PENDING']
    if (!validStatuses.includes(body.status)) {
      return reply.status(400).send({ error: 'Invalid status' })
    }
    const updated = await request.server.prisma.tenant.update({
      where: { id },
      data: { status: body.status as 'ACTIVE' | 'SUSPENDED' | 'PENDING' },
    })
    return { data: updated }
  })

  app.get('/me/products', {
    preHandler: [app.authenticate],
  }, async (request, reply) => {
    if (!request.tenant || !request.tenantPrisma) {
      return reply.status(404).send({ error: 'Tenant not found' })
    }
    const products = await request.tenantPrisma.product.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    })
    return { data: products, tenant: request.tenant.slug }
  })
}
