import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// Server actions in `actions.ts` carry `'use server'` and cannot be imported
// directly from vitest. These "wiring" tests assert the source file contains
// the critical fixes — a cheap regression net for behaviour we can't unit-test
// through normal means. When a future refactor touches these actions, the
// string assertions fail loudly instead of silently regressing.
//
// Pattern borrowed from AgentOne/tests/test_regression.py
// `test_runner_uses_helpers_for_approval_and_idempotency`.

const actionsSrc = readFileSync(join(__dirname, 'actions.ts'), 'utf-8')

describe('actions.ts wiring', () => {
  // Bug 2026-04-21: user pasted a new API key into the Cogni connector,
  // got a success toast, but `connectors.updated_at` stayed frozen
  // (the UPDATE landed, but the column is not auto-maintained). Result:
  // no visual signal the save persisted; user retried multiple times
  // thinking it had failed. Fix: stamp updated_at in the action itself.
  it('updateConnectorAction stamps updated_at on every save', () => {
    // Pull just the function body, not the whole file, to pin the fix to
    // the right action.
    const match = actionsSrc.match(/export async function updateConnectorAction[\s\S]*?^}/m)
    expect(match, 'updateConnectorAction must exist in actions.ts').not.toBeNull()
    const body = match![0]

    expect(body).toMatch(/updated_at:\s*new Date\(\)\.toISOString\(\)/)
    // And the update payload must carry the stamp, not just reference it.
    expect(body).toMatch(/\.update\(\s*payload\s*\)|\.update\([^)]*updated_at[^)]*\)/)
  })

  // Bug 2026-04-21 (job f37773ec): Displacer's MCP call to Cogni got
  // "Authentication required" because the runner's MCP client hardcodes
  // `Authorization: Bearer <token>` but Cogni expects `x-api-key: cog_...`.
  // Fix adds per-server auth overrides in env_vars. The install action must
  // forward the three optional catalog fields — otherwise the runner falls
  // back to Bearer and the auth keeps failing on any non-Bearer MCP.
  it('installMcpFromCatalogAction forwards auth format overrides into env_vars', () => {
    const match = actionsSrc.match(/export async function installMcpFromCatalogAction[\s\S]*?^}/m)
    expect(match, 'installMcpFromCatalogAction must exist').not.toBeNull()
    const body = match![0]

    // All three catalog fields must be plumbed through to envBase.
    expect(body).toMatch(/entry\.auth_header_name/)
    expect(body).toMatch(/entry\.auth_header_prefix/)
    expect(body).toMatch(/entry\.auth_query_param/)
    // And they must actually be assigned onto envBase (not just referenced).
    expect(body).toMatch(/envBase\.auth_header_name\s*=\s*entry\.auth_header_name/)
  })
})
