"use server"

import { prisma } from "@/lib/prisma"
import { signIn } from "@/auth"
import { z, ZodError } from "zod"
import { AuthError } from "next-auth"

const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required"),
  organizationName: z.string().min(1, "Organization name is required"),
})

export async function signup(
  prevState: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  try {
    // Parse and validate form data
    const data = signupSchema.parse({
      email: formData.get("email"),
      password: formData.get("password"),
      name: formData.get("name"),
      organizationName: formData.get("organizationName"),
    })

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    })

    if (existingUser) {
      return { error: "Email already registered" }
    }

    // Lazy-load password utilities to avoid production bundling/runtime issues
    const { hashPassword } = await import("@/lib/auth/passwords")
    const passwordHash = await hashPassword(data.password)

    // Create tenant and user atomically in transaction
    await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: data.organizationName,
          slug: data.organizationName
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9-]/g, ""),
        },
      })

      await tx.user.create({
        data: {
          email: data.email,
          name: data.name,
          passwordHash,
          role: "admin", // First user is always admin
          tenantId: tenant.id,
        },
      })
    })

    // Sign in after successful signup
    await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirectTo: "/dashboard",
    })

    return { success: true }
  } catch (error) {
    if (error instanceof ZodError) {
      return { error: error.issues[0].message }
    }

    // Handle Auth.js errors explicitly to avoid generic app crashes.
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Account created but automatic sign in failed. Please log in manually." }
        default:
          return { error: "An authentication error occurred during signup" }
      }
    }

    // Re-throw NEXT_REDIRECT errors (signIn uses redirect internally).
    // Next.js marks these as digest errors and they must bubble up.
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      typeof (error as { digest?: unknown }).digest === "string" &&
      (error as { digest: string }).digest.includes("NEXT_REDIRECT")
    ) {
      throw error
    }

    console.error("Signup error:", error)
    return { error: "Unable to complete signup right now. Please try again." }
  }
}
