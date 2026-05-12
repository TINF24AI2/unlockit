export default defineEventHandler(async (event) => {
  await authorize(event, isAdmin)

  const id = getRouterParam(event, 'id')
  const change = getRouterParam(event, 'change')?.toLowerCase()

  const session = await requireUserSession(event)
  const sessionUser = session.user as LoggedInUser

  const allowedChanges = ['approve', 'reject', 'revoke']

  if (!allowedChanges.includes(change ?? '')) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid change parameter'
    })
  }

  const assignment = await prisma.licenseAssignment.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      user: {
        select: {
          id: true,
          email: true,
          name: true
        }
      }
    }
  })

  if (assignment == null) {
    throw createError({
      statusCode: 404,
      statusMessage: 'License assignment not found'
    })
  }

  if (assignment.status === 'REVOKED') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Cannot change the status of a revoked license assignment'
    })
  }

  const newStatus = change === 'approve' ? 'APPROVED' : change === 'reject' ? 'REJECTED' : 'REVOKED'

  if (assignment.status === newStatus) {
    throw createError({
      statusCode: 400,
      statusMessage: `License assignment is already ${newStatus.toLowerCase()}`
    })
  }

  if (assignment.status === 'REJECTED' && newStatus === 'REVOKED') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Cannot revoke a rejected license assignment'
    })
  }

  await prisma.licenseAssignment.update({
    where: { id },
    data: {
      status: newStatus,
      processedAt: new Date(),
      processedById: Number(sessionUser.id)
    }
  })

  const { sendMail } = useNodeMailer()

  sendMail({
    to: assignment.user.email,
    subject: 'Ihr Lizenzantrag wurde bearbeitet',
    text: `Hallo ${assignment.user.name ?? ''},\n\nIhr Antrag auf eine Lizenz wurde bearbeitet. Prüfen Sie den Status Ihres Antrags in Ihrem Account.\n\nViele Grüße,\nIhr SE-SSP Team`
  }).catch((error) => {
    console.error('Error sending email:', error)
  })

  return {
    success: true,
    message: `License assignment ${change}d successfully`,
    newStatus: newStatus,
    id: id
  }
})
