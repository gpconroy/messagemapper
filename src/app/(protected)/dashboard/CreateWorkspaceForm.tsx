"use client"

import { useActionState, useEffect, useRef } from "react"
import { createWorkspace } from "./actions"

export function CreateWorkspaceForm() {
  const [state, formAction, isPending] = useActionState(createWorkspace, null)
  const formRef = useRef<HTMLFormElement>(null)

  // Reset form on success
  useEffect(() => {
    if (state && "success" in state && state.success) {
      formRef.current?.reset()
    }
  }, [state])

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Create New Workspace</h2>

      <form ref={formRef} action={formAction} className="space-y-4">
        {state && "error" in state && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{state.error}</div>
        )}
        {state && "success" in state && (
          <div className="rounded-md bg-green-50 p-3 text-sm text-green-600">
            Workspace created successfully!
          </div>
        )}

        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-700">
            Workspace Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            required
            maxLength={100}
            placeholder="e.g., ISO 20022 Mappings"
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
          />
        </div>

        <div>
          <label htmlFor="description" className="mb-1 block text-sm font-medium text-gray-700">
            Description (optional)
          </label>
          <textarea
            id="description"
            name="description"
            rows={2}
            placeholder="Brief description of this workspace"
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:bg-gray-400"
        >
          {isPending ? "Creating..." : "Create Workspace"}
        </button>
      </form>
    </div>
  )
}
