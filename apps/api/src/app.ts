import fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import { dbPlugin } from './plugins/database.js'
import { healthRoutes } from './routes/health.js'
import { tenantRoutes } from './routes/tenants.js'

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
  await app.register(healthRoutes, { prefix: '/health' })
  await app.register(tenantRoutes, { prefix: '/api/v1/tenants' })

  return app
}
