import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '@jamicore/db'
import bcrypt from 'bcrypt'

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().optional(),
  role: z.enum(['PLATFORM_ADMIN', 'MERCHANT_ADMIN', 'CUSTOMER']).optional(),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function authRoutes(app: FastifyInstance) {
  app.post('/register', async (request, reply) => {
    const body = registerSchema.parse(request.body)

    const existing = await prisma.user.findUnique({
      where: { email: body.email },
    })
    if (existing) {
      return reply.status(409).send({ error: 'Email already registered' })
    }

    const hashed = await bcrypt.hash(body.password, 12)

    const user = await prisma.user.create({
      data: {
        email: body.email,
        password: hashed,
        name: body.name ?? null,
        role: body.role ?? 'CUSTOMER',
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    })

    return reply.status(201).send({ data: user })
  })

  app.post('/login', async (request, reply) => {
    const body = loginSchema.parse(request.body)

    const user = await prisma.user.findUnique({
      where: { email: body.email },
    })
    if (!user || !user.password) {
      return reply.status(401).send({ error: 'Invalid credentials' })
    }

    const valid = await bcrypt.compare(body.password, user.password)
    if (!valid) {
      return reply.status(401).send({ error: 'Invalid credentials' })
    }

    const token = app.jwt.sign({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    })

    return reply.send({
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
    })
  })

  app.get('/me', { preHandler: [app.authenticate] }, async (request) => {
    return { data: request.authUser }
  })
}
