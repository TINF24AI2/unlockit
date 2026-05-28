import z from 'zod'
import { prisma } from '#server/utils/prisma'

const { sendMail } = useNodeMailer()

const bodySchema = z.object({
  token: z.string(),
  password: z.string()
})

export default defineEventHandler(async (event) => {
  const { token, password } = await readValidatedBody(event, bodySchema.parse)

  requireGoodPassword(password)

  const tokenRecord = await prisma.passwordTokens.findUnique({
    where: { token },
    include: { user: true }
  })

  if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid token' })
  }

  const user = tokenRecord.user

  if (!(user.status == 'INVITED' || user.status == 'ACTIVE')) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid user status' })
  }

  const newHash = await hashPassword(password)
  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: newHash,
      status: 'ACTIVE' // Ensure the user is set to ACTIVE when they set their password
    }
  })

  // Delete the token after successful password reset
  await prisma.passwordTokens.delete({
    where: { id: tokenRecord.id }
  })

  // Send confirmation email
  try {
    await sendMail({
      to: user.email,
      subject: 'Ihr Passwort wurde erfolgreich festgelegt',
      text: `Hallo${user.name ? ` ${user.name}` : ''},\n\nIhr Passwort für Unlockit wurde erfolgreich ${user.status == 'INVITED' ? 'vergeben' : 'geändert'}. Sie können sich jetzt mit Ihrer E-Mail-Adresse und Ihrem neuen Passwort anmelden.\n\nWenn Sie diese Änderung nicht vorgenommen haben, kontaktieren Sie bitte umgehend unseren Support.\n\nViele Grüße,\nIhr SE-SSP Team`
    })
  } catch (error) {
    console.error('Error sending confirmation email:', error)
    // We don't want to fail the password reset if the email fails to send, so we just log the error here.
  }

  return {
    success: true
  }
})
