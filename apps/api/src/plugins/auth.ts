import fp from 'fastify-plugin'
import jwt from '@fastify/jwt'

export interface AuthUser {
  sub: string
  email: string
  name?: string
  role?: string
}

function getTokenFromCookie(cookies: string | undefined): string | null {
  if (!cookies) return null
  const names = ['authjs.session-token', '__Secure-authjs.session-token', 'next-auth.session-token']
  for (const name of names) {
    const match = cookies.match(new RegExp(`${name}=([^;]+)`))
    if (match) return decodeURIComponent(match[1])
  }
  return null
}

export const authPlugin = fp(async (fastify) => {
  await fastify.register(jwt, {
    secret: process.env.NEXTAUTH_SECRET || 'change-me-in-production',
  })

  fastify.decorate('authenticate', async (request, reply) => {
    try {
      const authHeader = request.headers.authorization
      if (authHeader?.startsWith('Bearer ')) {
        await request.jwtVerify()
      } else {
        const cookieToken = getTokenFromCookie(request.headers.cookie)
        if (!cookieToken) {
          reply.status(401).send({ error: 'Unauthorized' })
          return
        }
        const decoded = await fastify.jwt.verify(cookieToken)
        request.user = decoded as AuthUser
      }
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
