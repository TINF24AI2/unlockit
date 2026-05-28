import { z } from 'zod'
import { prisma } from '#server/utils/prisma'
import { badCred, requireGoodPassword } from '#server/utils/auth'

const bodySchema = z.object({
  email: z.string(),
  oldPassword: z.string(),
  newPassword: z.string()
})

export default defineEventHandler(async (event) => {
  const { email, oldPassword, newPassword } = await readValidatedBody(event, bodySchema.parse)

  requireGoodPassword(newPassword, 'New password')

  if (email === 'system') {
    badCred()
  }

  const users = await prisma.user.findMany({
    where: {
      email: {
        equals: email,
        mode: 'insensitive'
      }
    }
  })

  if (users.length != 1) {
    badCred()
  }

  const user = users[0]!

  if (user.password == null) {
    badCred()
  }
  if (await verifyPassword(user.password, oldPassword)) {
    const newHash = await hashPassword(newPassword)
    await prisma.user.update({
      where: { id: user.id },
      data: { password: newHash }
    })

    // Logout user if logged in with old password
    await clearUserSession(event)

    return {
      success: true
    }
  }

  badCred()
})
