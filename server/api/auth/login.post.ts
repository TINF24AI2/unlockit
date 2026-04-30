import { z } from 'zod'
import { prisma } from '../../utils/prisma'

const bodySchema = z.object({
  email: z.string(),
  password: z.string()
})

function badCred() {
  throw createError({
    statusCode: 401,
    message: 'Bad credentials'
  })
}

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
      }
    }
  })

  if (users.length != 1) {
    badCred()
  }

  const user = users[0]!

  if (await verifyPassword(user.password, password)) {
    if (passwordNeedsReHash(user.password)) {
      const newHash = await hashPassword(password)
      await prisma.user.update({
        where: { id: user.id },
        data: { password: newHash }
      })
    }

    await setUserSession(event, {
      user: {
        id: user.id,
        name: user.name,
        permissions: user.permissions
      }
    })
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
