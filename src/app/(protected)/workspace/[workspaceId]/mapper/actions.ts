"use server"

import { auth } from "@/auth"
import { tenantQuery } from "@/lib/rls"
import { canEdit } from "@/lib/auth/rbac"
import { z } from "zod"
import { revalidatePath } from "next/cache"

// Validation schemas
const saveMappingConfigSchema = z.object({
  workspaceId: z.string().uuid(),
  mappingId: z.string().uuid().optional(),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  sourceSchemaId: z.string().uuid(),
  targetSchemaId: z.string().uuid(),
  mappingData: z.any(), // JSON data containing connections and transformations
})

const loadMappingConfigSchema = z.object({
  mappingId: z.string().uuid(),
})

const saveSchemaSchema = z.object({
  name: z.string().min(1, "Schema name is required"),
  formatType: z.enum(["json", "xml", "xsd", "json-schema"]),
  schemaData: z.any(), // JSON data containing FieldNode tree
})

/**
 * Save or update a mapping configuration
 */
export async function saveMappingConfig(data: z.infer<typeof saveMappingConfigSchema>) {
  try {
    const session = await auth()
    if (!session?.user?.tenantId) {
      return { success: false, error: "Unauthorized" }
    }

    // Validate input
    const validationResult = saveMappingConfigSchema.safeParse(data)
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.issues[0].message
      }
    }

    const validated = validationResult.data

    // Check if user can edit
    if (!canEdit(session.user.role)) {
      return { success: false, error: "You don't have permission to save mappings" }
    }

    // Verify workspace belongs to user's tenant
    const workspace = await tenantQuery(session.user.tenantId, async (db) => {
      return db.workspace.findUnique({
        where: { id: validated.workspaceId },
      })
    })

    if (!workspace) {
      return { success: false, error: "Workspace not found" }
    }

    if (validated.mappingId) {
      // Update existing mapping
      const updated = await tenantQuery(session.user.tenantId, async (db) => {
        return db.mappingConfig.update({
          where: { id: validated.mappingId },
          data: {
            name: validated.name,
            description: validated.description || null,
            mappingData: validated.mappingData,
            updatedAt: new Date(),
          },
        })
      })

      revalidatePath(`/workspace/${validated.workspaceId}`)
      return { success: true, mappingId: updated.id }
    } else {
      // Create new mapping
      const created = await tenantQuery(session.user.tenantId, async (db) => {
        return db.mappingConfig.create({
          data: {
            name: validated.name,
            description: validated.description || null,
            workspaceId: validated.workspaceId,
            sourceSchemaId: validated.sourceSchemaId,
            targetSchemaId: validated.targetSchemaId,
            mappingData: validated.mappingData,
            createdById: session.user.id,
            status: "draft",
          },
        })
      })

      revalidatePath(`/workspace/${validated.workspaceId}`)
      return { success: true, mappingId: created.id }
    }
  } catch (error) {
    console.error("Error saving mapping config:", error)
    return { success: false, error: "Failed to save mapping configuration" }
  }
}

/**
 * Load a mapping configuration
 */
export async function loadMappingConfig(mappingId: string) {
  try {
    const session = await auth()
    if (!session?.user?.tenantId) {
      return { success: false, error: "Unauthorized" }
    }

    // Validate input
    const validationResult = loadMappingConfigSchema.safeParse({ mappingId })
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.issues[0].message
      }
    }

    // Load mapping with related data
    const mapping = await tenantQuery(session.user.tenantId, async (db) => {
      return db.mappingConfig.findUnique({
        where: { id: mappingId },
        include: {
          sourceSchema: true,
          targetSchema: true,
          transformationRules: {
            orderBy: { order: "asc" },
          },
        },
      })
    })

    if (!mapping) {
      return { success: false, error: "Mapping not found" }
    }

    return { success: true, mapping }
  } catch (error) {
    console.error("Error loading mapping config:", error)
    return { success: false, error: "Failed to load mapping configuration" }
  }
}

/**
 * Save a schema to the database
 */
export async function saveSchemaToDB(data: z.infer<typeof saveSchemaSchema>) {
  try {
    const session = await auth()
    if (!session?.user?.tenantId) {
      return { success: false, error: "Unauthorized" }
    }

    // Validate input
    const validationResult = saveSchemaSchema.safeParse(data)
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.issues[0].message
      }
    }

    const validated = validationResult.data

    // Create schema
    const schema = await tenantQuery(session.user.tenantId, async (db) => {
      return db.formatSchema.create({
        data: {
          name: validated.name,
          formatType: validated.formatType,
          schemaData: validated.schemaData,
          tenantId: session.user.tenantId,
        },
      })
    })

    return { success: true, schema }
  } catch (error) {
    console.error("Error saving schema:", error)
    return { success: false, error: "Failed to save schema" }
  }
}
