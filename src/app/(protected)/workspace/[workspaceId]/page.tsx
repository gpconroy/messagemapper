import { auth } from "@/auth"
import { tenantQuery } from "@/lib/rls"
import { canEdit } from "@/lib/auth/rbac"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"

export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ workspaceId: string }>
}) {
  const session = await auth()
  if (!session?.user?.tenantId) {
    redirect("/login")
  }

  const { workspaceId } = await params

  const workspace = await tenantQuery(session.user.tenantId, async (db) => {
    return db.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        mappingConfigs: {
          orderBy: { updatedAt: "desc" },
          include: {
            createdBy: {
              select: { name: true, email: true },
            },
            sourceSchema: {
              select: { name: true, formatType: true },
            },
            targetSchema: {
              select: { name: true, formatType: true },
            },
          },
        },
      },
    })
  })

  if (!workspace) {
    notFound()
  }

  const userCanEdit = canEdit(session.user.role)

  return (
    <div>
      <div className="mb-6">
        <nav className="mb-4 flex items-center space-x-2 text-sm text-gray-500">
          <Link href="/dashboard" className="hover:text-green-600">
            Dashboard
          </Link>
          <span>/</span>
          <span className="text-gray-900">{workspace.name}</span>
        </nav>

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">{workspace.name}</h1>
          {workspace.description && (
            <p className="mt-2 text-sm text-gray-600">{workspace.description}</p>
          )}
        </div>

        <div className="flex items-center space-x-3">
          <Link
            href="/mapper"
            className="inline-flex items-center rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          >
            Open Mapper
          </Link>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">Mapping Configurations</h2>

        {workspace.mappingConfigs.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
            <h3 className="text-lg font-medium text-gray-900">No mapping configurations yet</h3>
            <p className="mt-2 text-sm text-gray-500">
              Open the mapper to create and save your first mapping configuration.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Source
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Target
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Created By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Last Updated
                  </th>
                  {userCanEdit && (
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {workspace.mappingConfigs.map((config) => (
                  <tr key={config.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{config.name}</div>
                      {config.description && (
                        <div className="text-sm text-gray-500">{config.description}</div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="text-sm text-gray-900">{config.sourceSchema.name}</div>
                      <div className="text-xs text-gray-500 uppercase">
                        {config.sourceSchema.formatType}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="text-sm text-gray-900">{config.targetSchema.name}</div>
                      <div className="text-xs text-gray-500 uppercase">
                        {config.targetSchema.formatType}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                          config.status === "active"
                            ? "bg-green-100 text-green-800"
                            : config.status === "archived"
                              ? "bg-gray-100 text-gray-800"
                              : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {config.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="text-sm text-gray-900">{config.createdBy.name}</div>
                      <div className="text-xs text-gray-500">{config.createdBy.email}</div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {new Date(config.updatedAt).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </td>
                    {userCanEdit && (
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                        <Link
                          href={`/mapper?config=${config.id}`}
                          className="text-green-600 hover:text-green-900"
                        >
                          Open
                        </Link>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
