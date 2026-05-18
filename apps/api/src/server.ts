import { build } from './app.js'

async function main() {
  const app = await build()
  const port = Number(process.env.API_PORT || 3001)
  await app.listen({ port, host: '0.0.0.0' })
  app.log.info(`Server running at http://localhost:${port}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
