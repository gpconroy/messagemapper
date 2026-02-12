"use client"

import { useActionState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { login } from "./actions"
import Link from "next/link"

function LoginForm() {
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard"

  const [state, formAction] = useActionState(login, { error: undefined })

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
          {state.error}
        </div>
      )}

      <input type="hidden" name="callbackUrl" value={callbackUrl} />

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

        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
            Password
          </label>
          <input
            type="password"
            id="password"
            name="password"
            required
            placeholder="Your password"
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
          />
        </div>

      <button
        type="submit"
        className="w-full rounded-md bg-green-600 px-4 py-2 font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
      >
        Sign In
      </button>
    </form>
  )
}

export default function LoginPage() {
  return (
    <div>
      <h2 className="mb-6 text-xl font-semibold text-gray-800">Sign In</h2>

      <Suspense fallback={<div>Loading...</div>}>
        <LoginForm />
      </Suspense>

      <p className="mt-4 text-center text-sm text-gray-600">
        Don't have an account?{" "}
        <Link href="/signup" className="text-green-600 hover:text-green-700 font-medium">
          Sign up
        </Link>
      </p>
    </div>
  )
}
