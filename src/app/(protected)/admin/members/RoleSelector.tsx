"use client"

import { useActionState } from "react"
import { updateUserRole } from "./actions"

interface RoleSelectorProps {
  userId: string
  currentRole: string
  disabled: boolean
}

export function RoleSelector({ userId, currentRole, disabled }: RoleSelectorProps) {
  const [state, formAction] = useActionState(updateUserRole, null)

  if (disabled) {
    return (
      <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-sm font-medium capitalize text-gray-700">
        {currentRole}
      </span>
    )
  }

  return (
    <form action={formAction} className="inline-block">
      <input type="hidden" name="userId" value={userId} />
      <select
        name="role"
        defaultValue={currentRole}
        onChange={(e) => {
          e.currentTarget.form?.requestSubmit()
        }}
        className="rounded-md border border-gray-300 px-3 py-1 text-sm capitalize focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
      >
        <option value="viewer">viewer</option>
        <option value="editor">editor</option>
        <option value="admin">admin</option>
      </select>
      {state && "error" in state && (
        <span className="ml-2 text-xs text-red-600" title={state.error}>
          ✕
        </span>
      )}
    </form>
  )
}
