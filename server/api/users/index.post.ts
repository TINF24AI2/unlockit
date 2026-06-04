import { Permission } from '../../../generated/prisma/client'
import { prisma } from '#server/utils/prisma'
import z from 'zod'
import { randomBytes } from 'node:crypto'

const { sendMail } = useNodeMailer()

const bodySchema = z.object({
  email: z.string().email(),
  username: z.string().optional(),
  admin: z.boolean().optional()
})

export default defineEventHandler(async (event) => {
  const { appUrl } = useRuntimeConfig()
  await authorize(event, isAdmin)

  const session = await requireUserSession(event)
  const sessionUser = session.user as LoggedInUser
  const createdById = Number(sessionUser.id)

  const { email, username: name, admin } = await readValidatedBody(event, bodySchema.parse)

  // Validate required fields
  if (!email) {
    throw createError({ statusCode: 400, statusMessage: 'email is required' })
  }

  // Check if email has a valid format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid email format' })
  }

  // Check if email is already in use
  const existingUser = await prisma.user.findUnique({
    where: { email }
  })

  if (existingUser) {
    throw createError({ statusCode: 409, statusMessage: 'Email is already in use' })
  }

  // Derivate permissions from frontend boolean checkbox
  const permissions: Permission[] = admin === true ? [Permission.ADMIN] : []

  const token = randomBytes(32).toString('hex')

  const user = await prisma.user.create({
    data: {
      email,
      name,
      password: null,
      permissions,
      createdById,
      passwordTokens: {
        create: {
          token: token,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // Token expires in 24 hours
        }
      }
    },
    select: {
      id: true,
      email: true,
      name: true,
      permissions: true
    }
  })

  try {
    await sendMail({
      to: email,
      subject: 'You have been invited to Unlockit',
      html: `
        <p>Hallo${name ? ` ${name}` : ''},</p>
        <p>Sie wurden eingeladen, sich bei Unlockit anzumelden. Bitte klicken Sie auf den unten stehenden Link, um Ihr Passwort festzulegen und Ihren Account zu aktivieren:</p>
        <a href="${appUrl}/set-password?token=${token}">Passwort festlegen</a>
        <p>Dieser Link läuft in 24 Stunden ab. Danach können Sie die Funktion zum Zurücksetzen des Passworts mit dieser E-Mail-Adresse verwenden, um einen neuen Link zu generieren.</p>
        <p>Wenn Sie diese Einladung nicht erwartet haben, ignorieren Sie bitte diese E-Mail.</p>
        <br>
        <p>Viele Grüße,<br>Ihr SE-SSP Team</p>
      `,
      text: `Hallo${name ? ` ${name}` : ''},\n\nSie wurden eingeladen, sich bei Unlockit anzumelden. Bitte verwenden Sie den unten stehenden Link, um Ihr Passwort festzulegen und Ihren Account zu aktivieren:\n\n${appUrl}/set-password?token=${token}\n\nDieser Link läuft in 24 Stunden ab. Danach können Sie die Funktion zum Zurücksetzen des Passworts mit dieser E-Mail-Adresse verwenden, um einen neuen Link zu generieren.\n\nWenn Sie diese Einladung nicht erwartet haben, ignorieren Sie bitte diese E-Mail.\n\nViele Grüße,\nIhr SE-SSP Team`
    })
  } catch (error) {
    console.error(error)

    // If sending the email fails, delete the created user to prevent orphaned records and security issues with unused tokens
    await prisma.user.delete({
      where: { id: user.id }
    })
    throw createError({ statusCode: 500, statusMessage: 'Failed to send invitation email' })
  }

  return {
    success: true,
    data: user
  }
})
