// Type-safe environment variable access
// Fails fast with clear error message if required vars are missing

function getEnvVar(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
      `Check your .env.local file.`
    )
  }
  return value
}

export const env = {
  get DATABASE_URL() {
    return getEnvVar('DATABASE_URL')
  },
  get DIRECT_URL() {
    return getEnvVar('DIRECT_URL')
  },
  get NODE_ENV() {
    return process.env.NODE_ENV || 'development'
  },
  get IS_PRODUCTION() {
    return process.env.NODE_ENV === 'production'
  },
} as const
