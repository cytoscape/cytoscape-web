// @vitest-environment node
import cytoscape from 'cytoscape'
import { describe, expect, it } from 'vitest'

import type { TableRecord } from '../../../models/StoreModel/TableStoreModel'
import VisualStyleFn from '../../../models/VisualStyleModel'
import {
  isNetworkOnScreen,
  isSameStyleInputs,
  isShowing,
  RenderedNetwork,
  StyleInputs,
} from './renderGuard'

describe('isShowing', () => {
  it('is false before anything was rendered', () => {
    expect(isShowing(null, cytoscape({ headless: true }), 'net-1')).toBe(false)
  })

  it('matches only the instance and network that were rendered', () => {
    const cy = cytoscape({ headless: true })
    const rendered: RenderedNetwork = {
      cy,
      networkId: 'net-1',
      topologyVersion: 1,
    }

    expect(isShowing(rendered, cy, 'net-1')).toBe(true)
    expect(isShowing(rendered, cy, 'net-2')).toBe(false)
    // A StrictMode remount replaces the instance with an empty one.
    expect(isShowing(rendered, cytoscape({ headless: true }), 'net-1')).toBe(
      false,
    )
  })
})

describe('isNetworkOnScreen (regression: #861)', () => {
  const cy = cytoscape({ headless: true })
  const rendered: RenderedNetwork = {
    cy,
    networkId: 'net-1',
    topologyVersion: 3,
  }

  it('is false before anything was rendered', () => {
    expect(isNetworkOnScreen(null, cy, 'net-1', 3)).toBe(false)
  })

  it('is true for the network drawn, at the topology version drawn', () => {
    expect(isNetworkOnScreen(rendered, cy, 'net-1', 3)).toBe(true)
  })

  it('is false once the topology changed, whatever the element counts', () => {
    // The version is all it reads: a replacement of as many elements as were
    // removed leaves every count unchanged but still bumps the version.
    expect(isNetworkOnScreen(rendered, cy, 'net-1', 4)).toBe(false)
  })

  it('is false for another network or another instance', () => {
    expect(isNetworkOnScreen(rendered, cy, 'net-2', 3)).toBe(false)
    expect(
      isNetworkOnScreen(rendered, cytoscape({ headless: true }), 'net-1', 3),
    ).toBe(false)
  })
})

describe('isSameStyleInputs', () => {
  const table = { nodeTable: {}, edgeTable: {} } as unknown as TableRecord
  const inputs: StyleInputs = {
    visualStyle: VisualStyleFn.createVisualStyle(),
    table,
    visualEditorProperties: undefined,
  }

  it('is false before any style was applied', () => {
    expect(isSameStyleInputs(null, inputs)).toBe(false)
  })

  it('compares each input by identity', () => {
    expect(isSameStyleInputs(inputs, { ...inputs })).toBe(true)
    expect(
      isSameStyleInputs(inputs, {
        ...inputs,
        visualStyle: VisualStyleFn.createVisualStyle(),
      }),
    ).toBe(false)
    expect(isSameStyleInputs(inputs, { ...inputs, table: { ...table } })).toBe(
      false,
    )
    expect(
      isSameStyleInputs(inputs, {
        ...inputs,
        visualEditorProperties: {} as StyleInputs['visualEditorProperties'],
      }),
    ).toBe(false)
  })
})
