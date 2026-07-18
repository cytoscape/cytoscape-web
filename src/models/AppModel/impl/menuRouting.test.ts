import { describe, expect, it } from 'vitest'

import { RootMenu } from '../RootMenu'
import { ServiceApp } from '../ServiceApp'
import {
  DEFAULT_ROOT_MENU,
  SUPPORTED_ROOT_MENUS,
  filterServiceAppsByRoot,
  invalidRootMessage,
  parseRootMenu,
  resolveRootMenu,
} from './menuRouting'

const makeApp = (url: string, root: string | undefined): ServiceApp =>
  ({
    url,
    cyWebMenuItem: {
      root,
      path: [{ name: url, gravity: 0 }],
    },
  }) as unknown as ServiceApp

describe('menuRouting', () => {
  describe('parseRootMenu', () => {
    it('matches a known root exactly', () => {
      expect(parseRootMenu('Tools')).toBe(RootMenu.Tools)
      expect(parseRootMenu('Apps')).toBe(RootMenu.Apps)
    })

    it('is case-insensitive and trims whitespace', () => {
      expect(parseRootMenu('  tools ')).toBe(RootMenu.Tools)
      expect(parseRootMenu('APPS')).toBe(RootMenu.Apps)
    })

    it('returns undefined for unknown, empty, null, or undefined roots', () => {
      expect(parseRootMenu('Foobar')).toBeUndefined()
      expect(parseRootMenu('')).toBeUndefined()
      expect(parseRootMenu(null)).toBeUndefined()
      expect(parseRootMenu(undefined)).toBeUndefined()
    })
  })

  describe('SUPPORTED_ROOT_MENUS', () => {
    it('covers every top-level menu', () => {
      expect(SUPPORTED_ROOT_MENUS).toEqual([
        RootMenu.Data,
        RootMenu.Edit,
        RootMenu.Layout,
        RootMenu.Analysis,
        RootMenu.Tools,
        RootMenu.Apps,
        RootMenu.Help,
      ])
    })
  })

  describe('resolveRootMenu', () => {
    it('resolves a supported root as valid', () => {
      expect(resolveRootMenu('Tools')).toEqual({
        root: RootMenu.Tools,
        requested: 'Tools',
        valid: true,
      })
    })

    it('resolves every supported root as valid with the default supported list', () => {
      SUPPORTED_ROOT_MENUS.forEach((root) => {
        expect(resolveRootMenu(root)).toEqual({
          root,
          requested: root,
          valid: true,
        })
      })
    })

    it('falls back to the default menu for an unknown root and marks it invalid', () => {
      const result = resolveRootMenu('Nonsense')
      expect(result.root).toBe(DEFAULT_ROOT_MENU)
      expect(result.valid).toBe(false)
      expect(result.requested).toBe('Nonsense')
    })

    it('falls back to the default menu for a missing root', () => {
      const result = resolveRootMenu(undefined)
      expect(result.root).toBe(DEFAULT_ROOT_MENU)
      expect(result.valid).toBe(false)
    })

    it('falls back when a valid RootMenu is not in the supported list', () => {
      // Data is a valid RootMenu value but not backed by a menu here.
      const result = resolveRootMenu('Data', [RootMenu.Tools, RootMenu.Apps])
      expect(result.root).toBe(DEFAULT_ROOT_MENU)
      expect(result.valid).toBe(false)
    })
  })

  describe('filterServiceAppsByRoot', () => {
    const apps: Record<string, ServiceApp> = {
      a: makeApp('a', 'Tools'),
      b: makeApp('b', 'Apps'),
      c: makeApp('c', 'Nonsense'),
      d: makeApp('d', undefined),
    }

    it('groups apps under their requested supported root', () => {
      expect(Object.keys(filterServiceAppsByRoot(apps, RootMenu.Tools))).toEqual(
        ['a'],
      )
    })

    it('routes unknown and missing roots to the default menu', () => {
      // b (Apps), c (unknown -> Apps), d (missing -> Apps)
      expect(Object.keys(filterServiceAppsByRoot(apps, RootMenu.Apps))).toEqual([
        'b',
        'c',
        'd',
      ])
    })
  })

  describe('invalidRootMessage', () => {
    it('quotes the requested root and lists the valid roots', () => {
      const msg = invalidRootMessage('Nonsense')
      expect(msg).toContain('"Nonsense"')
      expect(msg).toContain(DEFAULT_ROOT_MENU)
      expect(msg).toContain(SUPPORTED_ROOT_MENUS.join(', '))
    })

    it('renders (none) when no root was requested', () => {
      expect(invalidRootMessage(undefined)).toContain('(none)')
      expect(invalidRootMessage('')).toContain('(none)')
    })
  })
})
