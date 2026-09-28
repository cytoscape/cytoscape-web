// @vitest-environment node
import { describe, expect, it } from 'vitest'

import type { ToolbarMenuItem } from '../menuItemModel'
import { appendServiceMenuItems } from './appendServiceMenuItems'

const leaf = (label: string): ToolbarMenuItem => ({
  label,
  items: [],
  template: label,
})

const hostMenu = (): ToolbarMenuItem[] => [
  { template: 'Load from NDEx' },
  {
    label: 'Import',
    icon: 'upload-icon',
    items: [{ template: 'Network from file' }, { template: 'Table' }],
  },
  { separator: true },
  { template: 'Reset' },
]

describe('appendServiceMenuItems', () => {
  it('returns the host items unchanged when there are no service items', () => {
    const host = hostMenu()
    expect(appendServiceMenuItems(host, [])).toEqual(host)
  })

  it('appends unmatched service items after a separator', () => {
    const host = hostMenu()
    const result = appendServiceMenuItems(host, [leaf('My App')])
    expect(result).toEqual([...host, { separator: true }, leaf('My App')])
  })

  // #722: an app at Data > Import > ... landed in a second "Import" submenu
  // at the bottom of the Data menu instead of the existing one.
  it('merges a service submenu into the host submenu with the same label', () => {
    const service: ToolbarMenuItem = {
      label: 'Import',
      items: [
        {
          label: 'Cell Maps for AI',
          items: [leaf('Network from Embedding')],
        },
      ],
    }

    const result = appendServiceMenuItems(hostMenu(), [service])

    expect(result.filter((item) => item.label === 'Import')).toHaveLength(1)
    expect(result).toHaveLength(hostMenu().length)
    const importMenu = result[1]
    expect(importMenu.icon).toBe('upload-icon')
    expect(importMenu.items).toEqual([
      { template: 'Network from file' },
      { template: 'Table' },
      { separator: true },
      { label: 'Cell Maps for AI', items: [leaf('Network from Embedding')] },
    ])
  })

  it('merges recursively through nested submenus of the same label', () => {
    const host: ToolbarMenuItem[] = [
      {
        label: 'Developer',
        items: [{ label: 'Tools', items: [{ template: 'Built-in' }] }],
      },
    ]
    const service: ToolbarMenuItem = {
      label: 'Developer',
      items: [{ label: 'Tools', items: [leaf('App tool')] }],
    }

    const result = appendServiceMenuItems(host, [service])

    expect(result).toEqual([
      {
        label: 'Developer',
        items: [
          {
            label: 'Tools',
            items: [
              { template: 'Built-in' },
              { separator: true },
              leaf('App tool'),
            ],
          },
        ],
      },
    ])
  })

  it('does not merge a service leaf into a host submenu of the same name', () => {
    const result = appendServiceMenuItems(hostMenu(), [leaf('Import')])
    expect(result).toEqual([...hostMenu(), { separator: true }, leaf('Import')])
  })

  it('does not mutate the host items', () => {
    const host = hostMenu()
    const snapshot = structuredClone(host)
    appendServiceMenuItems(host, [
      { label: 'Import', items: [leaf('Network from Embedding')] },
    ])
    expect(host).toEqual(snapshot)
  })
})
