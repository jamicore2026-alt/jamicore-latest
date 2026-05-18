import { FastifyInstance } from 'fastify'

export async function cartRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate)

  app.get('/', async (request, reply) => {
    const tp = request.tenantPrisma
    const userId = request.authUser?.sub
    if (!tp || !userId) {
      return reply.status(400).send({ error: 'Tenant or user not found' })
    }

    const cart = await tp.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: { product: true },
        },
      },
    })

    if (!cart) {
      return { items: [], total: 0 }
    }

    const total = cart.items.reduce((sum, item) => {
      return sum + Number(item.product.price) * item.quantity
    }, 0)

    return { items: cart.items, total }
  })

  app.post('/items', async (request, reply) => {
    const tp = request.tenantPrisma
    const userId = request.authUser?.sub
    if (!tp || !userId) {
      return reply.status(400).send({ error: 'Tenant or user not found' })
    }

    const body = request.body as { productId: string; quantity?: number }
    const quantity = Math.max(1, Number(body.quantity) || 1)

    const product = await tp.product.findUnique({
      where: { id: body.productId },
    })
    if (!product || !product.isActive) {
      return reply.status(404).send({ error: 'Product not found' })
    }
    if (product.stock < quantity) {
      return reply.status(400).send({ error: 'Insufficient stock' })
    }

    let cart = await tp.cart.findUnique({ where: { userId } })
    if (!cart) {
      cart = await tp.cart.create({ data: { userId } })
    }

    const existing = await tp.cartItem.findFirst({
      where: { cartId: cart.id, productId: body.productId },
    })

    if (existing) {
      const newQuantity = existing.quantity + quantity
      if (product.stock < newQuantity) {
        return reply.status(400).send({ error: 'Insufficient stock' })
      }
      const updated = await tp.cartItem.update({
        where: { id: existing.id },
        data: { quantity: newQuantity },
        include: { product: true },
      })
      return updated
    }

    const item = await tp.cartItem.create({
      data: {
        cartId: cart.id,
        productId: body.productId,
        quantity,
      },
      include: { product: true },
    })

    return item
  })

  app.patch('/items/:productId', async (request, reply) => {
    const tp = request.tenantPrisma
    const userId = request.authUser?.sub
    if (!tp || !userId) {
      return reply.status(400).send({ error: 'Tenant or user not found' })
    }

    const { productId } = request.params as { productId: string }
    const body = request.body as { quantity: number }
    const quantity = Math.max(0, Number(body.quantity) || 0)

    const cart = await tp.cart.findUnique({ where: { userId } })
    if (!cart) {
      return reply.status(404).send({ error: 'Cart not found' })
    }

    const existing = await tp.cartItem.findFirst({
      where: { cartId: cart.id, productId },
      include: { product: true },
    })
    if (!existing) {
      return reply.status(404).send({ error: 'Item not in cart' })
    }

    if (quantity === 0) {
      await tp.cartItem.delete({ where: { id: existing.id } })
      return { removed: true }
    }

    if (existing.product.stock < quantity) {
      return reply.status(400).send({ error: 'Insufficient stock' })
    }

    const updated = await tp.cartItem.update({
      where: { id: existing.id },
      data: { quantity },
      include: { product: true },
    })

    return updated
  })

  app.delete('/items/:productId', async (request, reply) => {
    const tp = request.tenantPrisma
    const userId = request.authUser?.sub
    if (!tp || !userId) {
      return reply.status(400).send({ error: 'Tenant or user not found' })
    }

    const { productId } = request.params as { productId: string }

    const cart = await tp.cart.findUnique({ where: { userId } })
    if (!cart) {
      return reply.status(404).send({ error: 'Cart not found' })
    }

    const existing = await tp.cartItem.findFirst({
      where: { cartId: cart.id, productId },
    })
    if (!existing) {
      return reply.status(404).send({ error: 'Item not in cart' })
    }

    await tp.cartItem.delete({ where: { id: existing.id } })
    return { removed: true }
  })

  app.delete('/', async (request, reply) => {
    const tp = request.tenantPrisma
    const userId = request.authUser?.sub
    if (!tp || !userId) {
      return reply.status(400).send({ error: 'Tenant or user not found' })
    }

    const cart = await tp.cart.findUnique({ where: { userId } })
    if (cart) {
      await tp.cartItem.deleteMany({ where: { cartId: cart.id } })
    }

    return { cleared: true }
  })
}
