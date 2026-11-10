import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  isApplePlatform,
  isCanvasFocused,
  isSelectAllShortcut,
} from './useSelectAllShortcut'

const keydown = (init: KeyboardEventInit): KeyboardEvent =>
  new KeyboardEvent('keydown', init)

describe('isSelectAllShortcut', () => {
  it('is Ctrl+A or ⌘A', () => {
    expect(isSelectAllShortcut(keydown({ key: 'a', ctrlKey: true }))).toBe(true)
    expect(isSelectAllShortcut(keydown({ key: 'a', metaKey: true }))).toBe(true)
  })

  it('accepts Caps Lock (an upper-case key without Shift)', () => {
    expect(isSelectAllShortcut(keydown({ key: 'A', ctrlKey: true }))).toBe(true)
  })

  it('rejects other keys and extra modifiers', () => {
    const cases: KeyboardEventInit[] = [
      { key: 'b', ctrlKey: true },
      { key: 'a' },
      { key: 'A', ctrlKey: true, shiftKey: true },
      { key: 'a', ctrlKey: true, altKey: true },
      { key: 'a', ctrlKey: true, metaKey: true },
    ]
    cases.forEach((init) =>
      expect(isSelectAllShortcut(keydown(init))).toBe(false),
    )
  })
})

describe('isApplePlatform', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const stubNavigator = (platform: string, uadPlatform?: string): void => {
    vi.stubGlobal('navigator', {
      platform,
      ...(uadPlatform === undefined
        ? {}
        : { userAgentData: { platform: uadPlatform } }),
    })
  }

  it('recognizes macOS from either source', () => {
    stubNavigator('MacIntel')
    expect(isApplePlatform()).toBe(true)
    stubNavigator('', 'macOS')
    expect(isApplePlatform()).toBe(true)
    // What Playwright's Chromium reports on a Mac
    stubNavigator('MacIntel', 'Windows')
    expect(isApplePlatform()).toBe(true)
  })

  it('is false elsewhere', () => {
    stubNavigator('Win32', 'Windows')
    expect(isApplePlatform()).toBe(false)
    stubNavigator('Linux x86_64')
    expect(isApplePlatform()).toBe(false)
  })
})

describe('isCanvasFocused', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('is true while nothing has focus', () => {
    expect(isCanvasFocused()).toBe(true)
  })

  it('is true while the focus is inside a network renderer', () => {
    document.body.innerHTML =
      '<div data-testid="cyjs-renderer"><button id="inner">x</button></div>'
    document.getElementById('inner')!.focus()
    expect(isCanvasFocused()).toBe(true)
  })

  it('is false while a field, a button or a grid has focus', () => {
    document.body.innerHTML =
      '<input id="field" /><button id="button">b</button><div id="grid" tabindex="0"></div>'
    ;['field', 'button', 'grid'].forEach((id) => {
      document.getElementById(id)!.focus()
      expect(isCanvasFocused()).toBe(false)
    })
  })
})
