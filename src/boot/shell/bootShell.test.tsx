import { render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { BootShell } from './BootShell'
import {
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
    expect(root.querySelector(`[data-testid="${BOOT_SHELL_TESTID}"]`)).toBeNull()
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

describe('bootShellInnerHtml', () => {
  it('escapes interpolated text', () => {
    const html = bootShellInnerHtml({ message: '<img onerror=x>' })

    expect(html).not.toContain('<img onerror=x>')
    expect(html).toContain('&lt;img onerror=x&gt;')
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
    expect(shell?.textContent).not.toContain('Initial loading may take some time')
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
