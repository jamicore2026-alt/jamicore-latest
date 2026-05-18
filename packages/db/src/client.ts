import { PrismaClient } from '../../.generated/prisma-client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const globalForPrisma = globalThis as unknown as {
  prismaClientMap?: Map<string, PrismaClient>
}

if (!globalForPrisma.prismaClientMap) {
  globalForPrisma.prismaClientMap = new Map()
}

const clientMap = globalForPrisma.prismaClientMap

export function createPrismaClient(schema: string = 'public'): PrismaClient {
  const cacheKey = `${process.env.DATABASE_URL}__${schema}`

  if (clientMap.has(cacheKey)) {
    return clientMap.get(cacheKey)!
  }

  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30_000,
  })

  const adapter = new PrismaPg(pool, {
    schema,
    disposeExternalPool: true,
  })

  const client = new PrismaClient({ adapter })
  clientMap.set(cacheKey, client)
  return client
}

export const prisma = createPrismaClient('public')
