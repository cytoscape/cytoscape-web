import { afterEach, describe, expect, it } from 'vitest'

import {
  currentDbScope,
  dbNameFor,
  isInMemoryScope,
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
    ['/embed', '/', 'embed'],
    ['/embed/', '/', 'embed'],
    ['/embed/abc-123', '/', 'embed'],
    ['/embeds', '/', 'app'],
    ['/cytoscape/embed/abc-123', '/cytoscape/', 'embed'],
    ['/embed/abc-123', '/cytoscape/', 'app'],
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

  it('gives the embed its own database and channel', () => {
    expect(dbNameFor('embed')).toBe('cyweb-embed-db')
    expect(uiEventsChannelFor('embed')).toBe('cyweb-embed-ui-events')
  })
})

describe('isInMemoryScope', () => {
  it('keeps only the embed in memory', () => {
    expect(isInMemoryScope('embed')).toBe(true)
    expect(isInMemoryScope('app')).toBe(false)
    expect(isInMemoryScope('manual')).toBe(false)
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

  it('reads the embed scope from the address bar', () => {
    window.history.replaceState(null, '', '/embed/n1')
    expect(currentDbScope()).toBe('embed')
  })

  it('reads the app scope everywhere else', () => {
    window.history.replaceState(null, '', '/ws1/networks/n1')
    expect(currentDbScope()).toBe('app')
  })
})
