import type { LoggedInUser } from '../types/user'

export const isUser = defineAbility(() => true)

export const isAdmin = defineAbility((user: LoggedInUser) => user.permissions.includes('ADMIN'))

export const noSelfElevation = defineAbility((user: LoggedInUser, targetUserId: number) => {
  if (!user.permissions.includes('ADMIN')) {
    return false
  }
  if (user.id === targetUserId) {
    return deny('Admins cannot elevate themselves', 403)
  }
  return true
})
