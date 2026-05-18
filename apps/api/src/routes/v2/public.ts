import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { schema } from '@jamicore/db'
import { eq, and, like, desc, asc, sql, count } from 'drizzle-orm'
const { stores, products, categories, subcategories, customers, carts, cartItems, orders, orderItems, reviews, shippingZones, taxRates } = schema

const getStoreId = (request: FastifyRequest) => request.store?.id

function parseCookie(request: FastifyRequest, name: string): string | undefined {
  const header = request.headers.cookie
  if (!header) return undefined
  const match = header.split(';').find((c) => c.trim().startsWith(`${name}=`))
  return match ? match.trim().slice(name.length + 1) : undefined
}

function setCookie(reply: FastifyReply, name: string, value: string, maxAge = 60 * 60 * 24 * 365) {
  reply.header('Set-Cookie', `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`)
}

function generateOrderNumber() {
  return `ORD-${Date.now()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`
}

function generateSessionId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export async function publicRoutes(app: FastifyInstance) {
  // 1. GET /api/v2/store
  app.get('/store', async (request, reply) => {
    const storeId = getStoreId(request)
    if (!storeId) return reply.status(400).send({ error: 'Store not found' })

    const [store] = await request.drizzle
      .select({
        id: stores.id,
        name: stores.name,
        slug: stores.slug,
        domain: stores.domain,
        description: stores.description,
        logoUrl: stores.logoUrl,
        status: stores.status,
      })
      .from(stores)
      .where(eq(stores.id, storeId))
      .limit(1)

    if (!store) return reply.status(404).send({ error: 'Store not found' })
    return { data: store }
  })

  // 2. GET /api/v2/products
  app.get('/products', async (request, reply) => {
    const storeId = getStoreId(request)
    if (!storeId) return reply.status(400).send({ error: 'Store not found' })

    const {
      categoryId,
      subcategoryId,
      search,
      minPrice,
      maxPrice,
      inStock,
      page,
      limit,
    } = request.query as Record<string, string>

    const conditions = [
      eq(products.storeId, storeId),
      eq(products.isPublished, true),
      eq(products.isActive, true),
    ]

    if (categoryId) conditions.push(eq(products.categoryId, categoryId))
    if (subcategoryId) conditions.push(eq(products.subcategoryId, subcategoryId))
    if (search) {
      conditions.push(like(products.name, `%${search}%`))
    }
    if (minPrice) {
      conditions.push(sql`${products.basePrice}::numeric >= ${Number(minPrice)}`)
    }
    if (maxPrice) {
      conditions.push(sql`${products.basePrice}::numeric <= ${Number(maxPrice)}`)
    }
    if (inStock === 'true') {
      conditions.push(sql`${products.currentQuantity} > 0`)
    }

    const take = Math.max(1, Math.min(100, Number(limit || 20)))
    const currentPage = Math.max(1, Number(page || 1))
    const skip = (currentPage - 1) * take

    const where = and(...conditions)

    const [{ count: totalCount }] = await request.drizzle
      .select({ count: count() })
      .from(products)
      .where(where)

    const rows = await request.drizzle
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        description: products.description,
        basePrice: products.basePrice,
        compareAtPrice: products.compareAtPrice,
        sku: products.sku,
        barcode: products.barcode,
        weight: products.weight,
        imageUrls: products.imageUrls,
        isPublished: products.isPublished,
        trackInventory: products.trackInventory,
        currentQuantity: products.currentQuantity,
        lowStockThreshold: products.lowStockThreshold,
        isActive: products.isActive,
        seoTitle: products.seoTitle,
        seoDescription: products.seoDescription,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
        categoryName: categories.name,
        subcategoryName: subcategories.name,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(subcategories, eq(products.subcategoryId, subcategories.id))
      .where(where)
      .orderBy(desc(products.createdAt))
      .limit(take)
      .offset(skip)

    return {
      data: rows,
      meta: {
        total: Number(totalCount),
        page: currentPage,
        limit: take,
        totalPages: Math.ceil(Number(totalCount) / take),
      },
    }
  })

  // 3. GET /api/v2/products/:slug
  app.get('/products/:slug', async (request, reply) => {
    const storeId = getStoreId(request)
    if (!storeId) return reply.status(400).send({ error: 'Store not found' })

    const { slug } = request.params as { slug: string }

    const [product] = await request.drizzle
      .select({
        id: products.id,
        storeId: products.storeId,
        categoryId: products.categoryId,
        subcategoryId: products.subcategoryId,
        name: products.name,
        slug: products.slug,
        description: products.description,
        basePrice: products.basePrice,
        compareAtPrice: products.compareAtPrice,
        sku: products.sku,
        barcode: products.barcode,
        weight: products.weight,
        imageUrls: products.imageUrls,
        isPublished: products.isPublished,
        trackInventory: products.trackInventory,
        currentQuantity: products.currentQuantity,
        lowStockThreshold: products.lowStockThreshold,
        isActive: products.isActive,
        seoTitle: products.seoTitle,
        seoDescription: products.seoDescription,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
        categoryName: categories.name,
        subcategoryName: subcategories.name,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(subcategories, eq(products.subcategoryId, subcategories.id))
      .where(and(eq(products.slug, slug), eq(products.storeId, storeId)))
      .limit(1)

    if (!product) return reply.status(404).send({ error: 'Product not found' })

    const productReviews = await request.drizzle
      .select({
        id: reviews.id,
        rating: reviews.rating,
        title: reviews.title,
        body: reviews.body,
        isVerifiedPurchase: reviews.isVerifiedPurchase,
        helpfulCount: reviews.helpfulCount,
        createdAt: reviews.createdAt,
        customerFirstName: customers.firstName,
        customerLastName: customers.lastName,
      })
      .from(reviews)
      .leftJoin(customers, eq(reviews.customerId, customers.id))
      .where(and(eq(reviews.productId, product.id), eq(reviews.isApproved, true)))
      .orderBy(desc(reviews.createdAt))

    return { data: { ...product, reviews: productReviews } }
  })

  // 4. GET /api/v2/categories
  app.get('/categories', async (request, reply) => {
    const storeId = getStoreId(request)
    if (!storeId) return reply.status(400).send({ error: 'Store not found' })

    const rows = await request.drizzle
      .select({
        category: categories,
        subcategory: subcategories,
      })
      .from(categories)
      .leftJoin(subcategories, eq(categories.id, subcategories.categoryId))
      .where(and(eq(categories.storeId, storeId), eq(categories.isActive, true)))
      .orderBy(asc(categories.sortOrder), asc(subcategories.sortOrder))

    const grouped = new Map<string, typeof categories.$inferSelect & { subcategories: typeof subcategories.$inferSelect[] }>()
    for (const row of rows) {
      const cat = row.category
      if (!grouped.has(cat.id)) {
        grouped.set(cat.id, { ...cat, subcategories: [] })
      }
      if (row.subcategory) {
        grouped.get(cat.id)!.subcategories.push(row.subcategory)
      }
    }

    return { data: Array.from(grouped.values()) }
  })

  // 5. GET /api/v2/search
  app.get('/search', async (request, reply) => {
    const storeId = getStoreId(request)
    if (!storeId) return reply.status(400).send({ error: 'Store not found' })

    const { q } = request.query as { q?: string }
    if (!q || q.trim().length === 0) {
      return reply.status(400).send({ error: 'Missing search query' })
    }

    const results = await request.drizzle
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        basePrice: products.basePrice,
        compareAtPrice: products.compareAtPrice,
        imageUrls: products.imageUrls,
        isPublished: products.isPublished,
        currentQuantity: products.currentQuantity,
      })
      .from(products)
      .where(
        and(
          eq(products.storeId, storeId),
          eq(products.isPublished, true),
          eq(products.isActive, true),
          sql`${products.name} ILIKE ${`%${q.trim()}%`}`,
        ),
      )
      .orderBy(desc(products.createdAt))
      .limit(20)

    return { data: results }
  })

  // 6. POST /api/v2/cart
  app.post('/cart', async (request, reply) => {
    const storeId = getStoreId(request)
    if (!storeId) return reply.status(400).send({ error: 'Store not found' })

    let sessionId = parseCookie(request, 'sessionId')
    if (!sessionId) {
      sessionId = generateSessionId()
      setCookie(reply, 'sessionId', sessionId)
    }

    const body = request.body as { items: Array<{ productId: string; quantity: number }> }
    const d = request.drizzle

    // Find or create guest cart
    let [cart] = await d
      .select()
      .from(carts)
      .where(and(eq(carts.sessionId, sessionId), eq(carts.storeId, storeId), eq(carts.isGuest, true)))
      .limit(1)

    if (!cart) {
      const [newCart] = await d
        .insert(carts)
        .values({
          storeId,
          sessionId,
          isGuest: true,
          currency: 'USD',
        })
        .returning()
      cart = newCart
    }

    // Validate products and compute line items
    const lineItems: Array<{
      cartId: string
      productId: string
      quantity: number
      unitPrice: string
      totalPrice: string
    }> = []
    let subtotal = 0

    for (const item of body.items || []) {
      const qty = Math.max(1, Number(item.quantity) || 1)
      const [product] = await d
        .select({
          id: products.id,
          basePrice: products.basePrice,
          isPublished: products.isPublished,
          isActive: products.isActive,
          trackInventory: products.trackInventory,
          currentQuantity: products.currentQuantity,
        })
        .from(products)
        .where(and(eq(products.id, item.productId), eq(products.storeId, storeId)))
        .limit(1)

      if (!product || !product.isPublished || !product.isActive) {
        return reply.status(400).send({ error: `Product not found or unavailable: ${item.productId}` })
      }

      if (product.trackInventory && Number(product.currentQuantity) < qty) {
        return reply.status(400).send({ error: `Insufficient stock for product ${item.productId}` })
      }

      const unitPrice = Number(product.basePrice)
      const totalPrice = unitPrice * qty
      subtotal += totalPrice

      lineItems.push({
        cartId: cart.id,
        productId: product.id,
        quantity: qty,
        unitPrice: product.basePrice,
        totalPrice: totalPrice.toFixed(2),
      })
    }

    // Upsert cart items by clearing existing and inserting new
    await d.delete(cartItems).where(eq(cartItems.cartId, cart.id))
    if (lineItems.length > 0) {
      await d.insert(cartItems).values(lineItems)
    }

    // Update cart totals
    const totalStr = subtotal.toFixed(2)
    const [updatedCart] = await d
      .update(carts)
      .set({
        subtotal: totalStr,
        total: totalStr,
      })
      .where(eq(carts.id, cart.id))
      .returning()

    const items = await d
      .select({
        id: cartItems.id,
        productId: cartItems.productId,
        quantity: cartItems.quantity,
        unitPrice: cartItems.unitPrice,
        totalPrice: cartItems.totalPrice,
        productName: products.name,
        productSlug: products.slug,
      })
      .from(cartItems)
      .leftJoin(products, eq(cartItems.productId, products.id))
      .where(eq(cartItems.cartId, cart.id))

    return { data: { ...updatedCart, items } }
  })

  // 7. GET /api/v2/cart
  app.get('/cart', async (request, reply) => {
    const storeId = getStoreId(request)
    if (!storeId) return reply.status(400).send({ error: 'Store not found' })

    const sessionId = parseCookie(request, 'sessionId')
    if (!sessionId) {
      return { data: null }
    }

    const [cart] = await request.drizzle
      .select()
      .from(carts)
      .where(and(eq(carts.sessionId, sessionId), eq(carts.storeId, storeId), eq(carts.isGuest, true)))
      .limit(1)

    if (!cart) {
      return { data: null }
    }

    const items = await request.drizzle
      .select({
        id: cartItems.id,
        productId: cartItems.productId,
        quantity: cartItems.quantity,
        unitPrice: cartItems.unitPrice,
        totalPrice: cartItems.totalPrice,
        productName: products.name,
        productSlug: products.slug,
        productImageUrls: products.imageUrls,
      })
      .from(cartItems)
      .leftJoin(products, eq(cartItems.productId, products.id))
      .where(eq(cartItems.cartId, cart.id))

    return { data: { ...cart, items } }
  })

  // 8. POST /api/v2/orders/guest
  app.post('/orders/guest', async (request, reply) => {
    const storeId = getStoreId(request)
    if (!storeId) return reply.status(400).send({ error: 'Store not found' })

    const body = request.body as {
      items: Array<{ productId: string; quantity: number }>
      shippingAddress: Record<string, unknown>
      email: string
      phone?: string
    }

    const d = request.drizzle

    const result = await d.transaction(async (t: unknown) => {
      const tx = t as typeof d
      // Find or create customer
      const [existingCustomer] = await tx
        .select()
        .from(customers)
        .where(and(eq(customers.email, body.email), eq(customers.storeId, storeId)))
        .limit(1)

      let customerId: string
      if (existingCustomer) {
        customerId = existingCustomer.id
        if (body.phone) {
          await tx.update(customers).set({ phone: body.phone }).where(eq(customers.id, customerId))
        }
      } else {
        const [newCustomer] = await tx
          .insert(customers)
          .values({
            storeId,
            email: body.email,
            phone: body.phone || null,
          })
          .returning()
        customerId = newCustomer.id
      }

      // Build order items and compute totals
      const orderItemsToInsert: Array<{
        orderId: string
        productId: string
        productName: string
        sku: string | null
        quantity: number
        unitPrice: string
        totalPrice: string
      }> = []
      let subtotal = 0

      for (const item of body.items || []) {
        const qty = Math.max(1, Number(item.quantity) || 1)
        const [product] = await tx
          .select({
            id: products.id,
            name: products.name,
            sku: products.sku,
            basePrice: products.basePrice,
            isPublished: products.isPublished,
            isActive: products.isActive,
            trackInventory: products.trackInventory,
            currentQuantity: products.currentQuantity,
          })
          .from(products)
          .where(and(eq(products.id, item.productId), eq(products.storeId, storeId)))
          .limit(1)

        if (!product || !product.isPublished || !product.isActive) {
          throw new Error(`Product not found or unavailable: ${item.productId}`)
        }

        if (product.trackInventory && Number(product.currentQuantity) < qty) {
          throw new Error(`Insufficient stock for product ${item.productId}`)
        }

        const unitPrice = Number(product.basePrice)
        const totalPrice = unitPrice * qty
        subtotal += totalPrice

        orderItemsToInsert.push({
          orderId: '',
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          quantity: qty,
          unitPrice: product.basePrice,
          totalPrice: totalPrice.toFixed(2),
        })
      }

      const subtotalStr = subtotal.toFixed(2)

      const [order] = await tx
        .insert(orders)
        .values({
          storeId,
          customerId,
          orderNumber: generateOrderNumber(),
          status: 'PENDING',
          paymentStatus: 'PENDING',
          subtotal: subtotalStr,
          taxAmount: '0.00',
          shippingAmount: '0.00',
          discountAmount: '0.00',
          total: subtotalStr,
          currency: 'USD',
          shippingAddress: body.shippingAddress,
          ipAddress: request.ip || null,
          userAgent: request.headers['user-agent'] || null,
        })
        .returning()

      if (orderItemsToInsert.length > 0) {
        await tx.insert(orderItems).values(
          orderItemsToInsert.map((oi) => ({ ...oi, orderId: order.id })),
        )
      }

      // Decrement stock
      for (const item of body.items || []) {
        const qty = Math.max(1, Number(item.quantity) || 1)
        const [product] = await tx
          .select({
            id: products.id,
            trackInventory: products.trackInventory,
            currentQuantity: products.currentQuantity,
          })
          .from(products)
          .where(and(eq(products.id, item.productId), eq(products.storeId, storeId)))
          .limit(1)

        if (product && product.trackInventory) {
          await tx
            .update(products)
            .set({
              currentQuantity: sql`${products.currentQuantity} - ${qty}`,
            })
            .where(eq(products.id, product.id))
        }
      }

      return order
    })

    return reply.status(201).send({ data: result })
  })

  // 9. GET /api/v2/shipping/zones
  app.get('/shipping/zones', async (request, reply) => {
    const storeId = getStoreId(request)
    if (!storeId) return reply.status(400).send({ error: 'Store not found' })

    const zones = await request.drizzle
      .select()
      .from(shippingZones)
      .where(and(eq(shippingZones.storeId, storeId), eq(shippingZones.isActive, true)))
      .orderBy(asc(shippingZones.name))

    return { data: zones }
  })

  // 10. GET /api/v2/tax/rates
  app.get('/tax/rates', async (request, reply) => {
    const storeId = getStoreId(request)
    if (!storeId) return reply.status(400).send({ error: 'Store not found' })

    const rates = await request.drizzle
      .select()
      .from(taxRates)
      .where(and(eq(taxRates.storeId, storeId), eq(taxRates.isActive, true)))
      .orderBy(asc(taxRates.name))

    return { data: rates }
  })
}
