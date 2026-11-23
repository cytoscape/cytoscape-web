// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { shownSubsystemId } from './shownSubsystemId'

describe('shownSubsystemId', () => {
  it('is undefined when nothing is selected', () => {
    expect(shownSubsystemId([])).toBeUndefined()
  })

  it('is the selected node when one node is selected', () => {
    expect(shownSubsystemId(['42'])).toBe('42')
  })

  it('is the subsystem when only its copies are selected with it', () => {
    expect(shownSubsystemId(['42', '42-1d', '42-2d'])).toBe('42')
    expect(shownSubsystemId(['42-1d', '42'])).toBe('42')
  })

  it('is undefined when the selection spans several subsystems', () => {
    expect(shownSubsystemId(['42', '99'])).toBeUndefined()
    expect(shownSubsystemId(['42', '42-1d', '99'])).toBeUndefined()
  })

  it('does not treat an id that only shares a prefix as a copy', () => {
    expect(shownSubsystemId(['42', '421'])).toBeUndefined()
  })
})
