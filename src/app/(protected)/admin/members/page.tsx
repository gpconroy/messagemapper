import { requireRole } from "@/lib/auth/rbac"
import { tenantQuery } from "@/lib/rls"
import { InviteUserForm } from "./InviteUserForm"
import { RoleSelector } from "./RoleSelector"

export default async function MembersPage() {
  const session = await requireRole(["admin"])

  const members = await tenantQuery(session.user.tenantId, async (db) => {
    return db.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    })
  })

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Organization Members</h1>
        <p className="mt-2 text-sm text-gray-600">
          Manage user roles and invite new members to your organization
        </p>
      </div>

      <div className="mb-8">
        <InviteUserForm />
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Joined
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {members.map((member) => {
              const isCurrentUser = member.id === session.user.id

              return (
                <tr
                  key={member.id}
                  className={isCurrentUser ? "bg-green-50" : "hover:bg-gray-50"}
                >
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center">
                      <div className="text-sm font-medium text-gray-900">
                        {member.name}
                        {isCurrentUser && (
                          <span className="ml-2 text-xs text-green-600">(You)</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="text-sm text-gray-500">{member.email}</div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <RoleSelector
                      userId={member.id}
                      currentRole={member.role}
                      disabled={isCurrentUser}
                    />
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {new Date(member.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
