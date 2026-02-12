import "next-auth"
import { JWT } from "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name: string | null
      role: string
      tenantId: string
    }
  }

  interface User {
    role: string
    tenantId: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string
    tenantId?: string
    id?: string
  }
}
