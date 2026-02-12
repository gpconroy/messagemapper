"use server"

import { auth } from "@/auth"
import { tenantQuery } from "@/lib/rls"
import { canEdit } from "@/lib/auth/rbac"
import { z } from "zod"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

const renameMappingConfigSchema = z.object({
  mappingConfigId: z.string().uuid("Invalid mapping config ID"),
  name: z.string().min(1, "Name is required").max(200, "Name too long"),
})

export async function renameMappingConfig(prevState: any, formData: FormData) {
  try {
    const session = await auth()
    if (!session?.user?.tenantId) {
      return { error: "Not authenticated" }
    }

    if (!canEdit(session.user.role)) {
      return { error: "You do not have permission to rename mapping configurations" }
    }

    const result = renameMappingConfigSchema.safeParse({
      mappingConfigId: formData.get("mappingConfigId"),
      name: formData.get("name"),
    })

    if (!result.success) {
      return { error: result.error.issues[0].message }
    }

    const { mappingConfigId, name } = result.data
    const workspaceId = formData.get("workspaceId") as string

    await tenantQuery(session.user.tenantId, async (db) => {
      return db.mappingConfig.update({
        where: { id: mappingConfigId },
        data: { name },
      })
    })

    revalidatePath(`/workspace/${workspaceId}`)
    return { success: true }
  } catch (error) {
    console.error("Error renaming mapping config:", error)
    return { error: "Failed to rename mapping configuration" }
  }
}

export async function deleteMappingConfig(mappingConfigId: string, workspaceId: string) {
  try {
    const session = await auth()
    if (!session?.user?.tenantId) {
      redirect("/login")
    }

    if (!canEdit(session.user.role)) {
      throw new Error("You do not have permission to delete mapping configurations")
    }

    await tenantQuery(session.user.tenantId, async (db) => {
      return db.mappingConfig.delete({
        where: { id: mappingConfigId },
      })
    })

    revalidatePath(`/workspace/${workspaceId}`)
  } catch (error) {
    console.error("Error deleting mapping config:", error)
    throw error
  }
}
