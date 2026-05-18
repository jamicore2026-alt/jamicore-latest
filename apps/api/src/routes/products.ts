import { FastifyInstance } from 'fastify'
import { z } from 'zod'

const createProductSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
  price: z.coerce.number().positive(),
  stock: z.coerce.number().int().min(0).default(0),
  categoryId: z.string().optional(),
  isActive: z.coerce.boolean().default(true),
})

const updateProductSchema = createProductSchema.partial()

export async function productRoutes(app: FastifyInstance) {
  // List products for current tenant
  app.get('/', async (request, reply) => {
    if (!request.tenant || !request.tenantPrisma) {
      return reply.status(404).send({ error: 'Tenant not found' })
    }

    const { search, categoryId, minPrice, maxPrice, inStock, page, limit } =
      request.query as Record<string, string>

    const where: Record<string, unknown> = { isActive: true }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }
    if (categoryId) where.categoryId = categoryId
    if (minPrice) where.price = { gte: Number(minPrice) }
    if (maxPrice) {
      where.price = { ...(where.price as object), lte: Number(maxPrice) }
    }
    if (inStock === 'true') where.stock = { gt: 0 }

    const take = Number(limit || 20)
    const skip = (Number(page || 1) - 1) * take

    const [products, count] = await Promise.all([
      request.tenantPrisma.product.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      request.tenantPrisma.product.count({ where }),
    ])

    return {
      data: products,
      meta: { total: count, page: Number(page || 1), limit: take },
    }
  })

  // Get single product
  app.get('/:id', async (request, reply) => {
    if (!request.tenant || !request.tenantPrisma) {
      return reply.status(404).send({ error: 'Tenant not found' })
    }
    const { id } = request.params as { id: string }
    const product = await request.tenantPrisma.product.findUnique({ where: { id } })
    if (!product) {
      return reply.status(404).send({ error: 'Product not found' })
    }
    return { data: product }
  })

  // Create product
  app.post('/', {
    preHandler: [app.authenticate, app.requireRole('MERCHANT_ADMIN', 'PLATFORM_ADMIN')],
  }, async (request, reply) => {
    if (!request.tenant || !request.tenantPrisma) {
      return reply.status(404).send({ error: 'Tenant not found' })
    }
    const body = createProductSchema.parse(request.body)

    const existing = await request.tenantPrisma.product.findUnique({
      where: { slug: body.slug },
    })
    if (existing) {
      return reply.status(409).send({ error: 'Slug already exists' })
    }

    const product = await request.tenantPrisma.product.create({
      data: {
        name: body.name,
        slug: body.slug,
        description: body.description ?? null,
        price: body.price,
        stock: body.stock,
        categoryId: body.categoryId ?? null,
        isActive: body.isActive,
      },
    })

    return reply.status(201).send({ data: product })
  })

  // Update product
  app.patch('/:id', {
    preHandler: [app.authenticate, app.requireRole('MERCHANT_ADMIN', 'PLATFORM_ADMIN')],
  }, async (request, reply) => {
    if (!request.tenant || !request.tenantPrisma) {
      return reply.status(404).send({ error: 'Tenant not found' })
    }
    const { id } = request.params as { id: string }
    const body = updateProductSchema.parse(request.body)

    const product = await request.tenantPrisma.product.update({
      where: { id },
      data: body,
    })

    return { data: product }
  })

  // Delete product (soft delete by deactivating)
  app.delete('/:id', {
    preHandler: [app.authenticate, app.requireRole('MERCHANT_ADMIN', 'PLATFORM_ADMIN')],
  }, async (request, reply) => {
    if (!request.tenant || !request.tenantPrisma) {
      return reply.status(404).send({ error: 'Tenant not found' })
    }
    const { id } = request.params as { id: string }
    await request.tenantPrisma.product.update({
      where: { id },
      data: { isActive: false },
    })
    return reply.status(204).send()
  })
}
