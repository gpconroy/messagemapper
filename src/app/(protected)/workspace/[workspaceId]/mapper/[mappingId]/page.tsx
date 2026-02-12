import { auth } from "@/auth"
import { canEdit } from "@/lib/auth/rbac"
import { redirect, notFound } from "next/navigation"
import { loadMappingConfig } from "../actions"
import { LoadedMapperClient } from "./LoadedMapperClient"

export default async function LoadMappingPage({
  params,
}: {
  params: Promise<{ workspaceId: string; mappingId: string }>
}) {
  const session = await auth()
  if (!session?.user?.tenantId) {
    redirect("/login")
  }

  const { workspaceId, mappingId } = await params

  // Load the mapping configuration
  const result = await loadMappingConfig(mappingId)

  if (!result.success || !result.mapping) {
    notFound()
  }

  const mapping = result.mapping

  // Verify mapping belongs to the correct workspace
  if (mapping.workspaceId !== workspaceId) {
    notFound()
  }

  const userCanEdit = canEdit(session.user.role)

  return (
    <LoadedMapperClient
      workspaceId={workspaceId}
      mappingId={mappingId}
      mapping={mapping}
      canEdit={userCanEdit}
    />
  )
}
