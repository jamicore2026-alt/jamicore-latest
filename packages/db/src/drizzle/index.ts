import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import * as schema from './schema.js'

const { Pool } = pg

export type DrizzleClient = NodePgDatabase<typeof schema> & { $client: pg.Pool }

const globalForDrizzle = globalThis as unknown as {
  drizzleClientMap?: Map<string, DrizzleClient>
}

if (!globalForDrizzle.drizzleClientMap) {
  globalForDrizzle.drizzleClientMap = new Map()
}

const clientMap = globalForDrizzle.drizzleClientMap

export function createDrizzleClient(connectionString?: string): DrizzleClient {
  const url = connectionString || process.env.DATABASE_URL || 'postgresql://jamicore:jamicore@localhost:5432/jamicore'
  const cacheKey = url

  if (clientMap.has(cacheKey)) {
    return clientMap.get(cacheKey)!
  }

  const pool = new Pool({
    connectionString: url,
    max: 10,
    idleTimeoutMillis: 30_000,
  })

  const db = drizzle(pool, { schema })
  const extended = Object.assign(db, { $client: pool })
  clientMap.set(cacheKey, extended)
  return extended
}

export const db = createDrizzleClient()

export type Schema = typeof schema
