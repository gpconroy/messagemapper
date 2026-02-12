import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    const users = await prisma.$queryRaw`
      SELECT
        email,
        "tenantId",
        LENGTH("passwordHash") as hash_length,
        SUBSTRING("passwordHash", 1, 20) as hash_prefix
      FROM users
      ORDER BY "createdAt" DESC
      LIMIT 10
    `

    console.log('Production database users:')
    console.log(JSON.stringify(users, null, 2))

    const argon2Users = users.filter(u => u.hash_prefix?.startsWith('$argon2'))
    if (argon2Users.length > 0) {
      console.log(`\n⚠️  Found ${argon2Users.length} users with argon2 hashes that need to be deleted`)
    } else {
      console.log('\n✅ No argon2 users found!')
    }
  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

main()
