import { auth } from "@/auth"
import { tenantQuery } from "@/lib/rls"
import { canEdit } from "@/lib/auth/rbac"
import { redirect, notFound } from "next/navigation"
import { WorkspaceMapperClient } from "./WorkspaceMapperClient"

export default async function WorkspaceMapperPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>
}) {
  const session = await auth()
  if (!session?.user?.tenantId) {
    redirect("/login")
  }

  const { workspaceId } = await params

  // Verify workspace exists and user has access
  const workspace = await tenantQuery(session.user.tenantId, async (db) => {
    return db.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        id: true,
        name: true,
      },
    })
  })

  if (!workspace) {
    notFound()
  }

  const userCanEdit = canEdit(session.user.role)

  return (
    <WorkspaceMapperClient
      workspaceId={workspaceId}
      workspaceName={workspace.name}
      canEdit={userCanEdit}
    />
  )
}
