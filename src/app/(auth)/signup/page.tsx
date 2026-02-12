"use client"

import { useActionState } from "react"
import { signup } from "./actions"
import Link from "next/link"

export default function SignupPage() {
  const [state, formAction] = useActionState(signup, { error: undefined })

  return (
    <div>
      <h2 className="mb-6 text-xl font-semibold text-gray-800">Create Account</h2>

      <form action={formAction} className="space-y-4">
        {state?.error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
            {state.error}
          </div>
        )}

        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-700">
            Full Name
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

        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
            Password
          </label>
          <input
            type="password"
            id="password"
            name="password"
            required
            placeholder="At least 8 characters"
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
          />
        </div>

        <div>
          <label htmlFor="organizationName" className="mb-1 block text-sm font-medium text-gray-700">
            Organization Name
          </label>
          <input
            type="text"
            id="organizationName"
            name="organizationName"
            required
            placeholder="Acme Corp"
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-md bg-green-600 px-4 py-2 font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
        >
          Create Account
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-600">
        Already have an account?{" "}
        <Link href="/login" className="text-green-600 hover:text-green-700 font-medium">
          Log in
        </Link>
      </p>
    </div>
  )
}
