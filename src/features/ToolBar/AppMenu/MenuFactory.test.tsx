import { isValidElement } from 'react'
import { describe, expect, it, vi } from 'vitest'

import type { ServiceApp } from '../../../models/AppModel/ServiceApp'
import { createMenuItems } from './MenuFactory'

const makeApp = (
  url: string,
  path: Array<{ name: string; gravity?: number }>,
): ServiceApp =>
  ({
    url,
    name: url,
    cyWebMenuItem: {
      root: 'Apps',
      path: path.map(({ name, gravity }) => ({ name, gravity: gravity ?? 0 })),
    },
  }) as unknown as ServiceApp

const commandFn = vi.fn().mockResolvedValue(undefined)

describe('createMenuItems', () => {
  it('creates a leaf item with a template for a single-element path', () => {
    const items = createMenuItems(
      { 'http://a': makeApp('http://a', [{ name: 'Run Analysis' }]) },
      commandFn,
    )

    expect(items).toHaveLength(1)
    expect(items[0].label).toBe('Run Analysis')
    expect(isValidElement(items[0].template)).toBe(true)
  })

  it('orders top-level items by the gravity of the first path element', () => {
    const items = createMenuItems(
      {
        'http://heavy': makeApp('http://heavy', [
          { name: 'Heavy', gravity: 10 },
        ]),
        'http://light': makeApp('http://light', [
          { name: 'Light', gravity: 1 },
        ]),
      },
      commandFn,
    )

    expect(items.map((i) => i.label)).toEqual(['Light', 'Heavy'])
  })

  it('builds a nested tree for a deep path', () => {
    const items = createMenuItems(
      {
        'http://a': makeApp('http://a', [
          { name: 'Apps' },
          { name: 'Analysis' },
          { name: 'Run X' },
        ]),
      },
      commandFn,
    )

    expect(items).toHaveLength(1)
    const apps = items[0]
    expect(apps.label).toBe('Apps')
    const analysis = (apps.items as any[])[0]
    expect(analysis.label).toBe('Analysis')
    expect(analysis.template).toBeUndefined()
    const runX = analysis.items[0]
    expect(runX.label).toBe('Run X')
    expect(isValidElement(runX.template)).toBe(true)
  })

  it('merges apps that share intermediate menu levels', () => {
    const items = createMenuItems(
      {
        'http://x': makeApp('http://x', [
          { name: 'Apps' },
          { name: 'Analysis' },
          { name: 'Run X' },
        ]),
        'http://y': makeApp('http://y', [
          { name: 'Apps' },
          { name: 'Analysis' },
          { name: 'Run Y' },
        ]),
      },
      commandFn,
    )

    // One shared root and one shared intermediate node
    expect(items).toHaveLength(1)
    const analysis = (items[0].items as any[])[0]
    expect(analysis.label).toBe('Analysis')
    expect(analysis.items.map((i: any) => i.label)).toEqual(['Run X', 'Run Y'])
  })

  it('marks duplicate leaf labels with tooltips on both items', () => {
    const items = createMenuItems(
      {
        'http://x': makeApp('http://x', [
          { name: 'Apps' },
          { name: 'Run Same' },
        ]),
        'http://y': makeApp('http://y', [
          { name: 'Apps' },
          { name: 'Run Same' },
        ]),
      },
      commandFn,
    )

    const leaves = (items[0].items as any[]).filter(
      (i) => i.label === 'Run Same',
    )
    expect(leaves).toHaveLength(2)
    leaves.forEach((leaf) => {
      expect(leaf.template.props.showTooltip).toBe(true)
    })
  })

  it('throws for an app with an empty menu path', () => {
    expect(() =>
      createMenuItems({ 'http://a': makeApp('http://a', []) }, commandFn),
    ).toThrow('Menu path is empty')
  })
})
