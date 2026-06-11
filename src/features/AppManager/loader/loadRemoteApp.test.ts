import { CyApp } from '../../../models/AppModel/CyApp'
import { loadRemoteApp } from './loadRemoteApp'
import { loadModule } from '../ExternalComponent'

vi.mock('../ExternalComponent', () => ({
  loadModule: vi.fn(),
}))

const mockedLoadModule = vi.mocked(loadModule)

describe('loadRemoteApp', () => {
  let appRegistry: Map<string, CyApp>
  const remoteApp = {
    id: 'myApp',
    name: 'My App',
    description: 'test app',
    version: '1.0.0',
    author: 'Test',
    components: [],
  } as unknown as CyApp

  beforeEach(() => {
    appRegistry = new Map()
    mockedLoadModule.mockReset()
  })

  it('loads AppConfig through Module Federation and registers the app', async () => {
    mockedLoadModule.mockResolvedValue({ default: remoteApp })

    const result = await loadRemoteApp('myApp', 'http://localhost:2222/remoteEntry.js', appRegistry)

    expect(mockedLoadModule).toHaveBeenCalledWith(
      'myApp',
      './AppConfig',
      'http://localhost:2222/remoteEntry.js',
    )
    expect(result).toBe(remoteApp)
    expect(appRegistry.get('myApp')).toBe(remoteApp)
  })

  it('returns undefined when the remote app id does not match the registry id', async () => {
    mockedLoadModule.mockResolvedValue({
      default: {
        ...remoteApp,
        id: 'differentApp',
      },
    })

    const result = await loadRemoteApp(
      'myApp',
      'http://localhost:2222/remoteEntry.js',
      appRegistry,
    )

    expect(result).toBeUndefined()
    expect(appRegistry.size).toBe(0)
  })
})
