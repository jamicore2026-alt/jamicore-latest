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
  app.get('/', async (request) => {
    const tenants = await request.server.prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return { data: tenants }
  })

  app.post('/', async (request, reply) => {
    const body = createTenantSchema.parse(request.body)
    const tenant = await provisionTenant(body)
    return reply.status(201).send({ data: tenant })
  })

  app.get('/:id', async (request) => {
    const { id } = request.params as { id: string }
    const tenant = await request.server.prisma.tenant.findUnique({ where: { id } })
    if (!tenant) {
      throw new Error('Tenant not found')
    }
    return { data: tenant }
  })

  app.get('/me/products', async (request, reply) => {
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
