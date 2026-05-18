import { FastifyInstance } from 'fastify'
import bcrypt from 'bcrypt'
import { schema } from '@jamicore/db'
import { eq, desc, sql, count } from 'drizzle-orm'
const { superAdmins, merchantPlans, stores, users, orders, customers } = schema

export async function superadminRoutes(app: FastifyInstance) {
  // 1. POST /api/v2/admin/auth/login
  app.post('/auth/login', async (request, reply) => {
    const { email, password } = request.body as { email: string; password: string }
    const db = request.drizzle

    const admin = await db.query.superAdmins.findFirst({
      where: eq(superAdmins.email, email),
    })
    if (!admin) {
      return reply.status(401).send({ error: 'Invalid credentials' })
    }

    const valid = await bcrypt.compare(password, admin.password)
    if (!valid) {
      return reply.status(401).send({ error: 'Invalid credentials' })
    }

    const token = app.jwt.sign({
      sub: admin.id,
      email: admin.email,
      name: admin.name,
      role: 'PLATFORM_ADMIN',
    })

    return reply.send({
      data: {
        token,
        user: {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          role: 'PLATFORM_ADMIN',
        },
      },
    })
  })

  // 2. GET /api/v2/admin/merchants
  app.get('/merchants', {
    preHandler: [app.authenticate, app.requireRole('PLATFORM_ADMIN')],
  }, async (request, reply) => {
    const db = request.drizzle
    const results = await db.select({
      user: users,
      store: stores,
    })
      .from(users)
      .leftJoin(stores, eq(stores.ownerId, users.id))
      .where(eq(users.role, 'MERCHANT_ADMIN'))

    return reply.send({ data: results })
  })

  // 3. PATCH /api/v2/admin/merchants/:id/status
  app.patch('/merchants/:id/status', {
    preHandler: [app.authenticate, app.requireRole('PLATFORM_ADMIN')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { status } = request.body as { status: string }
    const db = request.drizzle

    const store = await db.query.stores.findFirst({
      where: eq(stores.ownerId, id),
    })
    if (!store) {
      return reply.status(404).send({ error: 'Store not found for merchant' })
    }

    await db.update(stores)
      .set({ status: status as typeof stores.$inferSelect.status })
      .where(eq(stores.id, store.id))

    return reply.send({ data: { id: store.id, status } })
  })

  // 4. GET /api/v2/admin/plans
  app.get('/plans', {
    preHandler: [app.authenticate, app.requireRole('PLATFORM_ADMIN')],
  }, async (request, reply) => {
    const db = request.drizzle
    const allPlans = await db.select()
      .from(merchantPlans)
      .orderBy(desc(merchantPlans.createdAt))

    return reply.send({ data: allPlans })
  })

  // 5. POST /api/v2/admin/plans
  app.post('/plans', {
    preHandler: [app.authenticate, app.requireRole('PLATFORM_ADMIN')],
  }, async (request, reply) => {
    const body = request.body as {
      name: string
      description?: string
      price: number | string
      billingInterval?: string
      features?: unknown
      maxProducts?: number
      maxStaff?: number
    }
    const db = request.drizzle

    const [plan] = await db.insert(merchantPlans)
      .values({
        name: body.name,
        description: body.description,
        price: String(body.price),
        billingInterval: body.billingInterval || 'monthly',
        features: body.features,
        maxProducts: body.maxProducts,
        maxStaff: body.maxStaff,
      })
      .returning()

    return reply.status(201).send({ data: plan })
  })

  // 6. GET /api/v2/admin/stores
  app.get('/stores', {
    preHandler: [app.authenticate, app.requireRole('PLATFORM_ADMIN')],
  }, async (request, reply) => {
    const db = request.drizzle
    const { status, page, limit } = request.query as Record<string, string>

    const pageNum = Math.max(1, Number(page || 1))
    const limitNum = Math.max(1, Math.min(100, Number(limit || 20)))
    const offset = (pageNum - 1) * limitNum

    const results = await db.select({
      store: stores,
      owner: {
        id: users.id,
        email: users.email,
        name: users.name,
      },
    })
      .from(stores)
      .leftJoin(users, eq(users.id, stores.ownerId))
      .where(status ? eq(stores.status, status as typeof stores.$inferSelect.status) : undefined)
      .limit(limitNum)
      .offset(offset)

    const totalResult = await db.select({ total: count() })
      .from(stores)
      .where(status ? eq(stores.status, status as typeof stores.$inferSelect.status) : undefined)

    const total = totalResult[0]?.total || 0

    return reply.send({
      data: results,
      meta: { total, page: pageNum, limit: limitNum },
    })
  })

  // 7. GET /api/v2/admin/analytics
  app.get('/analytics', {
    preHandler: [app.authenticate, app.requireRole('PLATFORM_ADMIN')],
  }, async (request, reply) => {
    const db = request.drizzle

    const [storeCounts] = await db.select({
      total: count(),
      active: sql<number>`count(case when ${stores.status} = 'ACTIVE' then 1 end)`,
      suspended: sql<number>`count(case when ${stores.status} = 'SUSPENDED' then 1 end)`,
      pending: sql<number>`count(case when ${stores.status} = 'PENDING' then 1 end)`,
    }).from(stores)

    const [orderStats] = await db.select({
      totalOrders: count(),
      totalRevenue: sql<string>`coalesce(sum(${orders.total}), '0')`,
    }).from(orders)

    const [customerCount] = await db.select({
      totalCustomers: count(),
    }).from(customers)

    return reply.send({
      data: {
        storesByStatus: {
          total: storeCounts.total,
          active: storeCounts.active,
          suspended: storeCounts.suspended,
          pending: storeCounts.pending,
        },
        totalOrders: orderStats.totalOrders,
        totalRevenue: orderStats.totalRevenue,
        totalCustomers: customerCount.totalCustomers,
      },
    })
  })
}
