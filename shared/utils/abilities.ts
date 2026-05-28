import type { LoggedInUser } from '../types/user'

export const isUser = defineAbility(() => true)

export const isAdmin = defineAbility((user: LoggedInUser) => user.permissions.includes('ADMIN'))

export const noSelfChange = defineAbility((user: LoggedInUser, targetUserId: number) => {
  if (!user.permissions.includes('ADMIN')) {
    return false
  }
  if (user.id === targetUserId) {
    return deny('Admins cannot change their own', 403)
  }
  return true
})
