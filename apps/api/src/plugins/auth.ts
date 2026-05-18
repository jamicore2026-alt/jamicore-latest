import fp from 'fastify-plugin'
import jwt from '@fastify/jwt'

export interface AuthUser {
  sub: string
  email: string
  name?: string
  role?: string
}

export const authPlugin = fp(async (fastify) => {
  await fastify.register(jwt, {
    secret: process.env.NEXTAUTH_SECRET || 'change-me-in-production',
  })

  fastify.decorate('authenticate', async (request, reply) => {
    try {
      await request.jwtVerify()
      const payload = request.user as unknown as AuthUser
      request.authUser = payload
    } catch {
      reply.status(401).send({ error: 'Unauthorized' })
    }
  })
})

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
  interface FastifyRequest {
    authUser: AuthUser | null
  }
}
