// @vitest-environment node
import { describe, expect, it } from 'vitest'

import {
  getRowActionStates,
  LOCAL_NETWORK_SHARE_HINT,
  NOT_CURRENT_HINT,
} from './networkRowActions'

const CY_DESK_HINT = 'Cytoscape Desktop is not running'

const states = (overrides: {
  isCurrentNetwork?: boolean
  isNdex?: boolean
  isCyDeskAvailable?: boolean
}) =>
  getRowActionStates({
    isCurrentNetwork: true,
    isNdex: true,
    isCyDeskAvailable: true,
    cyDeskHint: CY_DESK_HINT,
    ...overrides,
  })

describe('getRowActionStates', () => {
  it('enables every action on the open NDEx network with Cytoscape available', () => {
    const all = states({})
    for (const action of Object.values(all)) {
      expect(action).toEqual({ hint: undefined, disabled: false })
    }
  })

  it('disables every action on a row that is not the open network', () => {
    const all = states({ isCurrentNetwork: false })
    for (const action of Object.values(all)) {
      expect(action.disabled).toBe(true)
      expect(action.hint).toBe(NOT_CURRENT_HINT)
    }
  })

  it('disables sharing a local network, whether or not it is open', () => {
    for (const isCurrentNetwork of [true, false]) {
      const { share } = states({ isNdex: false, isCurrentNetwork })
      expect(share).toEqual({ hint: LOCAL_NETWORK_SHARE_HINT, disabled: true })
    }
  })

  it('leaves the other actions available for an open local network', () => {
    const { openInCytoscape, duplicate, download, exportImage } = states({
      isNdex: false,
    })
    for (const action of [openInCytoscape, duplicate, download, exportImage]) {
      expect(action.disabled).toBe(false)
    }
  })

  it('disables Cytoscape Desktop with its own reason when unavailable', () => {
    for (const isCurrentNetwork of [true, false]) {
      const { openInCytoscape } = states({
        isCyDeskAvailable: false,
        isCurrentNetwork,
      })
      expect(openInCytoscape).toEqual({ hint: CY_DESK_HINT, disabled: true })
    }
  })

  it('leaves the other actions untouched by Cytoscape availability', () => {
    const { duplicate, download, exportImage, share } = states({
      isCyDeskAvailable: false,
    })
    for (const action of [duplicate, download, exportImage, share]) {
      expect(action.disabled).toBe(false)
    }
  })
})
