import { describe, it, expect } from 'vitest'
import { build } from './app.js'

describe('API', () => {
  it('health check returns ok', async () => {
    const app = await build()
    const res = await app.inject({ method: 'GET', url: '/health' })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.payload)
    expect(body).toHaveProperty('status', 'ok')
  })
})
