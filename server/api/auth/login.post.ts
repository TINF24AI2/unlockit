import { z } from 'zod'
import { prisma } from '#server/utils/prisma'
import { badCred } from '#server/utils/auth'

const bodySchema = z.object({
  email: z.string(),
  password: z.string()
})

export default defineEventHandler(async (event) => {
  const { email, password } = await readValidatedBody(event, bodySchema.parse)

  // Prevent login with system user
  if (email === 'system') {
    badCred()
  }

  const users = await prisma.user.findMany({
    where: {
      email: {
        equals: email,
        mode: 'insensitive'
      },
      status: 'ACTIVE'
    },
    include: {
      passwordTokens: true
    }
  })

  if (users.length != 1) {
    badCred()
  }

  const user = users[0]!

  if (user.password == null) {
    badCred()
  }

  if (await verifyPassword(user.password, password)) {
    if (passwordNeedsReHash(user.password)) {
      const newHash = await hashPassword(password)
      await prisma.user.update({
        where: { id: user.id },
        data: { password: newHash }
      })
    }

    const sessionUser: LoggedInUser = {
      id: user.id,
      name: user.name || '',
      permissions: user.permissions
    }

    await setUserSession(event, {
      user: sessionUser
    })

    // Delete any open reset tokens, as they obviously know their password
    if (user.passwordTokens.length > 0) {
      try {
        await prisma.passwordTokens.deleteMany({
          where: {
            userId: user.id
          }
        })
      } catch {
        // Fail silently
      }
    }

    return {
      success: true,
      data: {
        id: user.id,
        name: user.name,
        permissions: user.permissions
      }
    }
  }

  badCred()
})
