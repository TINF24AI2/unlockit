export function badCred() {
  throw createError({
    statusCode: 401,
    message: 'Bad credentials'
  })
}

export function requireGoodPassword(password: string, passname: string = 'Password'): void {
  if (password.length < 12) {
    throw createError({ statusCode: 400, statusMessage: `${passname} must be at least 12 characters` })
  }

  const passwordRegex = /^[A-Za-z0-9!#$%&]+$/
  if (!passwordRegex.test(password)) {
    throw createError({ statusCode: 400, statusMessage: `${passname} contains invalid characters` })
  }
}
