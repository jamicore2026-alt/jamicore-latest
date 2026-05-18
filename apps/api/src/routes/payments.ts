import { FastifyInstance } from 'fastify'
import Stripe from 'stripe'

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2026-04-22.dahlia',
  })
}

export async function paymentRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate)

  app.post('/checkout', async (request, reply) => {
    const tp = request.tenantPrisma
    const userId = request.authUser?.sub
    const userEmail = request.authUser?.email
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
    const lineItems: Array<Record<string, unknown>> = []

    for (const item of cart.items) {
      if (!item.product.isActive || item.product.stock < item.quantity) {
        return reply.status(400).send({
          error: `Insufficient stock for ${item.product.name}`,
        })
      }
      const unitAmount = Math.round(Number(item.product.price) * 100)
      total += Number(item.product.price) * item.quantity
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: { name: item.product.name },
          unit_amount: unitAmount,
        },
        quantity: item.quantity,
      })
    }

    const order = await tp.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          userId,
          total,
          status: 'PENDING',
          paymentStatus: 'PENDING',
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

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const session = await getStripe().checkout.sessions.create({
      line_items: lineItems,
      mode: 'payment',
      success_url: `${baseUrl}/dashboard/orders?success=1`,
      cancel_url: `${baseUrl}/cart?canceled=1`,
      customer_email: userEmail,
      metadata: {
        orderId: order.id,
        tenantSchema: request.tenant?.dbSchema || '',
      },
    })

    await tp.order.update({
      where: { id: order.id },
      data: { stripeSessionId: session.id },
    })

    return { url: session.url }
  })
}
