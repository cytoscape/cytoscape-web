import React from 'react'
import { render, act } from '@testing-library/react'
import {
  createEmptyNetwork,
  useCreateNetworkWithView,
} from '../../src/task/CreateNetwork'
import { NetworkWithView } from '../../src/models/NetworkWithViewModel'

import { useNetworkStore } from '../../src/store/NetworkStore'
import { useTableStore } from '../../src/store/TableStore'
import { useViewModelStore } from '../../src/store/ViewModelStore'
import { useVisualStyleStore } from '../../src/store/VisualStyleStore'
import { v4 as uuidv4 } from 'uuid'
import { Network } from 'src/models'

const mockId = 'mocked-uuid'

// Mock the stores
jest.mock('uuid', () => ({
  v4: jest.fn(() => mockId),
}))
jest.mock('../../src/models/NetworkModel')
jest.mock('../../src/models/TableModel')
jest.mock('../../src/models/ViewModel')
jest.mock('../../src/models/VisualStyleModel')
jest.mock('../../src/store/NetworkStore')
jest.mock('../../src/store/TableStore')
jest.mock('../../src/store/ViewModelStore')
jest.mock('../../src/store/VisualStyleStore')

interface TestComponentProps {
  onCreate: (data: NetworkWithView) => void
}

// Test component to use the hook
const TestComponent = ({ onCreate }: TestComponentProps) => {
  const createNetworkWithView = useCreateNetworkWithView()

  React.useEffect(() => {
    const data = createNetworkWithView()
    onCreate(data)
  }, [createNetworkWithView, onCreate])

  return <div>Test Component</div>
}

describe('createEmptyNetwork', () => {
  it('should return an empty network object with default properties', () => {
    const expectedNetwork: Network = {
      id: expect.any(String),
      nodes: [],
      edges: [],
    }

    const newNetwork = createEmptyNetwork()

    console.log('Empty network', newNetwork)

    expect(newNetwork).toEqual(expectedNetwork)
  })
})

describe('useCreateNetworkWithView', () => {
  const mockNetwork: Network = { id: mockId, nodes: [], edges: [] }

  beforeEach(() => {
    // Reset the mock implementations before each test
    jest.resetAllMocks()
    ;(uuidv4 as jest.Mock).mockReturnValue(mockId)
  })

  it('should create a network with view including VS', () => {
    // Mock the store functions
    ;(useNetworkStore as any as jest.Mock).mockReturnValue({
      add: jest.fn(),
    })
    ;(useTableStore as any as jest.Mock).mockReturnValue({ add: jest.fn() })
    ;(useViewModelStore as any as jest.Mock).mockReturnValue({ add: jest.fn() })
    ;(useVisualStyleStore as any as jest.Mock).mockReturnValue({
      add: jest.fn(),
    })

    const addNetwork = jest.fn()
    const addViewModel = jest.fn()
    const addVisualStyle = jest.fn()

    // Mock function to capture the created data
    const handleCreate = jest.fn()

    // Render the test component
    act(() => {
      render(<TestComponent onCreate={handleCreate} />)
    })

    // Assert: Check if the network, view, and visual style were created and added to the stores
    console.log('* Testing the network creation')
    expect(handleCreate).toHaveBeenCalled()
    const networkData = handleCreate.mock.calls[0][0]

    expect(networkData).toBeDefined()
    expect(networkData.network).toBeDefined()
    expect(networkData.networkView).toBeDefined()
    expect(networkData.visualStyle).toBeDefined()

    expect(addNetwork).toHaveBeenCalledWith(networkData.network)
    expect(addViewModel).toHaveBeenCalledWith(
      networkData.network.id,
      networkData.networkView,
    )
    expect(addVisualStyle).toHaveBeenCalledWith(
      networkData.network.id,
      networkData.visualStyle,
    )
  })
})
