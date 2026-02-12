import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    // Get users with argon2 hashes
    const usersToDelete = await prisma.$queryRaw`
      SELECT id, email FROM users WHERE "passwordHash" LIKE '$argon2%'
    `

    if (usersToDelete.length === 0) {
      console.log('✅ No users with argon2 hashes found')
      return
    }

    console.log(`Found ${usersToDelete.length} user(s) with argon2 hashes:`)
    usersToDelete.forEach(u => console.log(`  - ${u.email}`))

    // Delete in a transaction to handle cascades properly
    await prisma.$transaction(async (tx) => {
      // Delete related mapping configs first
      const userIds = usersToDelete.map(u => u.id)
      const deletedMappings = await tx.$executeRaw`
        DELETE FROM mapping_configs WHERE "createdById" IN (${userIds.join(',')})
      `
      console.log(`Deleted ${deletedMappings} related mapping config(s)`)

      // Now delete the users
      const deletedUsers = await tx.$executeRaw`
        DELETE FROM users WHERE "passwordHash" LIKE '$argon2%'
      `
      console.log(`✅ Deleted ${deletedUsers} user(s) with legacy argon2 password hashes`)
    })

    console.log('✨ You can now sign up with a fresh account!')
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error(error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
