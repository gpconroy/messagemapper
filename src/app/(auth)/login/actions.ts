"use server"

import { signIn } from "@/auth"
import { z, ZodError } from "zod"
import { AuthError } from "next-auth"

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
})

export async function login(
  prevState: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  try {
    // Parse and validate form data
    const data = loginSchema.parse({
      email: formData.get("email"),
      password: formData.get("password"),
    })

    // Get callback URL from form or default to dashboard
    const callbackUrl = (formData.get("callbackUrl") as string) || "/dashboard"

    // Attempt to sign in
    await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirectTo: callbackUrl,
    })

    return { success: true }
  } catch (error) {
    if (error instanceof ZodError) {
      return { error: error.issues[0].message }
    }

    // Handle Auth.js errors
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Invalid email or password" }
        default:
          return { error: "An error occurred during login" }
      }
    }

    // Re-throw NEXT_REDIRECT errors (signIn uses redirect internally)
    throw error
  }
}
