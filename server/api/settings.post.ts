import { createError, defineEventHandler, readBody, type H3Event } from 'h3'
import { prisma } from '../utils/prisma'

interface SettingPayload {
  field?: string
  value?: string
}

export default defineEventHandler(async (event: H3Event) => {
  const body = await readBody<SettingPayload>(event)

  const field = body.field?.trim()
  const value = body.value?.trim()

  if (!field || !value) {
    throw createError({
      statusCode: 400,
      statusMessage: 'field und value sind erforderlich'
    })
  }

  const setting = await prisma.setting.upsert({
    where: { field },
    update: { value },
    create: { field, value }
  })

  return {
    success: true,
    data: setting
  }
})
