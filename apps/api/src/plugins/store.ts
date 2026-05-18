import { FastifyInstance } from 'fastify'
import fastifyPlugin from 'fastify-plugin'
import { db, schema, DrizzleClient } from '@jamicore/db'
import { eq } from 'drizzle-orm'
const { stores } = schema

declare module 'fastify' {
  interface FastifyRequest {
    store?: { id: string; slug: string; name: string; status: string } | null
    drizzle: DrizzleClient
  }
  interface FastifyInstance {
    drizzle: DrizzleClient
  }
}

export const storePlugin = fastifyPlugin(async (app: FastifyInstance) => {
  app.decorate('drizzle', db)

  app.addHook('onRequest', async (request) => {
    request.drizzle = app.drizzle

    const host = request.headers.host || ''
    const subdomain = host.split(':')[0]?.split('.')[0] || ''
    const headerSlug = request.headers['x-store-slug'] as string | undefined
    const slug = headerSlug || (subdomain !== 'localhost' && subdomain !== 'www' ? subdomain : undefined)

    if (!slug) {
      request.store = null
      return
    }

    try {
      const store = await db.query.stores.findFirst({
        where: eq(stores.slug, slug),
      })
      request.store = store
        ? { id: store.id, slug: store.slug, name: store.name, status: store.status }
        : null
    } catch {
      request.store = null
    }
  })
})
