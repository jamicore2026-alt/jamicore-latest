import { FastifyInstance } from 'fastify'
import bcrypt from 'bcrypt'
import { schema } from '@jamicore/db'
import { eq, and, desc, asc, sql, count, like } from 'drizzle-orm'
const { users, stores, products, categories, orders, customers, coupons, storeAnalytics } = schema

export async function merchantRoutes(app: FastifyInstance) {
  const requireMerchant = [app.authenticate, app.requireRole('MERCHANT_ADMIN', 'STAFF')]

  // 1. POST /api/v2/merchant/auth/register
  app.post('/auth/register', async (request, reply) => {
    const body = request.body as {
      email: string
      password: string
      name?: string
      storeName: string
      storeSlug: string
    }
    const db = request.drizzle

    const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, body.email))
    if (existing.length > 0) {
      return reply.status(409).send({ error: 'Email already registered' })
    }

    const hashed = await bcrypt.hash(body.password, 12)

    const [user] = await db.insert(users).values({
      email: body.email,
      password: hashed,
      name: body.name,
      role: 'MERCHANT_ADMIN',
    }).returning()

    const [store] = await db.insert(stores).values({
      name: body.storeName,
      slug: body.storeSlug,
      ownerId: user.id,
      status: 'PENDING',
    }).returning()

    const token = app.jwt.sign({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    })

    return reply.status(201).send({
      data: {
        token,
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
        store: { id: store.id, name: store.name, slug: store.slug, status: store.status },
      },
    })
  })

  // 2. POST /api/v2/merchant/auth/login
  app.post('/auth/login', async (request, reply) => {
    const { email, password } = request.body as { email: string; password: string }
    const db = request.drizzle

    const rows = await db.select().from(users).where(eq(users.email, email))
    const user = rows.find((u: typeof users.$inferSelect) => u.role === 'MERCHANT_ADMIN' || u.role === 'STAFF')
    if (!user || !user.password) {
      return reply.status(401).send({ error: 'Invalid credentials' })
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      return reply.status(401).send({ error: 'Invalid credentials' })
    }

    const token = app.jwt.sign({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    })

    return reply.send({
      data: {
        token,
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
      },
    })
  })

  // 3. GET /api/v2/merchant/store
  app.get('/store', { preHandler: requireMerchant }, async (request, reply) => {
    const db = request.drizzle
    const userId = request.authUser!.sub

    if (request.store) {
      const [store] = await db.select().from(stores).where(
        and(eq(stores.id, request.store.id), eq(stores.ownerId, userId))
      )
      if (store) return reply.send({ data: store })
    }

    const [store] = await db.select().from(stores).where(eq(stores.ownerId, userId))
    if (!store) {
      return reply.status(404).send({ error: 'Store not found' })
    }

    return reply.send({ data: store })
  })

  // 4. PATCH /api/v2/merchant/store
  app.patch('/store', { preHandler: requireMerchant }, async (request, reply) => {
    const db = request.drizzle
    const userId = request.authUser!.sub
    const body = request.body as Partial<{
      name: string
      description: string
      logoUrl: string
      domain: string
      settings: unknown
    }>

    const [store] = await db.update(stores)
      .set({
        name: body.name,
        description: body.description,
        logoUrl: body.logoUrl,
        domain: body.domain,
        settings: body.settings,
        updatedAt: new Date(),
      })
      .where(eq(stores.ownerId, userId))
      .returning()

    if (!store) {
      return reply.status(404).send({ error: 'Store not found' })
    }

    return reply.send({ data: store })
  })

  // 5. GET /api/v2/merchant/products
  app.get('/products', { preHandler: requireMerchant }, async (request, reply) => {
    const db = request.drizzle
    const userId = request.authUser!.sub

    let storeId: string
    if (request.store) {
      const [s] = await db.select({ id: stores.id }).from(stores).where(
        and(eq(stores.id, request.store.id), eq(stores.ownerId, userId))
      )
      if (s) {
        storeId = s.id
      } else {
        const [s2] = await db.select({ id: stores.id }).from(stores).where(eq(stores.ownerId, userId))
        if (!s2) return reply.status(404).send({ error: 'Store not found' })
        storeId = s2.id
      }
    } else {
      const [s] = await db.select({ id: stores.id }).from(stores).where(eq(stores.ownerId, userId))
      if (!s) return reply.status(404).send({ error: 'Store not found' })
      storeId = s.id
    }

    const { page, limit, search, categoryId, status } = request.query as Record<string, string>
    const p = Math.max(1, Number(page || 1))
    const l = Math.max(1, Math.min(100, Number(limit || 20)))
    const offset = (p - 1) * l

    const conditions = [eq(products.storeId, storeId)]
    if (categoryId) conditions.push(eq(products.categoryId, categoryId))
    if (status === 'active') conditions.push(eq(products.isActive, true))
    if (status === 'inactive') conditions.push(eq(products.isActive, false))
    if (search) conditions.push(like(products.name, `%${search}%`))

    const data = await db.select()
      .from(products)
      .where(and(...conditions))
      .orderBy(desc(products.createdAt))
      .limit(l)
      .offset(offset)

    const totalResult = await db.select({ total: count() })
      .from(products)
      .where(and(...conditions))

    const total = Number(totalResult[0]?.total || 0)

    return reply.send({
      data,
      meta: { total, page: p, limit: l },
    })
  })

  // 6. POST /api/v2/merchant/products
  app.post('/products', { preHandler: requireMerchant }, async (request, reply) => {
    const db = request.drizzle
    const userId = request.authUser!.sub

    let storeId: string
    if (request.store) {
      const [s] = await db.select({ id: stores.id }).from(stores).where(
        and(eq(stores.id, request.store.id), eq(stores.ownerId, userId))
      )
      if (s) {
        storeId = s.id
      } else {
        const [s2] = await db.select({ id: stores.id }).from(stores).where(eq(stores.ownerId, userId))
        if (!s2) return reply.status(404).send({ error: 'Store not found' })
        storeId = s2.id
      }
    } else {
      const [s] = await db.select({ id: stores.id }).from(stores).where(eq(stores.ownerId, userId))
      if (!s) return reply.status(404).send({ error: 'Store not found' })
      storeId = s.id
    }

    const body = request.body as {
      name: string
      slug: string
      description?: string
      basePrice: number | string
      compareAtPrice?: number | string
      sku?: string
      categoryId?: string
      subcategoryId?: string
      currentQuantity?: number
      lowStockThreshold?: number
      trackInventory?: boolean
      isPublished?: boolean
      isActive?: boolean
      weight?: number | string
      imageUrls?: unknown
      seoTitle?: string
      seoDescription?: string
    }

    const [product] = await db.insert(products).values({
      storeId,
      name: body.name,
      slug: body.slug,
      description: body.description,
      basePrice: String(body.basePrice),
      compareAtPrice: body.compareAtPrice ? String(body.compareAtPrice) : undefined,
      sku: body.sku,
      categoryId: body.categoryId,
      subcategoryId: body.subcategoryId,
      currentQuantity: body.currentQuantity ?? 0,
      lowStockThreshold: body.lowStockThreshold ?? 5,
      trackInventory: body.trackInventory ?? true,
      isPublished: body.isPublished ?? false,
      isActive: body.isActive ?? true,
      weight: body.weight ? String(body.weight) : undefined,
      imageUrls: body.imageUrls,
      seoTitle: body.seoTitle,
      seoDescription: body.seoDescription,
    }).returning()

    return reply.status(201).send({ data: product })
  })

  // 7. PATCH /api/v2/merchant/products/:id
  app.patch('/products/:id', { preHandler: requireMerchant }, async (request, reply) => {
    const db = request.drizzle
    const userId = request.authUser!.sub
    const { id } = request.params as { id: string }

    let storeId: string
    if (request.store) {
      const [s] = await db.select({ id: stores.id }).from(stores).where(
        and(eq(stores.id, request.store.id), eq(stores.ownerId, userId))
      )
      if (s) {
        storeId = s.id
      } else {
        const [s2] = await db.select({ id: stores.id }).from(stores).where(eq(stores.ownerId, userId))
        if (!s2) return reply.status(404).send({ error: 'Store not found' })
        storeId = s2.id
      }
    } else {
      const [s] = await db.select({ id: stores.id }).from(stores).where(eq(stores.ownerId, userId))
      if (!s) return reply.status(404).send({ error: 'Store not found' })
      storeId = s.id
    }

    const body = request.body as Partial<{
      name: string
      slug: string
      description: string
      basePrice: number | string
      compareAtPrice: number | string
      sku: string
      categoryId: string
      subcategoryId: string
      currentQuantity: number
      lowStockThreshold: number
      trackInventory: boolean
      isPublished: boolean
      isActive: boolean
      weight: number | string
      imageUrls: unknown
      seoTitle: string
      seoDescription: string
    }>

    const [product] = await db.update(products)
      .set({
        name: body.name,
        slug: body.slug,
        description: body.description,
        basePrice: body.basePrice !== undefined ? String(body.basePrice) : undefined,
        compareAtPrice: body.compareAtPrice !== undefined ? String(body.compareAtPrice) : undefined,
        sku: body.sku,
        categoryId: body.categoryId,
        subcategoryId: body.subcategoryId,
        currentQuantity: body.currentQuantity,
        lowStockThreshold: body.lowStockThreshold,
        trackInventory: body.trackInventory,
        isPublished: body.isPublished,
        isActive: body.isActive,
        weight: body.weight !== undefined ? String(body.weight) : undefined,
        imageUrls: body.imageUrls,
        seoTitle: body.seoTitle,
        seoDescription: body.seoDescription,
        updatedAt: new Date(),
      })
      .where(and(eq(products.id, id), eq(products.storeId, storeId)))
      .returning()

    if (!product) {
      return reply.status(404).send({ error: 'Product not found' })
    }

    return reply.send({ data: product })
  })

  // 8. DELETE /api/v2/merchant/products/:id
  app.delete('/products/:id', { preHandler: requireMerchant }, async (request, reply) => {
    const db = request.drizzle
    const userId = request.authUser!.sub
    const { id } = request.params as { id: string }

    let storeId: string
    if (request.store) {
      const [s] = await db.select({ id: stores.id }).from(stores).where(
        and(eq(stores.id, request.store.id), eq(stores.ownerId, userId))
      )
      if (s) {
        storeId = s.id
      } else {
        const [s2] = await db.select({ id: stores.id }).from(stores).where(eq(stores.ownerId, userId))
        if (!s2) return reply.status(404).send({ error: 'Store not found' })
        storeId = s2.id
      }
    } else {
      const [s] = await db.select({ id: stores.id }).from(stores).where(eq(stores.ownerId, userId))
      if (!s) return reply.status(404).send({ error: 'Store not found' })
      storeId = s.id
    }

    const [product] = await db.update(products)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(products.id, id), eq(products.storeId, storeId)))
      .returning()

    if (!product) {
      return reply.status(404).send({ error: 'Product not found' })
    }

    return reply.status(204).send()
  })

  // 9. GET /api/v2/merchant/categories
  app.get('/categories', { preHandler: requireMerchant }, async (request, reply) => {
    const db = request.drizzle
    const userId = request.authUser!.sub

    let storeId: string
    if (request.store) {
      const [s] = await db.select({ id: stores.id }).from(stores).where(
        and(eq(stores.id, request.store.id), eq(stores.ownerId, userId))
      )
      if (s) {
        storeId = s.id
      } else {
        const [s2] = await db.select({ id: stores.id }).from(stores).where(eq(stores.ownerId, userId))
        if (!s2) return reply.status(404).send({ error: 'Store not found' })
        storeId = s2.id
      }
    } else {
      const [s] = await db.select({ id: stores.id }).from(stores).where(eq(stores.ownerId, userId))
      if (!s) return reply.status(404).send({ error: 'Store not found' })
      storeId = s.id
    }

    const data = await db.select()
      .from(categories)
      .where(eq(categories.storeId, storeId))
      .orderBy(asc(categories.sortOrder))

    return reply.send({ data })
  })

  // 10. POST /api/v2/merchant/categories
  app.post('/categories', { preHandler: requireMerchant }, async (request, reply) => {
    const db = request.drizzle
    const userId = request.authUser!.sub

    let storeId: string
    if (request.store) {
      const [s] = await db.select({ id: stores.id }).from(stores).where(
        and(eq(stores.id, request.store.id), eq(stores.ownerId, userId))
      )
      if (s) {
        storeId = s.id
      } else {
        const [s2] = await db.select({ id: stores.id }).from(stores).where(eq(stores.ownerId, userId))
        if (!s2) return reply.status(404).send({ error: 'Store not found' })
        storeId = s2.id
      }
    } else {
      const [s] = await db.select({ id: stores.id }).from(stores).where(eq(stores.ownerId, userId))
      if (!s) return reply.status(404).send({ error: 'Store not found' })
      storeId = s.id
    }

    const body = request.body as {
      name: string
      slug: string
      description?: string
      imageUrl?: string
      sortOrder?: number
      isActive?: boolean
    }

    const [category] = await db.insert(categories).values({
      storeId,
      name: body.name,
      slug: body.slug,
      description: body.description,
      imageUrl: body.imageUrl,
      sortOrder: body.sortOrder ?? 0,
      isActive: body.isActive ?? true,
    }).returning()

    return reply.status(201).send({ data: category })
  })

  // 11. GET /api/v2/merchant/orders
  app.get('/orders', { preHandler: requireMerchant }, async (request, reply) => {
    const db = request.drizzle
    const userId = request.authUser!.sub

    let storeId: string
    if (request.store) {
      const [s] = await db.select({ id: stores.id }).from(stores).where(
        and(eq(stores.id, request.store.id), eq(stores.ownerId, userId))
      )
      if (s) {
        storeId = s.id
      } else {
        const [s2] = await db.select({ id: stores.id }).from(stores).where(eq(stores.ownerId, userId))
        if (!s2) return reply.status(404).send({ error: 'Store not found' })
        storeId = s2.id
      }
    } else {
      const [s] = await db.select({ id: stores.id }).from(stores).where(eq(stores.ownerId, userId))
      if (!s) return reply.status(404).send({ error: 'Store not found' })
      storeId = s.id
    }

    const { status, page, limit } = request.query as Record<string, string>
    const p = Math.max(1, Number(page || 1))
    const l = Math.max(1, Math.min(100, Number(limit || 20)))
    const offset = (p - 1) * l

    const conditions = [eq(orders.storeId, storeId)]
    if (status) conditions.push(eq(orders.status, status as typeof orders.$inferSelect.status))

    const results = await db.select({
      order: orders,
      customer: customers,
    })
      .from(orders)
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .where(and(...conditions))
      .orderBy(desc(orders.createdAt))
      .limit(l)
      .offset(offset)

    const totalResult = await db.select({ total: count() })
      .from(orders)
      .where(and(...conditions))

    const total = Number(totalResult[0]?.total || 0)

    return reply.send({
      data: results.map((r) => ({ ...(r as { order: typeof orders.$inferSelect; customer: typeof customers.$inferSelect | null }).order, customer: (r as { order: typeof orders.$inferSelect; customer: typeof customers.$inferSelect | null }).customer })),
      meta: { total, page: p, limit: l },
    })
  })

  // 12. PATCH /api/v2/merchant/orders/:id/status
  app.patch('/orders/:id/status', { preHandler: requireMerchant }, async (request, reply) => {
    const db = request.drizzle
    const userId = request.authUser!.sub
    const { id } = request.params as { id: string }
    const { status } = request.body as { status: string }

    const validStatuses = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED']
    if (!validStatuses.includes(status)) {
      return reply.status(400).send({ error: 'Invalid status' })
    }

    let storeId: string
    if (request.store) {
      const [s] = await db.select({ id: stores.id }).from(stores).where(
        and(eq(stores.id, request.store.id), eq(stores.ownerId, userId))
      )
      if (s) {
        storeId = s.id
      } else {
        const [s2] = await db.select({ id: stores.id }).from(stores).where(eq(stores.ownerId, userId))
        if (!s2) return reply.status(404).send({ error: 'Store not found' })
        storeId = s2.id
      }
    } else {
      const [s] = await db.select({ id: stores.id }).from(stores).where(eq(stores.ownerId, userId))
      if (!s) return reply.status(404).send({ error: 'Store not found' })
      storeId = s.id
    }

    const [order] = await db.update(orders)
      .set({ status: status as typeof orders.$inferSelect.status, updatedAt: new Date() })
      .where(and(eq(orders.id, id), eq(orders.storeId, storeId)))
      .returning()

    if (!order) {
      return reply.status(404).send({ error: 'Order not found' })
    }

    return reply.send({ data: order })
  })

  // 13. GET /api/v2/merchant/customers
  app.get('/customers', { preHandler: requireMerchant }, async (request, reply) => {
    const db = request.drizzle
    const userId = request.authUser!.sub

    let storeId: string
    if (request.store) {
      const [s] = await db.select({ id: stores.id }).from(stores).where(
        and(eq(stores.id, request.store.id), eq(stores.ownerId, userId))
      )
      if (s) {
        storeId = s.id
      } else {
        const [s2] = await db.select({ id: stores.id }).from(stores).where(eq(stores.ownerId, userId))
        if (!s2) return reply.status(404).send({ error: 'Store not found' })
        storeId = s2.id
      }
    } else {
      const [s] = await db.select({ id: stores.id }).from(stores).where(eq(stores.ownerId, userId))
      if (!s) return reply.status(404).send({ error: 'Store not found' })
      storeId = s.id
    }

    const { page, limit } = request.query as Record<string, string>
    const p = Math.max(1, Number(page || 1))
    const l = Math.max(1, Math.min(100, Number(limit || 20)))
    const offset = (p - 1) * l

    const data = await db.select()
      .from(customers)
      .where(eq(customers.storeId, storeId))
      .orderBy(desc(customers.createdAt))
      .limit(l)
      .offset(offset)

    const totalResult = await db.select({ total: count() })
      .from(customers)
      .where(eq(customers.storeId, storeId))

    const total = Number(totalResult[0]?.total || 0)

    return reply.send({
      data,
      meta: { total, page: p, limit: l },
    })
  })

  // 14. GET /api/v2/merchant/analytics
  app.get('/analytics', { preHandler: requireMerchant }, async (request, reply) => {
    const db = request.drizzle
    const userId = request.authUser!.sub

    let storeId: string
    if (request.store) {
      const [s] = await db.select({ id: stores.id }).from(stores).where(
        and(eq(stores.id, request.store.id), eq(stores.ownerId, userId))
      )
      if (s) {
        storeId = s.id
      } else {
        const [s2] = await db.select({ id: stores.id }).from(stores).where(eq(stores.ownerId, userId))
        if (!s2) return reply.status(404).send({ error: 'Store not found' })
        storeId = s2.id
      }
    } else {
      const [s] = await db.select({ id: stores.id }).from(stores).where(eq(stores.ownerId, userId))
      if (!s) return reply.status(404).send({ error: 'Store not found' })
      storeId = s.id
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    const analytics = await db.select()
      .from(storeAnalytics)
      .where(
        and(eq(storeAnalytics.storeId, storeId), sql`${storeAnalytics.date} >= ${thirtyDaysAgo}`)
      )
      .orderBy(desc(storeAnalytics.date))

    const [ordersAgg] = await db.select({
      totalOrders: count(),
      totalRevenue: sql<string>`COALESCE(SUM(${orders.total}), '0')`,
    }).from(orders).where(eq(orders.storeId, storeId))

    const [productsAgg] = await db.select({
      totalProducts: count(),
    }).from(products).where(and(eq(products.storeId, storeId), eq(products.isActive, true)))

    return reply.send({
      data: {
        analytics,
        summary: {
          totalOrders: Number(ordersAgg?.totalOrders || 0),
          totalRevenue: ordersAgg?.totalRevenue || '0',
          totalProducts: Number(productsAgg?.totalProducts || 0),
        },
      },
    })
  })

  // 15. POST /api/v2/merchant/coupons
  app.post('/coupons', { preHandler: requireMerchant }, async (request, reply) => {
    const db = request.drizzle
    const userId = request.authUser!.sub

    let storeId: string
    if (request.store) {
      const [s] = await db.select({ id: stores.id }).from(stores).where(
        and(eq(stores.id, request.store.id), eq(stores.ownerId, userId))
      )
      if (s) {
        storeId = s.id
      } else {
        const [s2] = await db.select({ id: stores.id }).from(stores).where(eq(stores.ownerId, userId))
        if (!s2) return reply.status(404).send({ error: 'Store not found' })
        storeId = s2.id
      }
    } else {
      const [s] = await db.select({ id: stores.id }).from(stores).where(eq(stores.ownerId, userId))
      if (!s) return reply.status(404).send({ error: 'Store not found' })
      storeId = s.id
    }

    const body = request.body as {
      code: string
      description?: string
      discountType: string
      discountValue: number | string
      minOrderAmount?: number | string
      maxDiscountAmount?: number | string
      usageLimit?: number
      startsAt?: string
      expiresAt?: string
      isActive?: boolean
    }

    const [coupon] = await db.insert(coupons).values({
      storeId,
      code: body.code,
      description: body.description,
      discountType: body.discountType,
      discountValue: String(body.discountValue),
      minOrderAmount: body.minOrderAmount ? String(body.minOrderAmount) : undefined,
      maxDiscountAmount: body.maxDiscountAmount ? String(body.maxDiscountAmount) : undefined,
      usageLimit: body.usageLimit,
      startsAt: body.startsAt ? new Date(body.startsAt) : undefined,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
      isActive: body.isActive ?? true,
    }).returning()

    return reply.status(201).send({ data: coupon })
  })

  // 16. GET /api/v2/merchant/coupons
  app.get('/coupons', { preHandler: requireMerchant }, async (request, reply) => {
    const db = request.drizzle
    const userId = request.authUser!.sub

    let storeId: string
    if (request.store) {
      const [s] = await db.select({ id: stores.id }).from(stores).where(
        and(eq(stores.id, request.store.id), eq(stores.ownerId, userId))
      )
      if (s) {
        storeId = s.id
      } else {
        const [s2] = await db.select({ id: stores.id }).from(stores).where(eq(stores.ownerId, userId))
        if (!s2) return reply.status(404).send({ error: 'Store not found' })
        storeId = s2.id
      }
    } else {
      const [s] = await db.select({ id: stores.id }).from(stores).where(eq(stores.ownerId, userId))
      if (!s) return reply.status(404).send({ error: 'Store not found' })
      storeId = s.id
    }

    const { page, limit } = request.query as Record<string, string>
    const p = Math.max(1, Number(page || 1))
    const l = Math.max(1, Math.min(100, Number(limit || 20)))
    const offset = (p - 1) * l

    const data = await db.select()
      .from(coupons)
      .where(eq(coupons.storeId, storeId))
      .orderBy(desc(coupons.createdAt))
      .limit(l)
      .offset(offset)

    const totalResult = await db.select({ total: count() })
      .from(coupons)
      .where(eq(coupons.storeId, storeId))

    const total = Number(totalResult[0]?.total || 0)

    return reply.send({
      data,
      meta: { total, page: p, limit: l },
    })
  })
}
