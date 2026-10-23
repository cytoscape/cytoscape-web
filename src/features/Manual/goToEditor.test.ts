// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'

import {
  FOCUS_FRAGMENT,
  FOCUS_SETTLE_MS,
  findOpenerEditor,
  goToEditor,
} from './goToEditor'

const ORIGIN = 'https://web.example.org'
const BASE = '/cytoscape/'
const EDITOR_NAME = 'cyweb-1234'

interface FakeTab {
  name: string
  closed: boolean
  location: { origin: string; pathname: string; href: string }
  /** The Navigation API, absent in browsers without it. */
  navigation?: EventTarget
  focus: ReturnType<typeof vi.fn>
  close: ReturnType<typeof vi.fn>
}

const fakeTab = (
  pathname: string,
  overrides: Partial<FakeTab> = {},
): FakeTab => ({
  name: EDITOR_NAME,
  closed: false,
  location: { origin: ORIGIN, pathname, href: `${ORIGIN}${pathname}` },
  focus: vi.fn(),
  close: vi.fn(),
  ...overrides,
})

/** A tab on another site: reading its location throws, as across origins. */
const crossOriginTab = (): FakeTab => {
  const tab = fakeTab('/')
  Object.defineProperty(tab, 'location', {
    get: () => {
      throw new DOMException('Blocked a frame', 'SecurityError')
    },
  })
  return tab
}

/** The manual tab, with whatever opened it and what `open('', name)` finds. */
const manualTab = (
  opener: FakeTab | null,
  {
    found = opener,
    hasFocus = true,
  }: { found?: FakeTab | null; hasFocus?: boolean } = {},
) => {
  const timers: Array<{ run: () => void; ms: number }> = []
  const win = {
    opener,
    location: { origin: ORIGIN, assign: vi.fn() },
    document: { hasFocus: vi.fn(() => hasFocus) },
    open: vi.fn(() => found),
    setTimeout: vi.fn((run: () => void, ms: number) => {
      timers.push({ run, ms })
      return timers.length
    }),
  }
  const runTimers = (): void => {
    for (const timer of timers.splice(0)) timer.run()
  }
  return { win, asWindow: win as unknown as Window, timers, runTimers }
}

describe('findOpenerEditor', () => {
  it('returns the editor tab that opened the manual', () => {
    const editor = fakeTab('/cytoscape/0/networks/abc')
    const { asWindow } = manualTab(editor)
    expect(findOpenerEditor(asWindow, BASE)).toBe(editor)
  })

  it('accepts the base path without its trailing slash', () => {
    const editor = fakeTab('/cytoscape')
    const { asWindow } = manualTab(editor)
    expect(findOpenerEditor(asWindow, BASE)).toBe(editor)
  })

  it.each([
    ['no opener (bookmark, typed URL, redirect)', null],
    ['the opener was closed', fakeTab('/cytoscape/', { closed: true })],
    ['the opener moved to another site', crossOriginTab()],
    ['the opener is showing the manual', fakeTab('/cytoscape/manual/styles')],
    ['the opener left the app on its own origin', fakeTab('/ndex/home')],
    ['the opener is a sibling path', fakeTab('/cytoscape-old/')],
  ])('returns null when %s', (_case, opener) => {
    const { asWindow } = manualTab(opener)
    expect(findOpenerEditor(asWindow, BASE)).toBeNull()
  })

  it('ignores an opener on another origin with an app-like path', () => {
    const opener = fakeTab('/cytoscape/', {
      location: {
        origin: 'https://elsewhere.example.org',
        pathname: '/cytoscape/',
        href: 'https://elsewhere.example.org/cytoscape/',
      },
    })
    const { asWindow } = manualTab(opener)
    expect(findOpenerEditor(asWindow, BASE)).toBeNull()
  })
})

describe('goToEditor', () => {
  it('opens the editor in this tab at once when no editor opened it', () => {
    const { win, asWindow } = manualTab(null)
    goToEditor(asWindow, BASE)
    expect(win.location.assign).toHaveBeenCalledWith(BASE)
    expect(win.open).not.toHaveBeenCalled()
    expect(win.setTimeout).not.toHaveBeenCalled()
  })

  it('raises the editor tab by focus and by its tab name, without navigating it', () => {
    const editor = fakeTab('/cytoscape/')
    const { win, asWindow } = manualTab(editor)
    goToEditor(asWindow, BASE)
    expect(editor.focus).toHaveBeenCalled()
    // An empty URL targets the named tab without loading anything into it.
    expect(win.open).toHaveBeenCalledWith('', EDITOR_NAME)
    expect(editor.close).not.toHaveBeenCalled()
    expect(win.location.assign).not.toHaveBeenCalled()
  })

  it('stays put once the editor tab has taken focus', () => {
    const editor = fakeTab('/cytoscape/')
    const { win, asWindow, timers, runTimers } = manualTab(editor, {
      hasFocus: false,
    })
    goToEditor(asWindow, BASE)
    expect(timers.map((t) => t.ms)).toEqual([FOCUS_SETTLE_MS])
    runTimers()
    expect(win.location.assign).not.toHaveBeenCalled()
  })

  it('opens the editor in this tab when the browser kept focus here', () => {
    const editor = fakeTab('/cytoscape/')
    const { win, asWindow, runTimers } = manualTab(editor, { hasFocus: true })
    goToEditor(asWindow, BASE)
    expect(win.location.assign).not.toHaveBeenCalled()
    runTimers()
    expect(win.location.assign).toHaveBeenCalledWith(BASE)
  })

  it('closes a blank tab opened by a browser that missed the name', () => {
    const editor = fakeTab('/cytoscape/')
    const blank = fakeTab('', {
      name: EDITOR_NAME,
      location: { origin: ORIGIN, pathname: 'blank', href: 'about:blank' },
    })
    const { asWindow } = manualTab(editor, { found: blank })
    goToEditor(asWindow, BASE)
    expect(blank.close).toHaveBeenCalled()
    expect(editor.close).not.toHaveBeenCalled()
  })

  it('does not target a name this app did not give the tab', () => {
    const editor = fakeTab('/cytoscape/', { name: 'someone-elses-name' })
    const { win, asWindow } = manualTab(editor)
    goToEditor(asWindow, BASE)
    expect(editor.focus).toHaveBeenCalled()
    expect(win.open).not.toHaveBeenCalled()
  })
})

/** Fires a navigate event at the editor, as the browser would; true if cancelled. */
const fireNavigate = (navigation: EventTarget, url: string): boolean => {
  const event = Object.assign(new Event('navigate', { cancelable: true }), {
    destination: { url },
  })
  navigation.dispatchEvent(event)
  return event.defaultPrevented
}

describe('goToEditor: the in-place navigation Firefox needs', () => {
  const EDITOR_URL = `${ORIGIN}/cytoscape/0/networks/abc?x=1`
  const FOCUS_URL = `${EDITOR_URL}#${FOCUS_FRAGMENT}`

  const editorWithNavigation = (href = EDITOR_URL): FakeTab =>
    fakeTab('/cytoscape/0/networks/abc', {
      location: { origin: ORIGIN, pathname: '/cytoscape/0/networks/abc', href },
      navigation: new EventTarget(),
    })

  it('navigates the editor by name to its own URL plus a fragment', () => {
    const editor = editorWithNavigation()
    const { win, asWindow } = manualTab(editor)
    goToEditor(asWindow, BASE)
    expect(win.open).toHaveBeenNthCalledWith(1, '', EDITOR_NAME)
    expect(win.open).toHaveBeenNthCalledWith(2, FOCUS_URL, EDITOR_NAME)
  })

  it('replaces a fragment the editor already has', () => {
    const editor = editorWithNavigation(`${EDITOR_URL}#section`)
    const { win, asWindow } = manualTab(editor)
    goToEditor(asWindow, BASE)
    expect(win.open).toHaveBeenNthCalledWith(2, FOCUS_URL, EDITOR_NAME)
  })

  it('cancels that navigation, and only that one, until the settle check', () => {
    const editor = editorWithNavigation()
    const navigation = editor.navigation as EventTarget
    const { asWindow, runTimers } = manualTab(editor, { hasFocus: false })
    goToEditor(asWindow, BASE)

    expect(fireNavigate(navigation, FOCUS_URL)).toBe(true)
    expect(fireNavigate(navigation, `${EDITOR_URL}#other`)).toBe(false)
    expect(fireNavigate(navigation, `${ORIGIN}/cytoscape/1/networks`)).toBe(
      false,
    )

    runTimers()
    expect(fireNavigate(navigation, FOCUS_URL)).toBe(false)
  })

  it('is skipped without the Navigation API, which could not cancel it', () => {
    const editor = fakeTab('/cytoscape/')
    const { win, asWindow } = manualTab(editor)
    goToEditor(asWindow, BASE)
    expect(win.open).toHaveBeenCalledTimes(1)
  })

  it('is skipped when the name found no tab, or it would open a new one', () => {
    const editor = editorWithNavigation()
    const blank = fakeTab('', {
      location: { origin: ORIGIN, pathname: 'blank', href: 'about:blank' },
    })
    const { win, asWindow } = manualTab(editor, { found: blank })
    goToEditor(asWindow, BASE)
    expect(win.open).toHaveBeenCalledTimes(1)
    expect(blank.close).toHaveBeenCalled()
  })

  it('is skipped when the name found a tab other than the editor', () => {
    const editor = editorWithNavigation()
    const other = editorWithNavigation()
    const { win, asWindow } = manualTab(editor, { found: other })
    goToEditor(asWindow, BASE)
    expect(win.open).toHaveBeenCalledTimes(1)
    expect(other.close).not.toHaveBeenCalled()
  })
})
