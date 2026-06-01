import type { AssignmentStatus } from '~~/generated/prisma/enums'
import type { Prisma } from '../../../../generated/prisma/client'

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
      licenseKeyId: true,
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

  const newStatus: AssignmentStatus = change === 'approve' ? 'APPROVED' : change === 'reject' ? 'REJECTED' : 'REVOKED' as AssignmentStatus

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

  // Fetch license info to determine whether status needs to change when usages update
  const license = await prisma.licenseKey.findUnique({
    where: { id: assignment.licenseKeyId },
    select: { id: true, currentUsages: true, maxUsages: true, status: true }
  })

  if (!license) {
    throw createError({ statusCode: 404, statusMessage: 'License key not found' })
  }

  const operations: Prisma.PrismaPromise<unknown>[] = [
    prisma.licenseAssignment.update({
      where: { id },
      data: {
        status: newStatus,
        history: {
          create: {
            id: crypto.randomUUID(),
            newStatus: newStatus,
            oldStatus: assignment.status as AssignmentStatus,
            changedBy: {
              connect: {
                id: Number(sessionUser.id)
              }
            }
          }
        }
      }
    })
  ]

  // If the assignment is approved, update the license key's current usages and check if exhausted
  // If the assignment is revoked, decrease the current usages and set status back to active if it was exhausted before
  if (newStatus === 'APPROVED') {
    const newUsages = (license.currentUsages ?? 0) + 1
    const willBeExhausted = license.maxUsages !== null && newUsages >= license.maxUsages
    operations.push(
      prisma.licenseKey.update({
        where: { id: assignment.licenseKeyId },
        data: {
          currentUsages: { increment: 1 },
          ...(willBeExhausted ? { status: 'EXHAUSTED' } : {})
        }
      })
    )
    // If this approval will exhaust the license, reject other pending assignments
    if (willBeExhausted) {
      const pendingAssignments = await prisma.licenseAssignment.findMany({
        where: {
          licenseKeyId: assignment.licenseKeyId,
          status: 'PENDING',
          NOT: { id }
        },
        select: { id: true }
      })

      for (const pa of pendingAssignments) {
        operations.push(
          prisma.licenseAssignment.update({
            where: { id: pa.id },
            data: {
              status: 'REJECTED',
              assignmentNote: 'Alle verfügbaren Lizenzen wurden bereits vergeben.',
              history: {
                create: {
                  id: crypto.randomUUID(),
                  oldStatus: 'PENDING',
                  newStatus: 'REJECTED',
                  changedBy: {
                    connect: {
                      id: Number(sessionUser.id)
                    }
                  }
                }
              }
            }
          })
        )
      }
    }
  } else if (newStatus === 'REVOKED') {
    const newUsages = (license.currentUsages ?? 0) - 1
    const restoreActive = license.status === 'EXHAUSTED' && license.maxUsages !== null && newUsages < license.maxUsages
    operations.push(
      prisma.licenseKey.update({
        where: { id: assignment.licenseKeyId },
        data: {
          currentUsages: { decrement: 1 },
          ...(restoreActive ? { status: 'ACTIVE' } : {})
        }
      })
    )
  }

  await prisma.$transaction(operations)

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
