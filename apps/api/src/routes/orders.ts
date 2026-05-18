import { FastifyInstance } from 'fastify'

export async function orderRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate)

  app.post('/', async (request, reply) => {
    const tp = request.tenantPrisma
    const userId = request.authUser?.sub
    if (!tp || !userId) {
      return reply.status(400).send({ error: 'Tenant or user not found' })
    }

    const cart = await tp.cart.findUnique({
      where: { userId },
      include: { items: { include: { product: true } } },
    })

    if (!cart || cart.items.length === 0) {
      return reply.status(400).send({ error: 'Cart is empty' })
    }

    let total = 0
    for (const item of cart.items) {
      if (!item.product.isActive || item.product.stock < item.quantity) {
        return reply.status(400).send({
          error: `Insufficient stock for ${item.product.name}`,
        })
      }
      total += Number(item.product.price) * item.quantity
    }

    const order = await tp.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          userId,
          total,
          status: 'PENDING',
        },
      })

      for (const item of cart.items) {
        await tx.orderItem.create({
          data: {
            orderId: created.id,
            productId: item.productId,
            quantity: item.quantity,
            price: item.product.price,
          },
        })

        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        })
      }

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } })

      return created
    })

    return order
  })

  app.get('/', async (request, reply) => {
    const tp = request.tenantPrisma
    const userId = request.authUser?.sub
    const role = request.authUser?.role
    if (!tp || !userId) {
      return reply.status(400).send({ error: 'Tenant or user not found' })
    }

    const { page = '1', limit = '20' } = request.query as {
      page?: string
      limit?: string
    }
    const p = Math.max(1, Number(page) || 1)
    const l = Math.max(1, Math.min(100, Number(limit) || 20))

    const where =
      role === 'MERCHANT_ADMIN' || role === 'PLATFORM_ADMIN'
        ? {}
        : { userId }

    const [data, count] = await Promise.all([
      tp.order.findMany({
        where,
        skip: (p - 1) * l,
        take: l,
        orderBy: { createdAt: 'desc' },
        include: {
          items: {
            include: { product: { select: { name: true, slug: true } } },
          },
        },
      }),
      tp.order.count({ where }),
    ])

    return {
      data,
      meta: { total: count, page: p, limit: l, totalPages: Math.ceil(count / l) },
    }
  })

  app.get('/:id', async (request, reply) => {
    const tp = request.tenantPrisma
    const userId = request.authUser?.sub
    const role = request.authUser?.role
    if (!tp || !userId) {
      return reply.status(400).send({ error: 'Tenant or user not found' })
    }

    const { id } = request.params as { id: string }

    const order = await tp.order.findUnique({
      where: { id },
      include: {
        items: {
          include: { product: { select: { name: true, slug: true, price: true } } },
        },
      },
    })

    if (!order) {
      return reply.status(404).send({ error: 'Order not found' })
    }

    if (
      order.userId !== userId &&
      role !== 'MERCHANT_ADMIN' &&
      role !== 'PLATFORM_ADMIN'
    ) {
      return reply.status(403).send({ error: 'Forbidden' })
    }

    return order
  })

  app.patch('/:id/status', async (request, reply) => {
    const tp = request.tenantPrisma
    const role = request.authUser?.role
    if (!tp) {
      return reply.status(400).send({ error: 'Tenant not found' })
    }

    if (role !== 'MERCHANT_ADMIN' && role !== 'PLATFORM_ADMIN') {
      return reply.status(403).send({ error: 'Forbidden' })
    }

    const { id } = request.params as { id: string }
    const body = request.body as { status: string }
    const validStatuses = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED']
    if (!validStatuses.includes(body.status)) {
      return reply.status(400).send({ error: 'Invalid status' })
    }

    const updated = await tp.order.update({
      where: { id },
      data: { status: body.status as 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' },
    })

    return updated
  })
}
