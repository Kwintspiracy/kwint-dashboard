import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ok, fail, dbError, dbFail } from './action-errors'

describe('action-errors', () => {
  beforeEach(() => {
    // dbError / dbFail log to console; silence them so test output stays clean.
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  describe('ok', () => {
    it('wraps the payload in { ok: true, data }', () => {
      expect(ok({ id: 'abc' })).toEqual({ ok: true, data: { id: 'abc' } })
      expect(ok(undefined)).toEqual({ ok: true, data: undefined })
    })
  })

  describe('fail', () => {
    it('wraps the error in { ok: false, error }', () => {
      expect(fail('nope')).toEqual({ ok: false, error: 'nope' })
    })
  })

  describe('dbError', () => {
    it('returns a generic user-safe error for untyped exceptions', () => {
      const r = dbError(new Error('internal trace leaking sql'))
      expect(r).toEqual({ ok: false, error: 'An unexpected error occurred. Please try again.' })
    })
  })

  describe('dbFail', () => {
    // These tests are the regression guard for the bug-class the Configurator
    // kept hitting: a unique-violation / RLS denial / missing-column error was
    // returned as a generic "Operation failed" and the user had no idea what
    // went wrong. After the fix (dashboard commit surfacing Postgres codes),
    // specific messages come through.

    it('23505 (unique_violation) produces the "slug already exists" message', () => {
      const r = dbFail({ message: 'duplicate key value', code: '23505' })
      expect(r).toEqual({ ok: false, error: 'A record with this slug already exists.' })
    })

    it('23502 (not_null_violation) includes the column details', () => {
      const r = dbFail({
        message: 'null value in column',
        code: '23502',
        details: 'Failing row contains (id: null)',
      })
      expect(r.ok).toBe(false)
      if (!r.ok) {
        expect(r.error).toContain('Missing required field')
        expect(r.error).toContain('Failing row')
      }
    })

    it('23502 falls back to the message when details are absent', () => {
      const r = dbFail({ message: 'column foo cannot be null', code: '23502' })
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.error).toBe('Missing required field: column foo cannot be null')
    })

    it('42501 (RLS denied) surfaces the permission hint', () => {
      const r = dbFail({ message: 'new row violates row-level security policy', code: '42501' })
      expect(r).toEqual({ ok: false, error: 'Permission denied — check RLS policies.' })
    })

    it('unknown error codes fall through with the raw message', () => {
      const r = dbFail({ message: 'connection refused', code: '08006' })
      expect(r).toEqual({ ok: false, error: 'Operation failed: connection refused' })
    })

    it('missing code still produces an informative message (not "undefined")', () => {
      const r = dbFail({ message: 'something failed' })
      expect(r).toEqual({ ok: false, error: 'Operation failed: something failed' })
    })

    it('logs the code + details alongside the message for observability', () => {
      const spy = vi.spyOn(console, 'error')
      dbFail({ message: 'msg', code: '23505', details: 'detail bits' })
      expect(spy).toHaveBeenCalledWith('[actions]', 'msg', '23505', 'detail bits')
    })
  })
})
