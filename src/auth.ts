import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import "./lib/auth/types"
import { z } from "zod"

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { type: "email" },
        password: { type: "password" },
      },
      authorize: async (credentials) => {
        try {
          const { email, password } = credentialsSchema.parse(credentials)

          // Login happens before we know tenant context, so we scope a one-row lookup
          // using an auth-specific session variable recognized by RLS policy.
          const user = await prisma.$transaction(async (tx) => {
            await tx.$executeRaw`SELECT set_config('app.auth_email', ${email}, TRUE)`
            return tx.user.findUnique({
              where: { email },
              include: { tenant: true },
            })
          })

          if (!user || !user.passwordHash) {
            return null
          }

          // Lazy-load password utilities to avoid Edge runtime bundling issues
          const { verifyPassword } = await import("@/lib/auth/passwords")
          const isValid = await verifyPassword(password, user.passwordHash)
          if (!isValid) {
            return null
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            tenantId: user.tenantId,
          }
        } catch (error) {
          console.error("Authorization error:", error)
          return null
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.tenantId = user.tenantId
        token.id = user.id
      }
      return token
    },
    session({ session, token }) {
      session.user.role = token.role as string
      session.user.tenantId = token.tenantId as string
      session.user.id = token.id as string
      return session
    },
  },
})
