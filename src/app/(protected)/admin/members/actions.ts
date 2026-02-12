"use server"

import { requireRole } from "@/lib/auth/rbac"
import { tenantQuery } from "@/lib/rls"
import { prisma } from "@/lib/prisma"
import { hashPassword } from "@/lib/auth/passwords"
import { z } from "zod"
import { revalidatePath } from "next/cache"
import crypto from "crypto"

const updateRoleSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
  role: z.enum(["admin", "editor", "viewer"]),
})

const inviteUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().min(1, "Name is required"),
  role: z.enum(["admin", "editor", "viewer"]),
})

export async function updateUserRole(prevState: any, formData: FormData) {
  try {
    const session = await requireRole(["admin"])

    const result = updateRoleSchema.safeParse({
      userId: formData.get("userId"),
      role: formData.get("role"),
    })

    if (!result.success) {
      return { error: result.error.issues[0].message }
    }

    const { userId, role } = result.data

    // Prevent admin from changing their own role
    if (userId === session.user.id) {
      return { error: "You cannot change your own role" }
    }

    await tenantQuery(session.user.tenantId, async (db) => {
      return db.user.update({
        where: { id: userId },
        data: { role },
      })
    })

    revalidatePath("/admin/members")
    return { success: true }
  } catch (error) {
    console.error("Error updating user role:", error)
    return { error: "Failed to update user role" }
  }
}

export async function inviteUser(prevState: any, formData: FormData) {
  try {
    const session = await requireRole(["admin"])

    const result = inviteUserSchema.safeParse({
      email: formData.get("email"),
      name: formData.get("name"),
      role: formData.get("role"),
    })

    if (!result.success) {
      return { error: result.error.issues[0].message }
    }

    const { email, name, role } = result.data

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return { error: "A user with this email already exists" }
    }

    // Generate temporary password
    const temporaryPassword = crypto.randomUUID().slice(0, 12)
    const passwordHash = await hashPassword(temporaryPassword)

    // Create user (not using tenantQuery here since we're inserting into users table)
    await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        role,
        tenantId: session.user.tenantId,
      },
    })

    revalidatePath("/admin/members")
    return { success: true, temporaryPassword }
  } catch (error) {
    console.error("Error inviting user:", error)
    return { error: "Failed to invite user" }
  }
}
