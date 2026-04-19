import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../../generated/prisma/client'

const database = process.env.DATABASE_NAME;
const host = process.env.DATABASE_HOST;
const port = process.env.DATABASE_PORT;
const user = process.env.DATABASE_USER;
const password = process.env.DATABASE_PASSWORD;

if (!database) {
  throw new Error('DATABASE_NAME is not set')
}
if (!host) {
  throw new Error('DATABASE_HOST is not set')
}
if (!port) {
  throw new Error('DATABASE_PORT is not set')
}
if (!user) {
  throw new Error('DATABASE_USER is not set')
}
if (!password) {
  throw new Error('DATABASE_PASSWORD is not set')
}

const adapter = new PrismaPg({
  database,
  host,
  port: parseInt(port, 10),
  user,
  password,
})

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
