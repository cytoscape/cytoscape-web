// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  classifyBootError,
  registerBootErrorClassifier,
  resetBootErrorClassifiersForTesting,
} from './bootError'
import { BootPhase } from './bootPhases'
import { getBootState, resetBootStateForTesting } from './bootState'
import { getBootSpans, resetBootMetricsForTesting } from './metrics/bootMarks'
import {
  isBootAborted,
  resetBootRunnerForTesting,
  runPhase,
  runPhaseUnlessAborted,
  valueOr,
} from './runBoot'

afterEach(() => {
  resetBootRunnerForTesting()
  resetBootStateForTesting()
  resetBootMetricsForTesting()
  resetBootErrorClassifiersForTesting()
  vi.restoreAllMocks()
})

describe('runPhase', () => {
  it('returns the value and records a span on success', async () => {
    const result = await runPhase(BootPhase.WORKSPACE, () => 'workspace')

    expect(result).toEqual({ ok: true, value: 'workspace' })
    expect(getBootSpans().map((s) => [s.name, s.status])).toEqual([
      [BootPhase.WORKSPACE, 'ok'],
    ])
  })

  it('sets the phase message on the boot shell', async () => {
    await runPhase(BootPhase.IMPORTS, () => undefined)

    expect(getBootState().message).toBe('Importing network...')
  })

  it('leaves the message alone for phases that have none', async () => {
    const before = getBootState().message
    await runPhase(BootPhase.ROUTE, () => undefined)

    expect(getBootState().message).toBe(before)
  })

  it('returns a failure result instead of throwing', async () => {
    // The contract that makes error isolation structural: a caller cannot let
    // a phase rejection escape and abort the phases after it.
    const result = await runPhase(BootPhase.IMPORTS, () => {
      throw new Error('NDEx exploded')
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.phase).toBe(BootPhase.IMPORTS)
      expect(result.error.detail).toBe('NDEx exploded')
    }
  })

  it('records a failed span with error status', async () => {
    await runPhase(BootPhase.IMPORTS, () => Promise.reject(new Error('nope')))

    expect(getBootSpans()[0].status).toBe('error')
  })

  it('does not abort the boot for a non-fatal phase', async () => {
    await runPhase(BootPhase.IMPORTS, () => {
      throw new Error('one bad import URL')
    })

    expect(isBootAborted()).toBe(false)
    // A failed import must not put the shell into the terminal error state —
    // the workspace is still usable without that network.
    expect(getBootState().error).toBeUndefined()
  })

  it('aborts the boot and shows the error shell for a fatal phase', async () => {
    await runPhase(BootPhase.DATABASE, () => {
      throw new Error('VersionError')
    })

    expect(isBootAborted()).toBe(true)
    expect(getBootState().error?.title).toBe('Local storage is unavailable')
  })
})

describe('runPhaseUnlessAborted', () => {
  it('skips the phase once the boot has aborted', async () => {
    await runPhase(BootPhase.DATABASE, () => {
      throw new Error('dead')
    })

    const fn = vi.fn()
    const result = await runPhaseUnlessAborted(BootPhase.WORKSPACE, fn)

    expect(fn).not.toHaveBeenCalled()
    expect(result).toBeUndefined()
  })

  it('runs normally while the boot is viable', async () => {
    const result = await runPhaseUnlessAborted(BootPhase.WORKSPACE, () => 7)

    expect(result).toEqual({ ok: true, value: 7 })
  })
})

describe('the isolation guarantee', () => {
  it('runs every later phase even when an earlier one fails', async () => {
    // This is the exact failure that used to strand startup: a throw in the
    // summaries load meant setWorkspace, cywebapi:ready and the URL cleanup
    // all never happened.
    const ran: string[] = []

    const workspace = await runPhase(BootPhase.WORKSPACE, () => {
      throw new Error('NDEx 503')
    })
    await runPhase(BootPhase.PUBLISH, () => {
      ran.push('publish')
    })
    await runPhase(BootPhase.ROUTE, () => {
      ran.push('route')
    })

    expect(workspace.ok).toBe(false)
    expect(ran).toEqual(['publish', 'route'])
  })
})

describe('valueOr', () => {
  it('yields the value on success and the fallback on failure', async () => {
    const ok = await runPhase(BootPhase.WORKSPACE, () => 'real')
    const bad = await runPhase(BootPhase.WORKSPACE, () => {
      throw new Error('x')
    })

    expect(valueOr(ok, 'fallback')).toBe('real')
    expect(valueOr(bad, 'fallback')).toBe('fallback')
  })
})

describe('classifyBootError', () => {
  it('falls back to a phase-appropriate title and the raw message', () => {
    const error = classifyBootError(BootPhase.WORKSPACE, new Error('boom'))

    expect(error.title).toBe('Your workspace could not be loaded')
    expect(error.detail).toBe('boom')
  })

  it('stringifies non-Error throws', () => {
    expect(classifyBootError(BootPhase.ROUTE, 'plain string').detail).toBe(
      'plain string',
    )
    expect(classifyBootError(BootPhase.ROUTE, 42).detail).toBe('42')
  })

  it('prefers a registered classifier', () => {
    registerBootErrorClassifier(BootPhase.DATABASE, () => ({
      title: 'Newer database',
      message: 'Open the newer deployment elsewhere.',
    }))

    const error = classifyBootError(
      BootPhase.DATABASE,
      new Error('VersionError'),
    )

    expect(error.title).toBe('Newer database')
    expect(error.message).toBe('Open the newer deployment elsewhere.')
  })

  it('falls through when the classifier does not recognize the cause', () => {
    // Classifiers only have to handle what they know about.
    registerBootErrorClassifier(BootPhase.DATABASE, () => undefined)

    expect(
      classifyBootError(BootPhase.DATABASE, new Error('quota')).title,
    ).toBe('Local storage is unavailable')
  })
})
