import { afterEach, describe, expect, it } from 'vitest'

import { generateChannelName, initializeTabManager } from './tabManager'

describe('generateChannelName', () => {
  it('builds a channel name from hostname and port', () => {
    expect(generateChannelName('localhost', '5500')).toBe(
      'cytoscape-localhost-5500-channel',
    )
  })

  it('omits the port segment when there is no port', () => {
    expect(generateChannelName('web.cytoscape.org', '')).toBe(
      'cytoscape-web-cytoscape-org-channel',
    )
  })

  it('sanitizes non-alphanumeric characters and lowercases', () => {
    expect(generateChannelName('Dev.Example.Org', '80')).toBe(
      'cytoscape-dev-example-org-80-channel',
    )
  })
})

describe('initializeTabManager', () => {
  afterEach(() => {
    window.name = ''
  })

  it('reuses an existing cyweb tab ID from window.name', () => {
    window.name = 'cyweb-12345'

    expect(initializeTabManager('test-channel-reuse')).toBe('cyweb-12345')
  })

  it('creates a fresh cyweb tab ID otherwise', () => {
    window.name = 'unrelated-window-name'

    expect(initializeTabManager('test-channel-fresh')).toMatch(/^cyweb-\d+$/)
  })
})
