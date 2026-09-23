import { fireEvent, render, screen } from '@testing-library/react'
import { isValidElement } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

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

// The callback a menu row reports its app to. The host menu opens the
// parameter dialog; the row does not own it.
const onSelectApp = vi.fn()

describe('createMenuItems', () => {
  beforeEach(() => {
    onSelectApp.mockClear()
  })

  it('creates a leaf item with a template for a single-element path', () => {
    const items = createMenuItems(
      { 'http://a': makeApp('http://a', [{ name: 'Run Analysis' }]) },
      onSelectApp,
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
      onSelectApp,
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
      onSelectApp,
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
      onSelectApp,
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
      onSelectApp,
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
      createMenuItems({ 'http://a': makeApp('http://a', []) }, onSelectApp),
    ).toThrow('Menu path is empty')
  })
  it('creates a nested menu starting with Import', () => {
    const items = createMenuItems(
      {
        'http://data-import-app': makeApp('http://data-import-app', [
          { name: 'Import', gravity: 1 },
          { name: 'Cell Maps for AI (Cell Mapping Toolkit)', gravity: 1 },
          { name: 'Network from Embedding', gravity: 1 },
        ]),
      },
      onSelectApp,
    )

    expect(items).toHaveLength(1)

    const importMenu = items[0]
    expect(importMenu.label).toBe('Import')

    const cellMapsMenu = (importMenu.items as any[])[0]
    expect(cellMapsMenu.label).toBe('Cell Maps for AI (Cell Mapping Toolkit)')

    const networkFromEmbedding = cellMapsMenu.items[0]
    expect(networkFromEmbedding.label).toBe('Network from Embedding')
    expect(isValidElement(networkFromEmbedding.template)).toBe(true)
  })

  // #745: the parameter dialog used to be a React child of the row. Closing
  // the menu unmounted the row, and the form went with it. The row now only
  // reports which app was picked.
  it('reports the picked app to the caller and renders no dialog in the row', () => {
    const app = makeApp('http://a', [
      { name: 'Data' },
      { name: 'Import' },
      { name: 'Run X' },
    ])
    const items = createMenuItems({ 'http://a': app }, onSelectApp)
    const runX = ((items[0].items as any[])[0] as any).items[0]

    render(runX.template)
    fireEvent.click(screen.getByText('http://a'))

    expect(onSelectApp).toHaveBeenCalledWith(app)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('reports the picked app from a single-element path too', () => {
    const app = makeApp('http://a', [{ name: 'Run Analysis' }])
    const items = createMenuItems({ 'http://a': app }, onSelectApp)

    render(items[0].template as any)
    fireEvent.click(screen.getByText('http://a'))

    expect(onSelectApp).toHaveBeenCalledWith(app)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('reports the picked app from a duplicate-labelled leaf', () => {
    const x = makeApp('http://x', [{ name: 'Apps' }, { name: 'Run Same' }])
    const y = makeApp('http://y', [{ name: 'Apps' }, { name: 'Run Same' }])
    const items = createMenuItems({ 'http://x': x, 'http://y': y }, onSelectApp)

    const leaves = (items[0].items as any[]).filter(
      (i) => i.label === 'Run Same',
    )
    leaves.forEach((leaf, index) => {
      const { unmount } = render(leaf.template)
      fireEvent.click(screen.getByText(index === 0 ? 'http://x' : 'http://y'))
      unmount()
    })

    expect(onSelectApp).toHaveBeenNthCalledWith(1, x)
    expect(onSelectApp).toHaveBeenNthCalledWith(2, y)
  })
})
