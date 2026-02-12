import { auth } from "@/auth"
import { redirect } from "next/navigation"

export type Role = "admin" | "editor" | "viewer"

export async function requireRole(allowedRoles: Role[]) {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  if (!allowedRoles.includes(session.user.role as Role)) {
    redirect("/unauthorized")
  }

  return session
}

export function canEdit(role: string): boolean {
  return role === "admin" || role === "editor"
}
