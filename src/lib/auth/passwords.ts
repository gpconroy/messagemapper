import "server-only"
import argon2 from "argon2"

const hashingConfig = {
  memoryCost: 65536, // 64 MB (64 * 1024 KB)
  timeCost: 3, // 3 iterations
  parallelism: 4, // 4 parallel threads
  type: argon2.argon2id, // Use Argon2id variant
}

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, hashingConfig)
}

export async function verifyPassword(
  password: string,
  passwordHash: string
): Promise<boolean> {
  try {
    return await argon2.verify(passwordHash, password)
  } catch {
    return false
  }
}
