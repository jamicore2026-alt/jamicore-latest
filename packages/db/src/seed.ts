import { prisma } from './client.js'

async function main() {
  const tenant = await prisma.tenant.create({
    data: {
      name: 'JamiCore Demo',
      slug: 'demo',
      domain: 'demo.localhost',
      status: 'ACTIVE',
      plan: 'pro',
      dbSchema: 'tenant_demo',
    },
  })

  console.log(`Created tenant: ${tenant.name} (${tenant.id})`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
