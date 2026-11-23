import { describe, expect, it } from 'vitest'

import { activeViewAfterLoad } from './activeViewAfterLoad'

describe('activeViewAfterLoad', () => {
  it('switches to the loaded network when the active view belongs to another network', () => {
    expect(activeViewAfterLoad('other', 'main')).toBe('main')
  })

  it('switches to the loaded network when no view is active', () => {
    expect(activeViewAfterLoad('', 'main')).toBe('main')
    expect(activeViewAfterLoad(undefined, 'main')).toBe('main')
  })

  // A shared link can restore a cached subnetwork view before the main
  // network load completes (#965). The load must not undo it.
  it('keeps a subnetwork view of the loaded network', () => {
    expect(activeViewAfterLoad('main_42', 'main')).toBe('main_42')
  })

  it('does not treat a network whose id only shares a prefix as a subnetwork', () => {
    expect(activeViewAfterLoad('main2', 'main')).toBe('main')
  })
})
