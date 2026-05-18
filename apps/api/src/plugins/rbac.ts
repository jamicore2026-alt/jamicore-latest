import fp from 'fastify-plugin'

export const rbacPlugin = fp(async (fastify) => {
  fastify.decorate('requireRole', (...roles: string[]) => {
    return async (request: import('fastify').FastifyRequest, reply: import('fastify').FastifyReply) => {
      if (!request.authUser) {
        return reply.status(401).send({ error: 'Unauthorized' })
      }
      if (!roles.includes(request.authUser.role || 'CUSTOMER')) {
        return reply.status(403).send({ error: 'Forbidden' })
      }
    }
  })
})

declare module 'fastify' {
  interface FastifyInstance {
    requireRole: (...roles: string[]) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}
