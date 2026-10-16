import "server-only"
import { isRedirectError } from "next/dist/client/components/redirect-error"
import { z } from "zod"

// Uniform result type and error handling for server actions. Every action returns
// ActionResult so the client can show a toast and map field errors onto the form.

export type ActionResult<T = undefined> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> }

/** Error with a user-facing Serbian message. */
export class AppError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "AppError"
  }
}

function isHttpFallback(e: unknown, status: number): boolean {
  const digest = (e as { digest?: unknown } | null)?.digest
  return typeof digest === "string" && digest === `NEXT_HTTP_ERROR_FALLBACK;${status}`
}

export function ok<T>(data: T, message?: string): ActionResult<T> {
  return { ok: true, data, message }
}

/**
 * Validates input with `schema`, runs `handler`, and converts every failure into an
 * ActionResult: validation errors → fieldErrors, forbidden() → permission message,
 * AppError → its message, anything else → generic message (and logged).
 */
export async function runAction<S extends z.ZodType, T>(
  schema: S,
  input: unknown,
  handler: (data: z.output<S>) => Promise<T>,
  successMessage?: string,
): Promise<ActionResult<T>> {
  try {
    const parsed = schema.safeParse(input)
    if (!parsed.success) {
      const fieldErrors: Record<string, string[]> = {}
      for (const issue of parsed.error.issues) {
        const key = issue.path.join(".") || "_form"
        ;(fieldErrors[key] ??= []).push(issue.message)
      }
      return { ok: false, error: "Proverite unete podatke.", fieldErrors }
    }
    const data = await handler(parsed.data)
    return { ok: true, data, message: successMessage }
  } catch (e) {
    if (isRedirectError(e)) throw e
    if (isHttpFallback(e, 403)) return { ok: false, error: "Nemate dozvolu za ovu radnju." }
    if (isHttpFallback(e, 404)) return { ok: false, error: "Traženi podatak ne postoji." }
    if (e instanceof AppError) return { ok: false, error: e.message }
    console.error("[action] unexpected error", e)
    return { ok: false, error: "Došlo je do neočekivane greške. Pokušajte ponovo." }
  }
}
