import fp from 'fastify-plugin'
import { createPrismaClient } from '@jamicore/db'

export const dbPlugin = fp(async (fastify) => {
  const prisma = createPrismaClient('public')

  fastify.decorate('prisma', prisma)
  fastify.addHook('onClose', async () => {
    await prisma.$disconnect()
  })
})

declare module 'fastify' {
  interface FastifyInstance {
    prisma: ReturnType<typeof createPrismaClient>
  }
}
