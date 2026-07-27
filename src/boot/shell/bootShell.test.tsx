import { act, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import {
  resetBootStateForTesting,
  setBootError,
  setBootMessage,
} from '../bootState'
import { BootShell } from './BootShell'
import {
  BOOT_SHELL_STYLE_ID,
  BOOT_SHELL_TESTID,
  bootShellBuildTime,
  bootShellInnerHtml,
  bootShellVersion,
} from './bootShellMarkup'
import { showBootShell } from './showBootShell'

const mountRoot = (): HTMLElement => {
  const root = document.createElement('div')
  root.id = 'root'
  document.body.appendChild(root)
  return root
}

afterEach(() => {
  document.body.innerHTML = ''
  // The stylesheet lives in <head>, so clearing the body leaves it installed.
  // Without this, the "keeps the stylesheet out of the shell subtree" test
  // below would pass on a leftover from an earlier showBootShell call even if
  // BootShell stopped installing it.
  document.getElementById(BOOT_SHELL_STYLE_ID)?.remove()
  resetBootStateForTesting()
})

describe('showBootShell', () => {
  it('paints the shell into an empty #root', () => {
    const root = mountRoot()

    showBootShell()

    const shell = root.querySelector(`[data-testid="${BOOT_SHELL_TESTID}"]`)
    expect(shell).not.toBeNull()
    expect(shell?.className).toBe('boot-shell boot-shell-full')
    expect(shell?.textContent).toContain('Cytoscape Web')
    expect(shell?.textContent).toContain('Loading application...')
  })

  it('is a no-op when #root already has children', () => {
    const root = mountRoot()
    root.appendChild(document.createElement('span'))

    showBootShell()

    // The guard is what stops the second caller (src/index.tsx in production,
    // where the standalone chunk already painted) from clobbering the app.
    expect(root.childElementCount).toBe(1)
    expect(
      root.querySelector(`[data-testid="${BOOT_SHELL_TESTID}"]`),
    ).toBeNull()
  })

  it('is a no-op when #root is absent', () => {
    expect(() => showBootShell()).not.toThrow()
    expect(document.body.childElementCount).toBe(0)
  })

  it('omits the toolbar strip in the content region', () => {
    const root = mountRoot()

    showBootShell({ region: 'content' })

    const shell = root.querySelector(`[data-testid="${BOOT_SHELL_TESTID}"]`)
    expect(shell?.className).toBe('boot-shell boot-shell-content')
    expect(shell?.querySelector('.boot-shell-toolbar')).toBeNull()
    // The rest of the geometry is unchanged, so the region resolves in place.
    expect(shell?.querySelector('.boot-shell-left')).not.toBeNull()
    expect(shell?.querySelector('.boot-shell-bottom')).not.toBeNull()
  })
})

describe('BootShell / showBootShell parity', () => {
  // With no message prop, BootShell falls back to the live bootState message
  // while showBootShell falls back to DEFAULT_BOOT_MESSAGE. Those agree only
  // while boot state is pristine, so the top-level afterEach reset is what
  // keeps this suite from depending on which file ran before it.
  //
  // The reason BootShell uses dangerouslySetInnerHTML: the plain-DOM shell
  // that paints pre-React and the React shell that replaces it must produce
  // identical DOM, or the handoff flashes. This is the guard for that.
  it.each([
    ['default', {}],
    ['content region', { region: 'content' as const }],
    ['custom message', { message: 'Loading workspace...' }],
    [
      'error mode',
      {
        error: {
          title: 'This browser has a newer database',
          message: 'Open the newer deployment in a different browser profile.',
          detail: 'onDisk=12 expected=11',
        },
      },
    ],
  ])('renders identical DOM for %s', (_label, options) => {
    const root = mountRoot()
    showBootShell(options)
    const domHtml = root.querySelector(
      `[data-testid="${BOOT_SHELL_TESTID}"]`,
    )?.outerHTML

    // Scope to the render container: the plain-DOM shell above is also in
    // document.body, so a global query would match both.
    const { container } = render(<BootShell {...options} />)
    const reactHtml = container.querySelector(
      `[data-testid="${BOOT_SHELL_TESTID}"]`,
    )?.outerHTML

    expect(reactHtml).toBeDefined()
    expect(domHtml).toBe(reactHtml)
  })
})

describe('BootShell live phase tracking', () => {
  it('follows the boot phase message when none is passed', () => {
    const { container } = render(<BootShell />)
    expect(container.textContent).toContain('Loading application...')

    act(() => {
      setBootMessage('Loading workspace...')
    })

    expect(container.textContent).toContain('Loading workspace...')
    expect(container.textContent).not.toContain('Loading application...')
  })

  it('updates the message without rebuilding the shell subtree', () => {
    // The flicker regression: when the message was interpolated into the HTML
    // string, every phase transition handed React a new string and it replaced
    // the whole subtree — recreating every shimmer block and the spinner and
    // restarting their CSS animations from frame zero, three times per boot.
    const { container } = render(<BootShell />)
    const spinnerBefore = container.querySelector('.boot-shell-spinner')
    const blocksBefore = [...container.querySelectorAll('.boot-shell-block')]

    // Without these the identity assertions below hold vacuously: a shell that
    // rendered no spinner and no blocks at all would still "not rebuild" them.
    expect(spinnerBefore).not.toBeNull()
    expect(blocksBefore.length).toBeGreaterThan(0)

    act(() => {
      setBootMessage('Loading workspace...')
    })
    act(() => {
      setBootMessage('Loading network...')
    })

    // Same element instances, so no animation restarts.
    expect(container.querySelector('.boot-shell-spinner')).toBe(spinnerBefore)
    expect([...container.querySelectorAll('.boot-shell-block')]).toEqual(
      blocksBefore,
    )
    expect(container.textContent).toContain('Loading network...')
  })

  it('keeps the stylesheet out of the shell subtree', () => {
    // In <head>, so a repaint cannot re-insert it and force a style recalc.
    const { container } = render(<BootShell />)

    expect(container.querySelector('style')).toBeNull()
    expect(document.getElementById(BOOT_SHELL_STYLE_ID)).not.toBeNull()
  })

  it('lets an explicit message pin the status line', () => {
    const { container } = render(<BootShell message="Pinned" />)

    act(() => {
      setBootMessage('Loading workspace...')
    })

    expect(container.textContent).toContain('Pinned')
  })

  it('switches to error mode when the boot fails terminally', () => {
    const { container } = render(<BootShell />)

    act(() => {
      setBootError({ title: 'Storage unavailable', message: 'Private mode?' })
    })

    expect(container.textContent).toContain('Storage unavailable')
    expect(container.querySelector('.boot-shell-spinner')).toBeNull()
  })
})

describe('bootShellInnerHtml', () => {
  it('escapes interpolated text in the markup', () => {
    const html = bootShellInnerHtml({
      error: { title: '<img onerror=x>', message: 'ok' },
    })

    expect(html).not.toContain('<img onerror=x>')
    expect(html).toContain('&lt;img onerror=x&gt;')
  })

  it('sets the status message as text, never as markup', () => {
    // The message goes through textContent rather than the HTML string, so it
    // cannot inject markup regardless of escaping.
    const root = mountRoot()
    showBootShell({ message: '<img onerror=x>' })
    const shell = root.querySelector(`[data-testid="${BOOT_SHELL_TESTID}"]`)

    expect(shell?.querySelector('.boot-shell-status p')?.textContent).toBe(
      '<img onerror=x>',
    )
    expect(shell?.querySelector('img')).toBeNull()
  })

  it('drops the spinner and the "may take some time" line in error mode', () => {
    const root = mountRoot()
    showBootShell({
      error: { title: 'Storage unavailable', message: 'Private browsing?' },
    })
    const shell = root.querySelector(`[data-testid="${BOOT_SHELL_TESTID}"]`)

    // Both actively mislead once the boot has terminally failed. Query the
    // DOM rather than the HTML string — the stylesheet the shell carries
    // defines these class names whether or not they are used.
    expect(shell?.querySelector('.boot-shell-spinner')).toBeNull()
    expect(shell?.textContent).not.toContain(
      'Initial loading may take some time',
    )
    // The build identity stays — it is what a developer needs to read here.
    expect(shell?.textContent).toContain('Version ')
    expect(shell?.textContent).toContain('Built on: ')
    expect(shell?.textContent).toContain('Storage unavailable')
  })

  it('omits the detail line when there is no detail', () => {
    const root = mountRoot()
    showBootShell({
      error: { title: 'Storage unavailable', message: 'Private browsing?' },
    })
    const shell = root.querySelector(`[data-testid="${BOOT_SHELL_TESTID}"]`)

    expect(shell?.querySelector('.boot-shell-error')).not.toBeNull()
    expect(shell?.querySelector('.boot-shell-error-detail')).toBeNull()
  })

  it('inlines the logo rather than requesting it', () => {
    // An <img src> would fetch at exactly the plain-DOM to React handoff.
    const html = bootShellInnerHtml()

    expect(html).toContain('<svg')
    expect(html).not.toContain('<img')
  })
})

describe('build metadata', () => {
  it('reports a version', () => {
    expect(bootShellVersion()).not.toBe('')
  })

  it('formats the injected build time, or passes it through unparseable', () => {
    const buildTime = bootShellBuildTime()

    expect(buildTime).not.toBe('')
    expect(buildTime).not.toContain('NaN')
  })
})
