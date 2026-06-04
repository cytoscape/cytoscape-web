import { CyApp } from '../../../models/AppModel/CyApp'
import { loadRemoteApp } from './loadRemoteApp'

describe('loadRemoteApp', () => {
  let appRegistry: Map<string, CyApp>

  beforeEach(() => {
    appRegistry = new Map()
  })

  it('returns undefined and does not register remote apps in standalone mode', async () => {
    const result = await loadRemoteApp('myApp', 'http://localhost:2222/remoteEntry.js', appRegistry)

    expect(result).toBeUndefined()
    expect(appRegistry.size).toBe(0)
  })
})
