import { render } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { SyncTabsAction } from './SyncTabs'
import { useRendererStore } from '../data/hooks/stores/RendererStore'
import { getDb } from '../data/db'

vi.mock('../data/db', () => ({
  getDb: vi.fn(),
}))

vi.mock('../data/hooks/stores/hydrationContext', () => ({
  isHydrating: vi.fn().mockReturnValue(false),
}))

vi.mock('../data/hooks/stores/RendererStore', () => ({
  useRendererStore: {
    getState: vi.fn().mockReturnValue({
      deleteViewport: vi.fn(),
    }),
  },
}))

describe('SyncTabs', () => {
  let mockBroadcastChannel: any
  let mockPostMessage: any
  let mockClose: any
  let channels: any[] = []
  
  const mockDbOn = vi.fn().mockReturnValue({ unsubscribe: vi.fn() })

  beforeEach(() => {
    mockPostMessage = vi.fn()
    mockClose = vi.fn()
    
    // We can spy on the constructor by wrapping it or just check channels array
    const MockClass = vi.fn().mockImplementation(function(this: any, name: string) {
      this.name = name
      this.postMessage = mockPostMessage
      this.close = mockClose
      this.onmessage = null
      channels.push(this)
    })
    mockBroadcastChannel = MockClass
    vi.stubGlobal('BroadcastChannel', MockClass)
    
    // Mock getDb
    vi.mocked(getDb).mockResolvedValue({
      on: mockDbOn,
    } as any)

    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: { reload: vi.fn(), href: '' },
      writable: true
    })
  })

  afterEach(() => {
    channels = []
    vi.clearAllMocks()
    vi.unstubAllGlobals()
  })

  it('initializes exactly two BroadcastChannels on mount', async () => {
    const { unmount } = render(<SyncTabsAction />)
    
    expect(mockBroadcastChannel).toHaveBeenCalledTimes(2)
    expect(mockBroadcastChannel).toHaveBeenCalledWith('cyweb-db-sync')
    expect(mockBroadcastChannel).toHaveBeenCalledWith('cyweb-ui-events')
    
    // Test unmount closes channels
    unmount()
    expect(mockClose).toHaveBeenCalledTimes(2)
  })

  it('calls deleteViewport when receiving a FIT_NETWORK message', () => {
    render(<SyncTabsAction />)
    
    const uiEventsChannel = channels.find(c => c.name === 'cyweb-ui-events')
    expect(uiEventsChannel).toBeDefined()
    expect(uiEventsChannel.onmessage).toBeDefined()
    
    // Simulate incoming message
    uiEventsChannel.onmessage({
      data: { type: 'FIT_NETWORK', networkId: 'test-net-id' }
    })
    
    const deleteViewportMock = useRendererStore.getState().deleteViewport
    expect(deleteViewportMock).toHaveBeenCalledWith('cyjs', 'test-net-id')
  })

  it('sets window.location.href to / when receiving a DATABASE_DELETED message', () => {
    render(<SyncTabsAction />)
    
    const uiEventsChannel = channels.find(c => c.name === 'cyweb-ui-events')
    
    uiEventsChannel.onmessage({
      data: { type: 'DATABASE_DELETED' }
    })
    
    expect(window.location.href).toBe('/')
  })
})
