import { FastifyInstance } from 'fastify'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-04-22.dahlia',
})

export async function webhookRoutes(app: FastifyInstance) {
  app.post('/stripe', {
    config: { rawBody: true },
  }, async (request, reply) => {
    const raw = request.body as Record<string, unknown> | string
    const payload = typeof raw === 'string' ? raw : JSON.stringify(raw)
    const sig = request.headers['stripe-signature'] as string
    const secret = process.env.STRIPE_WEBHOOK_SECRET || ''

    if (!sig || !secret) {
      return reply.status(400).send({ error: 'Missing signature or secret' })
    }

    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(payload, sig, secret)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      return reply.status(400).send({ error: `Webhook Error: ${message}` })
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const orderId = session.metadata?.orderId
      const tenantSchema = session.metadata?.tenantSchema

      if (orderId && tenantSchema) {
        const { createPrismaClient } = await import('@jamicore/db')
        const prisma = createPrismaClient(tenantSchema)
        await prisma.order.update({
          where: { id: orderId },
          data: { paymentStatus: 'PAID', status: 'CONFIRMED' },
        })
        await prisma.$disconnect()
      }
    }

    return { received: true }
  })
}
