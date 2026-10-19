import { afterEach, describe, expect, it } from 'vitest'

import {
  currentDbScope,
  dbNameFor,
  resolveDbScope,
  uiEventsChannelFor,
} from './dbScope'

describe('resolveDbScope', () => {
  it.each([
    ['/manual', '/', 'manual'],
    ['/manual/', '/', 'manual'],
    ['/manual/styles', '/', 'manual'],
    ['/manual/styles/', '/', 'manual'],
    ['/', '/', 'app'],
    ['/abc123/networks/n1', '/', 'app'],
    ['/manualx', '/', 'app'],
    ['/x/manual', '/', 'app'],
    ['/cytoscape/manual', '/cytoscape/', 'manual'],
    ['/cytoscape/manual/styles', '/cytoscape', 'manual'],
    ['/cytoscape/abc/networks/n1', '/cytoscape/', 'app'],
    ['/manual', '/cytoscape/', 'app'],
  ] as const)('%s under base %s is %s', (pathname, base, expected) => {
    expect(resolveDbScope(pathname, base)).toBe(expected)
  })
})

describe('scoped names', () => {
  it('keeps the editor names unchanged', () => {
    expect(dbNameFor('app')).toBe('cyweb-db')
    expect(uiEventsChannelFor('app')).toBe('cyweb-ui-events')
  })

  it('gives the manual its own database and channel', () => {
    expect(dbNameFor('manual')).toBe('cyweb-manual-db')
    expect(uiEventsChannelFor('manual')).toBe('cyweb-manual-ui-events')
  })
})

describe('currentDbScope', () => {
  afterEach(() => {
    window.history.replaceState(null, '', '/')
  })

  it('reads the manual scope from the address bar', () => {
    window.history.replaceState(null, '', '/manual/styles')
    expect(currentDbScope()).toBe('manual')
  })

  it('reads the app scope everywhere else', () => {
    window.history.replaceState(null, '', '/ws1/networks/n1')
    expect(currentDbScope()).toBe('app')
  })
})
