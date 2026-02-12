import { auth } from "@/auth"
import { tenantQuery } from "@/lib/rls"
import { canEdit } from "@/lib/auth/rbac"
import { redirect } from "next/navigation"
import Link from "next/link"
import { CreateWorkspaceForm } from "./CreateWorkspaceForm"

export default async function DashboardPage() {
  const session = await auth()

  if (!session?.user?.tenantId) {
    redirect("/login")
  }

  const workspaces = await tenantQuery(session.user.tenantId, async (db) => {
    return db.workspace.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { mappingConfigs: true },
        },
      },
    })
  })

  const userCanEdit = canEdit(session.user.role)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Workspaces</h1>
        <p className="mt-2 text-sm text-gray-600">
          Organize your mapping configurations by workspace
        </p>
      </div>

      {userCanEdit && (
        <div className="mb-6">
          <CreateWorkspaceForm />
        </div>
      )}

      {workspaces.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <h3 className="text-lg font-medium text-gray-900">No workspaces yet</h3>
          <p className="mt-2 text-sm text-gray-500">
            {userCanEdit
              ? "Create your first workspace to get started organizing your mappings."
              : "Ask an admin or editor to create a workspace."}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {workspaces.map((workspace) => (
            <Link
              key={workspace.id}
              href={`/workspace/${workspace.id}`}
              className="group block rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition hover:border-green-500 hover:shadow-md"
            >
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-green-600">
                  {workspace.name}
                </h3>
                {workspace.description && (
                  <p className="mt-1 text-sm text-gray-600">{workspace.description}</p>
                )}
              </div>

              <div className="flex items-center justify-between text-sm text-gray-500">
                <div>
                  <span className="font-medium">{workspace._count.mappingConfigs}</span> mapping
                  {workspace._count.mappingConfigs !== 1 ? "s" : ""}
                </div>
                <div>
                  {new Date(workspace.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
