/**
 * Shared error-to-ActionResult helpers.
 *
 * Kept OUTSIDE actions.ts (which is `'use server'`) so the functions can be
 * unit-tested without pulling in next/headers and the whole server-actions
 * machinery. actions.ts re-exports these for convenience.
 */

export type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string }

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data }
}

export function fail(error: string): ActionResult<never> {
  return { ok: false, error }
}

export function dbError(e: unknown): ActionResult<never> {
  console.error('[actions]', e)
  return fail('An unexpected error occurred. Please try again.')
}

/**
 * Translate a Postgres error into a user-facing ActionResult.
 *
 * Surfacing known codes matters: several "agent never created" bug reports
 * were a `dbFail` call hiding a unique-violation or RLS denial behind a
 * generic "Operation failed" message. The Configurator UI now gets
 * actionable text and the developer gets a log line with the real code.
 *
 * Codes we currently specialise:
 *   23505 — unique_violation
 *   23502 — not_null_violation
 *   42501 — insufficient_privilege (RLS)
 */
export function dbFail(e: { message: string; code?: string; details?: string }): ActionResult<never> {
  console.error('[actions]', e.message, e.code, e.details)
  if (e.code === '23505') return fail('A record with this slug already exists.')
  if (e.code === '23502') return fail(`Missing required field: ${e.details ?? e.message}`)
  if (e.code === '42501') return fail('Permission denied — check RLS policies.')
  return fail(`Operation failed: ${e.message}`)
}
