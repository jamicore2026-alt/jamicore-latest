import { FastifyInstance } from 'fastify'
import bcrypt from 'bcrypt'
import { schema } from '@jamicore/db'
import { eq, and, desc } from 'drizzle-orm'
const { customers, customerAddresses, orders, products, reviews, wishlists, wishlistItems } = schema

export async function customerRoutes(app: FastifyInstance) {
  const requireCustomer = [app.authenticate, app.requireRole('CUSTOMER')]

  app.post('/auth/register', async (request, reply) => {
    const store = request.store
    if (!store) {
      return reply.status(400).send({ error: 'Store not found' })
    }

    const body = request.body as {
      email: string
      password: string
      firstName: string
      lastName: string
      phone?: string
    }

    const existing = await request.drizzle.query.customers.findFirst({
      where: and(eq(customers.storeId, store.id), eq(customers.email, body.email)),
    })
    if (existing) {
      return reply.status(409).send({ error: 'Email already registered' })
    }

    const hashed = await bcrypt.hash(body.password, 12)
    const [customer] = await request.drizzle
      .insert(customers)
      .values({
        storeId: store.id,
        email: body.email,
        password: hashed,
        firstName: body.firstName,
        lastName: body.lastName,
        phone: body.phone,
      })
      .returning()

    const token = app.jwt.sign({
      sub: customer.id,
      email: customer.email,
      role: 'CUSTOMER',
    })

    return reply.status(201).send({
      data: {
        token,
        customer: {
          id: customer.id,
          email: customer.email,
          firstName: customer.firstName,
          lastName: customer.lastName,
          phone: customer.phone,
        },
      },
    })
  })

  app.post('/auth/login', async (request, reply) => {
    const store = request.store
    if (!store) {
      return reply.status(400).send({ error: 'Store not found' })
    }

    const body = request.body as { email: string; password: string }

    const customer = await request.drizzle.query.customers.findFirst({
      where: and(eq(customers.storeId, store.id), eq(customers.email, body.email)),
    })
    if (!customer || !customer.password) {
      return reply.status(401).send({ error: 'Invalid credentials' })
    }

    const valid = await bcrypt.compare(body.password, customer.password)
    if (!valid) {
      return reply.status(401).send({ error: 'Invalid credentials' })
    }

    const token = app.jwt.sign({
      sub: customer.id,
      email: customer.email,
      role: 'CUSTOMER',
    })

    return reply.send({
      data: {
        token,
        customer: {
          id: customer.id,
          email: customer.email,
          firstName: customer.firstName,
          lastName: customer.lastName,
          phone: customer.phone,
        },
      },
    })
  })

  app.get('/me', { preHandler: requireCustomer }, async (request, reply) => {
    const customerId = request.authUser!.sub
    const customer = await request.drizzle.query.customers.findFirst({
      where: eq(customers.id, customerId),
    })
    if (!customer) {
      return reply.status(404).send({ error: 'Customer not found' })
    }
    return reply.send({ data: customer })
  })

  app.patch('/me', { preHandler: requireCustomer }, async (request, reply) => {
    const customerId = request.authUser!.sub
    const body = request.body as Partial<{
      firstName: string
      lastName: string
      phone: string
    }>

    const [updated] = await request.drizzle
      .update(customers)
      .set({
        ...(body.firstName !== undefined && { firstName: body.firstName }),
        ...(body.lastName !== undefined && { lastName: body.lastName }),
        ...(body.phone !== undefined && { phone: body.phone }),
      })
      .where(eq(customers.id, customerId))
      .returning()

    if (!updated) {
      return reply.status(404).send({ error: 'Customer not found' })
    }

    return reply.send({ data: updated })
  })

  app.get('/orders', { preHandler: requireCustomer }, async (request, reply) => {
    const customerId = request.authUser!.sub
    const data = await request.drizzle.query.orders.findMany({
      where: eq(orders.customerId, customerId),
      with: { items: true },
      orderBy: desc(orders.createdAt),
    })
    return reply.send({ data })
  })

  app.get('/orders/:id', { preHandler: requireCustomer }, async (request, reply) => {
    const customerId = request.authUser!.sub
    const { id } = request.params as { id: string }

    const order = await request.drizzle.query.orders.findFirst({
      where: eq(orders.id, id),
      with: { items: true },
    })

    if (!order || order.customerId !== customerId) {
      return reply.status(404).send({ error: 'Order not found' })
    }

    return reply.send({ data: order })
  })

  app.post('/wishlist', { preHandler: requireCustomer }, async (request, reply) => {
    const store = request.store
    const customerId = request.authUser!.sub
    if (!store) {
      return reply.status(400).send({ error: 'Store not found' })
    }

    const body = request.body as { productId: string }

    let wishlist = await request.drizzle.query.wishlists.findFirst({
      where: and(eq(wishlists.customerId, customerId), eq(wishlists.storeId, store.id)),
    })

    if (!wishlist) {
      const [created] = await request.drizzle
        .insert(wishlists)
        .values({
          storeId: store.id,
          customerId,
          name: 'My Wishlist',
        })
        .returning()
      wishlist = created
    }

    const existingItem = await request.drizzle.query.wishlistItems.findFirst({
      where: and(
        eq(wishlistItems.wishlistId, wishlist.id),
        eq(wishlistItems.productId, body.productId),
      ),
    })

    if (existingItem) {
      return reply.send({ data: existingItem })
    }

    const [item] = await request.drizzle
      .insert(wishlistItems)
      .values({
        wishlistId: wishlist.id,
        productId: body.productId,
      })
      .returning()

    return reply.status(201).send({ data: item })
  })

  app.get('/wishlist', { preHandler: requireCustomer }, async (request, reply) => {
    const store = request.store
    const customerId = request.authUser!.sub
    if (!store) {
      return reply.status(400).send({ error: 'Store not found' })
    }

    const wishlist = await request.drizzle.query.wishlists.findFirst({
      where: and(eq(wishlists.customerId, customerId), eq(wishlists.storeId, store.id)),
    })

    if (!wishlist) {
      return reply.send({ data: { items: [] } })
    }

    const rows = await request.drizzle
      .select()
      .from(wishlistItems)
      .innerJoin(products, eq(wishlistItems.productId, products.id))
      .where(eq(wishlistItems.wishlistId, wishlist.id))

    const items = rows.map((row: Record<string, unknown>) => ({
      id: (row.wishlistItems as typeof wishlistItems.$inferSelect).id,
      productId: (row.wishlistItems as typeof wishlistItems.$inferSelect).productId,
      addedAt: (row.wishlistItems as typeof wishlistItems.$inferSelect).addedAt,
      product: row.products as typeof products.$inferSelect,
    }))

    return reply.send({ data: { wishlistId: wishlist.id, items } })
  })

  app.delete('/wishlist/:id', { preHandler: requireCustomer }, async (request, reply) => {
    const customerId = request.authUser!.sub
    const { id } = request.params as { id: string }

    const store = request.store
    if (!store) {
      return reply.status(400).send({ error: 'Store not found' })
    }

    const wishlist = await request.drizzle.query.wishlists.findFirst({
      where: and(eq(wishlists.customerId, customerId), eq(wishlists.storeId, store.id)),
    })

    if (!wishlist) {
      return reply.status(404).send({ error: 'Wishlist not found' })
    }

    const item = await request.drizzle.query.wishlistItems.findFirst({
      where: and(eq(wishlistItems.id, id), eq(wishlistItems.wishlistId, wishlist.id)),
    })

    if (!item) {
      return reply.status(404).send({ error: 'Wishlist item not found' })
    }

    await request.drizzle.delete(wishlistItems).where(eq(wishlistItems.id, id))

    return reply.send({ data: { removed: true } })
  })

  app.post('/reviews', { preHandler: requireCustomer }, async (request, reply) => {
    const store = request.store
    const customerId = request.authUser!.sub
    if (!store) {
      return reply.status(400).send({ error: 'Store not found' })
    }

    const body = request.body as {
      productId: string
      rating: number
      title?: string
      body?: string
    }

    const [review] = await request.drizzle
      .insert(reviews)
      .values({
        storeId: store.id,
        productId: body.productId,
        customerId,
        rating: body.rating,
        title: body.title,
        body: body.body,
        isVerifiedPurchase: false,
      })
      .returning()

    return reply.status(201).send({ data: review })
  })

  app.get('/addresses', { preHandler: requireCustomer }, async (request, reply) => {
    const customerId = request.authUser!.sub
    const data = await request.drizzle
      .select()
      .from(customerAddresses)
      .where(eq(customerAddresses.customerId, customerId))
    return reply.send({ data })
  })

  app.post('/addresses', { preHandler: requireCustomer }, async (request, reply) => {
    const customerId = request.authUser!.sub
    const body = request.body as {
      label?: string
      addressLine1: string
      addressLine2?: string
      city: string
      state?: string
      postalCode: string
      country?: string
      isDefault?: boolean
    }

    const [address] = await request.drizzle
      .insert(customerAddresses)
      .values({
        customerId,
        label: body.label ?? 'Home',
        addressLine1: body.addressLine1,
        addressLine2: body.addressLine2,
        city: body.city,
        state: body.state,
        postalCode: body.postalCode,
        country: body.country ?? 'US',
        isDefault: body.isDefault ?? false,
      })
      .returning()

    return reply.status(201).send({ data: address })
  })
}
