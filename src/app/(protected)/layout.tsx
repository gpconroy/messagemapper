import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { LogoutButton } from "@/components/LogoutButton"
import Link from "next/link"

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  const isAdmin = session.user.role === "admin"

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-green-600 text-white shadow-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center space-x-8">
              <h1 className="text-2xl font-bold">MessageMapper</h1>
              <nav className="flex space-x-4">
                <Link
                  href="/dashboard"
                  className="rounded-md px-3 py-2 text-sm font-medium text-white/90 hover:bg-green-700 hover:text-white"
                >
                  Dashboard
                </Link>
                {isAdmin && (
                  <Link
                    href="/admin/members"
                    className="rounded-md px-3 py-2 text-sm font-medium text-white/90 hover:bg-green-700 hover:text-white"
                  >
                    Members
                  </Link>
                )}
              </nav>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-sm font-medium">{session.user.name}</div>
                <div className="flex items-center justify-end space-x-2">
                  <span className="inline-flex items-center rounded-full bg-green-700 px-2 py-0.5 text-xs font-medium capitalize text-white">
                    {session.user.role}
                  </span>
                </div>
              </div>
              <LogoutButton />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}
