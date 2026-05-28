import { z } from 'zod'
import { prisma } from '#server/utils/prisma'
import crypto from 'node:crypto'

const { sendMail } = useNodeMailer()

const bodySchema = z.object({
  email: z.string()
})

export default defineEventHandler(async (event) => {
  const { email } = await readValidatedBody(event, bodySchema.parse)

  if (email === 'system') {
    return { success: true } // Don't allow password reset for system user, but also don't reveal that it exists
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
    return { success: true } // Don't reveal whether the email exists or not
  }

  const user = users[0]!

  const token = crypto.randomBytes(32).toString('hex')

  await prisma.passwordTokens.create({
    data: {
      token,
      userId: user.id,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // Token expires in 24 hours
    }
  })

  try {
    await sendMail({
      to: user.email,
      subject: 'Passwort zurücksetzen',
      html: `
        <p>Hallo${user.name ? ` ${user.name}` : ''},</p>
        <p>Sie haben eine Anfrage zum Zurücksetzen Ihres Passworts erhalten. Bitte klicken Sie auf den unten stehenden Link, um ein neues Passwort festzulegen:</p>
        <a href="${getRequestURL(event).origin}/set-password?token=${token}">Passwort zurücksetzen</a>
        <p>Dieser Link läuft in 24 Stunden ab. Wenn Sie kein neues Passwort festlegen, können Sie diese E-Mail ignorieren.</p>
        <p>Wenn Sie diese Anfrage nicht gestellt haben, kontaktieren Sie bitte umgehend unseren Support.</p>
        <br>
        <p>Viele Grüße,<br>Ihr SE-SSP Team</p>
      `,
      text: `Hallo${user.name ? ` ${user.name}` : ''},\n\nSie haben eine Anfrage zum Zurücksetzen Ihres Passworts erhalten. Bitte verwenden Sie den unten stehenden Link, um ein neues Passwort festzulegen:\n\n${getRequestURL(event).origin}/set-password?token=${token}\n\nDieser Link läuft in 24 Stunden ab. Wenn Sie kein neues Passwort festlegen, können Sie diese E-Mail ignorieren.\n\nWenn Sie diese Anfrage nicht gestellt haben, kontaktieren Sie bitte umgehend unseren Support.\n\nViele Grüße,\nIhr SE-SSP Team`
    })
  } catch (error) {
    console.error('Error sending email:', error)
    // We don't want to fail the password reset request if the email fails to send, so we just log the error here.
  }

  return {
    success: true
  }
})
