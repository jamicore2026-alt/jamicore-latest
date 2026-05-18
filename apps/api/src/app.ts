import fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import { dbPlugin } from './plugins/database.js'
import { tenantPlugin } from './plugins/tenant.js'
import { authPlugin } from './plugins/auth.js'
import { rbacPlugin } from './plugins/rbac.js'
import { healthRoutes } from './routes/health.js'
import { tenantRoutes } from './routes/tenants.js'
import { authRoutes } from './routes/auth.js'
import { productRoutes } from './routes/products.js'
import { categoryRoutes } from './routes/categories.js'
import { cartRoutes } from './routes/cart.js'
import { orderRoutes } from './routes/orders.js'
import { paymentRoutes } from './routes/payments.js'
import { webhookRoutes } from './routes/webhook.js'

export async function build() {
  const app = fastify({
    logger: {
      transport: process.env.NODE_ENV === 'development'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
    },
  })

  await app.register(helmet)
  await app.register(cors, { origin: true, credentials: true })
  await app.register(swagger, {
    openapi: {
      info: { title: 'JamiCore API', version: '1.0.0' },
      servers: [{ url: 'http://localhost:3001' }],
    },
  })
  await app.register(swaggerUi, { routePrefix: '/docs' })

  await app.register(dbPlugin)
  await app.register(authPlugin)
  await app.register(rbacPlugin)
  await app.register(tenantPlugin)
  await app.register(healthRoutes, { prefix: '/health' })
  await app.register(authRoutes, { prefix: '/api/v1/auth' })
  await app.register(tenantRoutes, { prefix: '/api/v1/tenants' })
  await app.register(productRoutes, { prefix: '/api/v1/products' })
  await app.register(categoryRoutes, { prefix: '/api/v1/categories' })
  await app.register(cartRoutes, { prefix: '/api/v1/cart' })
  await app.register(orderRoutes, { prefix: '/api/v1/orders' })
  await app.register(paymentRoutes, { prefix: '/api/v1/payments' })
  await app.register(webhookRoutes, { prefix: '/webhooks' })

  return app
}
