import { FastifyInstance } from 'fastify'
import { z } from 'zod'

const createCategorySchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  parentId: z.string().optional(),
})

const updateCategorySchema = createCategorySchema.partial()

export async function categoryRoutes(app: FastifyInstance) {
  // List categories
  app.get('/', async (request, reply) => {
    if (!request.tenant || !request.tenantPrisma) {
      return reply.status(404).send({ error: 'Tenant not found' })
    }
    const categories = await request.tenantPrisma.category.findMany({
      orderBy: { name: 'asc' },
    })
    return { data: categories }
  })

  // Get single category
  app.get('/:id', async (request, reply) => {
    if (!request.tenant || !request.tenantPrisma) {
      return reply.status(404).send({ error: 'Tenant not found' })
    }
    const { id } = request.params as { id: string }
    const category = await request.tenantPrisma.category.findUnique({ where: { id } })
    if (!category) {
      return reply.status(404).send({ error: 'Category not found' })
    }
    return { data: category }
  })

  // Create category
  app.post('/', {
    preHandler: [app.authenticate, app.requireRole('MERCHANT_ADMIN', 'PLATFORM_ADMIN')],
  }, async (request, reply) => {
    if (!request.tenant || !request.tenantPrisma) {
      return reply.status(404).send({ error: 'Tenant not found' })
    }
    const body = createCategorySchema.parse(request.body)

    const existing = await request.tenantPrisma.category.findUnique({
      where: { slug: body.slug },
    })
    if (existing) {
      return reply.status(409).send({ error: 'Slug already exists' })
    }

    const category = await request.tenantPrisma.category.create({
      data: {
        name: body.name,
        slug: body.slug,
        parentId: body.parentId ?? null,
      },
    })

    return reply.status(201).send({ data: category })
  })

  // Update category
  app.patch('/:id', {
    preHandler: [app.authenticate, app.requireRole('MERCHANT_ADMIN', 'PLATFORM_ADMIN')],
  }, async (request, reply) => {
    if (!request.tenant || !request.tenantPrisma) {
      return reply.status(404).send({ error: 'Tenant not found' })
    }
    const { id } = request.params as { id: string }
    const body = updateCategorySchema.parse(request.body)

    const category = await request.tenantPrisma.category.update({
      where: { id },
      data: body,
    })

    return { data: category }
  })

  // Delete category
  app.delete('/:id', {
    preHandler: [app.authenticate, app.requireRole('MERCHANT_ADMIN', 'PLATFORM_ADMIN')],
  }, async (request, reply) => {
    if (!request.tenant || !request.tenantPrisma) {
      return reply.status(404).send({ error: 'Tenant not found' })
    }
    const { id } = request.params as { id: string }
    await request.tenantPrisma.category.delete({ where: { id } })
    return reply.status(204).send()
  })
}
