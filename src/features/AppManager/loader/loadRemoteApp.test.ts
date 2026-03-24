import { CyApp } from '../../../models/AppModel/CyApp'
import { loadModule } from '../ExternalComponent'
import { loadRemoteApp } from './loadRemoteApp'

jest.mock('../ExternalComponent', () => ({
  loadModule: jest.fn(),
}))

const mockLoadModule = loadModule as jest.MockedFunction<typeof loadModule>

describe('loadRemoteApp', () => {
  let appRegistry: Map<string, CyApp>

  beforeEach(() => {
    appRegistry = new Map()
    mockLoadModule.mockReset()
  })

  it('returns CyApp and adds to appRegistry on success', async () => {
    const cyApp: CyApp = { id: 'myApp', name: 'My App' }
    mockLoadModule.mockResolvedValue({ default: cyApp })

    const result = await loadRemoteApp('myApp', 'http://localhost:2222/remoteEntry.js', appRegistry)

    expect(result).toBe(cyApp)
    expect(appRegistry.get('myApp')).toBe(cyApp)
    expect(mockLoadModule).toHaveBeenCalledWith('myApp', './AppConfig', 'http://localhost:2222/remoteEntry.js')
  })

  it('handles module without default export (bare export)', async () => {
    const cyApp: CyApp = { id: 'myApp', name: 'My App' }
    mockLoadModule.mockResolvedValue(cyApp)

    const result = await loadRemoteApp('myApp', 'http://localhost:2222/remoteEntry.js', appRegistry)

    expect(result).toBe(cyApp)
    expect(appRegistry.get('myApp')).toBe(cyApp)
  })

  it('returns undefined when loadModule returns undefined', async () => {
    mockLoadModule.mockResolvedValue(undefined)

    const result = await loadRemoteApp('myApp', 'http://localhost:2222/remoteEntry.js', appRegistry)

    expect(result).toBeUndefined()
    expect(appRegistry.size).toBe(0)
  })

  it('returns undefined when loadModule returns null', async () => {
    mockLoadModule.mockResolvedValue(null)

    const result = await loadRemoteApp('myApp', 'http://localhost:2222/remoteEntry.js', appRegistry)

    expect(result).toBeUndefined()
    expect(appRegistry.size).toBe(0)
  })

  it('returns undefined when loadModule throws', async () => {
    mockLoadModule.mockRejectedValue(new Error('network error'))

    const result = await loadRemoteApp('myApp', 'http://localhost:2222/remoteEntry.js', appRegistry)

    expect(result).toBeUndefined()
    expect(appRegistry.size).toBe(0)
  })

  it('returns undefined when CyApp.id does not match manifest id', async () => {
    const cyApp: CyApp = { id: 'differentId', name: 'Different App' }
    mockLoadModule.mockResolvedValue({ default: cyApp })

    const result = await loadRemoteApp('myApp', 'http://localhost:2222/remoteEntry.js', appRegistry)

    expect(result).toBeUndefined()
    expect(appRegistry.size).toBe(0)
  })
})
