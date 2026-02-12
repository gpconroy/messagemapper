"use client"

import { useActionState, useEffect, useRef, useState } from "react"
import { inviteUser } from "./actions"

export function InviteUserForm() {
  const [state, formAction, isPending] = useActionState(inviteUser, null)
  const formRef = useRef<HTMLFormElement>(null)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    if (state && "success" in state && state.success) {
      setShowPassword(true)
    }
  }, [state])

  const handleNewInvite = () => {
    formRef.current?.reset()
    setShowPassword(false)
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Invite New Member</h2>

      {showPassword && state && "temporaryPassword" in state ? (
        <div className="space-y-4">
          <div className="rounded-md bg-green-50 p-4">
            <h3 className="mb-2 font-medium text-green-900">User invited successfully!</h3>
            <p className="mb-3 text-sm text-green-700">
              Share this temporary password with the new user. They should change it after first
              login.
            </p>
            <div className="rounded bg-white p-3">
              <code className="text-sm font-mono font-semibold text-gray-900">
                {state.temporaryPassword}
              </code>
            </div>
          </div>
          <button
            onClick={handleNewInvite}
            className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          >
            Invite Another Member
          </button>
        </div>
      ) : (
        <form ref={formRef} action={formAction} className="space-y-4">
          {state && "error" in state && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{state.error}</div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-700">
                Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                placeholder="John Doe"
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              />
            </div>

            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                required
                placeholder="john@example.com"
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor="role" className="mb-1 block text-sm font-medium text-gray-700">
              Role
            </label>
            <select
              id="role"
              name="role"
              required
              defaultValue="editor"
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            >
              <option value="viewer">Viewer - Read only access</option>
              <option value="editor">Editor - Can create and modify</option>
              <option value="admin">Admin - Full access including user management</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:bg-gray-400"
          >
            {isPending ? "Inviting..." : "Invite User"}
          </button>
        </form>
      )}
    </div>
  )
}
