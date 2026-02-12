"use server"

import { auth } from "@/auth"
import { tenantQuery } from "@/lib/rls"
import { canEdit } from "@/lib/auth/rbac"
import { z } from "zod"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

const createWorkspaceSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  description: z.string().optional(),
})

const renameWorkspaceSchema = z.object({
  workspaceId: z.string().uuid("Invalid workspace ID"),
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
})

export async function createWorkspace(prevState: any, formData: FormData) {
  try {
    const session = await auth()
    if (!session?.user?.tenantId) {
      return { error: "Not authenticated" }
    }

    // Only editors and admins can create workspaces
    if (!canEdit(session.user.role)) {
      return { error: "You do not have permission to create workspaces" }
    }

    const result = createWorkspaceSchema.safeParse({
      name: formData.get("name"),
      description: formData.get("description") || undefined,
    })

    if (!result.success) {
      return { error: result.error.issues[0].message }
    }

    const { name, description } = result.data

    const workspace = await tenantQuery(session.user.tenantId, async (db) => {
      return db.workspace.create({
        data: {
          name,
          description: description || null,
          tenantId: session.user.tenantId,
        },
      })
    })

    revalidatePath("/dashboard")
    return { success: true, workspaceId: workspace.id }
  } catch (error) {
    console.error("Error creating workspace:", error)
    return { error: "Failed to create workspace" }
  }
}

export async function renameWorkspace(prevState: any, formData: FormData) {
  try {
    const session = await auth()
    if (!session?.user?.tenantId) {
      return { error: "Not authenticated" }
    }

    if (!canEdit(session.user.role)) {
      return { error: "You do not have permission to rename workspaces" }
    }

    const result = renameWorkspaceSchema.safeParse({
      workspaceId: formData.get("workspaceId"),
      name: formData.get("name"),
    })

    if (!result.success) {
      return { error: result.error.issues[0].message }
    }

    const { workspaceId, name } = result.data

    await tenantQuery(session.user.tenantId, async (db) => {
      return db.workspace.update({
        where: { id: workspaceId },
        data: { name },
      })
    })

    revalidatePath("/dashboard")
    return { success: true }
  } catch (error) {
    console.error("Error renaming workspace:", error)
    return { error: "Failed to rename workspace" }
  }
}

export async function deleteWorkspace(workspaceId: string) {
  try {
    const session = await auth()
    if (!session?.user?.tenantId) {
      redirect("/login")
    }

    // Only admins can delete workspaces
    if (session.user.role !== "admin") {
      throw new Error("Only admins can delete workspaces")
    }

    await tenantQuery(session.user.tenantId, async (db) => {
      return db.workspace.delete({
        where: { id: workspaceId },
      })
    })

    revalidatePath("/dashboard")
  } catch (error) {
    console.error("Error deleting workspace:", error)
    throw error
  }
}
