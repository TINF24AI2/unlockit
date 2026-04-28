import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma/client'

const database = process.env.DATABASE_NAME
const host = process.env.DATABASE_HOST
const port = process.env.DATABASE_PORT
const user = process.env.DATABASE_USER
const password = process.env.DATABASE_PASSWORD

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
  password
})

const prisma = new PrismaClient({ adapter })

async function main() {
  const system = await prisma.user.create({
    data: {
      email: 'system',
      name: 'System',
      password: 'system',
      permissions: ['ADMIN']
    }
  })

  await prisma.user.create({
    data: {
      email: 'admin',
      name: 'Admin',
      password: '$scrypt$n=16384,r=8,p=1$NxeN6Yey0RhcUGHIRYg0Wg$BTerWnJ5irPHV5mPLiLMd5Kiqf7RNtk8nA1LvpafsD69kvhW8L9HRmwww+BGWUYXksB8CglO8PXW7UE2dLw4wQ',
      permissions: ['ADMIN'],
      createdById: system.id
    }
  })
}

main().then(async () => {
  await prisma.$disconnect()
})
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
