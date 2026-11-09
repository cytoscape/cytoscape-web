import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useCredentialStore } from '../../../data/hooks/stores/CredentialStore'
import { useNetworkStore } from '../../../data/hooks/stores/NetworkStore'
import { useTableStore } from '../../../data/hooks/stores/TableStore'
import { useViewModelStore } from '../../../data/hooks/stores/ViewModelStore'
import { useVisualStyleStore } from '../../../data/hooks/stores/VisualStyleStore'
import { CyNetwork } from '../../../models/CyNetworkModel'
import { IdType } from '../../../models/IdType'
import { useSubNetworkStore } from '../store/SubNetworkStore'
import {
  fetchNdexSubnetworkByQuery,
  getSubNetworkId,
} from '../utils/subnetworkQueryUtil'
import { SubNetworkPanel } from './SubNetworkPanel'

// The renderers have their own tests and need a real canvas
vi.mock('../../NetworkPanel/CyjsRenderer', () => ({
  CyjsRenderer: () => <div data-testid="cyjs-renderer" />,
}))
vi.mock('../../FloatingToolBar', () => ({
  FloatingToolBar: () => null,
}))
vi.mock('../utils/subnetworkQueryUtil', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  fetchNdexSubnetworkByQuery: vi.fn(),
}))

const HIERARCHY_ID = 'hierarchy-1'
const SUBSYSTEM_A = 'A'
const SUBSYSTEM_B = 'B'
const SUB_A = getSubNetworkId(HIERARCHY_ID, SUBSYSTEM_A)
const SUB_B = getSubNetworkId(HIERARCHY_ID, SUBSYSTEM_B)

// Node ids of each subnetwork, by protein name. DR1 is in both.
const NODES: Record<IdType, Record<string, IdType>> = {
  [SUB_A]: { DR1: 'a1', TAF11: 'a2' },
  [SUB_B]: { DR1: 'b1', MYC: 'b2' },
}

const cyNetworkOf = (id: IdType): CyNetwork => {
  const nodeIds = Object.values(NODES[id])
  return {
    network: {
      id,
      nodes: nodeIds.map((nodeId) => ({ id: nodeId })),
      edges: [],
    },
    nodeTable: {
      columns: [],
      rows: new Map(
        Object.entries(NODES[id]).map(([name, nodeId]) => [nodeId, { name }]),
      ),
    },
    edgeTable: { columns: [], rows: new Map() },
    visualStyle: {},
    otherAspects: [],
    networkViews: [
      {
        id,
        type: 'nodeLink',
        nodeViews: Object.fromEntries(
          nodeIds.map((nodeId) => [nodeId, { id: nodeId }]),
        ),
        edgeViews: {},
        selectedNodes: [],
        selectedEdges: [],
      },
    ],
  } as unknown as CyNetwork
}

const fetchAtOnce = async ([hierarchyId, , , subsystemId]: string[]) =>
  cyNetworkOf(getSubNetworkId(hierarchyId, subsystemId))

/** Fetches the test settles by hand, by subnetwork id */
const deferFetches = () => {
  const resolvers = new Map<IdType, () => void>()
  vi.mocked(fetchNdexSubnetworkByQuery).mockImplementation(
    ([hierarchyId, , , subsystemId]) => {
      const id = getSubNetworkId(hierarchyId, subsystemId)
      return new Promise((resolve) => {
        resolvers.set(id, () => resolve(cyNetworkOf(id)))
      })
    },
  )
  return resolvers
}

const selectedIn = (id: IdType): IdType[] | undefined =>
  useViewModelStore.getState().viewModels[id]?.[0].selectedNodes

const shown = (id: IdType): Promise<void> =>
  waitFor(() => {
    expect(useSubNetworkStore.getState().currentSubNetworkId).toBe(id)
  })

/** A click in the Cell View, which names the protein for the viewer to select */
const clickRing = (...names: string[]): void => {
  act(() => {
    useSubNetworkStore.getState().setSelectedNodes(names, SUB_A)
  })
}

/** A selection made in the viewer itself */
const selectInViewer = (id: IdType, nodeIds: IdType[]): void => {
  act(() => {
    useViewModelStore.getState().exclusiveSelect(id, nodeIds, [])
  })
}

describe('SubNetworkPanel selection sync with the Cell View (#931)', () => {
  let client: QueryClient
  // Every value the viewer published to the Cell View
  let echoes: string[][]
  let unsubscribe: () => void

  const panel = (subsystemNodeId: IdType) => (
    <QueryClientProvider client={client}>
      <SubNetworkPanel
        hierarchyId={HIERARCHY_ID}
        subNetworkName="Subsystem"
        rootNetworkId="root"
        subsystemNodeId={subsystemNodeId}
        query={{ nodeIds: [1, 2] }}
        interactionNetworkId=""
        interactionNetworkHost="https://ndex.test"
      />
    </QueryClientProvider>
  )

  // As in MainPanel, the subsystem comes from the hierarchy's selection, so a
  // click changes it and the protein in one commit
  const FollowsHierarchy = () => {
    const subsystem = useViewModelStore(
      (state) => state.viewModels[HIERARCHY_ID]?.[0].selectedNodes[0],
    )
    return panel(subsystem)
  }

  const followHierarchy = (): void => {
    act(() => {
      useViewModelStore.setState(
        (state) =>
          ({
            viewModels: {
              ...state.viewModels,
              [HIERARCHY_ID]: [
                {
                  id: HIERARCHY_ID,
                  type: 'nodeLink',
                  selectedNodes: [SUBSYSTEM_A],
                },
              ],
            },
          }) as any,
      )
    })
  }

  const selectInHierarchy = (subsystem: IdType): void => {
    useViewModelStore.getState().exclusiveSelect(HIERARCHY_ID, [subsystem], [])
  }

  beforeEach(() => {
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    vi.mocked(fetchNdexSubnetworkByQuery).mockReset()
    vi.mocked(fetchNdexSubnetworkByQuery).mockImplementation(fetchAtOnce)

    // Both are in the stores already, which skips registration and its worker
    const networks = [SUB_A, SUB_B].map(cyNetworkOf)
    useNetworkStore.setState({
      networks: new Map(networks.map((n) => [n.network.id, n.network])),
    } as any)
    useTableStore.setState({
      tables: Object.fromEntries(
        networks.map((n) => [
          n.network.id,
          { nodeTable: n.nodeTable, edgeTable: n.edgeTable },
        ]),
      ),
    } as any)
    useViewModelStore.setState({
      viewModels: Object.fromEntries(
        networks.map((n) => [n.network.id, n.networkViews]),
      ),
    } as any)
    useVisualStyleStore.setState({ add: vi.fn(), visualStyles: {} } as any)
    useCredentialStore.setState({ getToken: async () => 'token' } as any)
    useSubNetworkStore.setState({
      selectedNodes: [],
      selectedHierarchyNodeNames: [],
      selectedNodesTarget: null,
      currentSubNetworkId: '',
      urlSelection: null,
    } as any)

    echoes = []
    unsubscribe = useSubNetworkStore.subscribe((state, previous) => {
      if (
        state.selectedHierarchyNodeNames !== previous.selectedHierarchyNodeNames
      ) {
        echoes.push(state.selectedHierarchyNodeNames)
      }
    })
  })

  afterEach(() => {
    unsubscribe()
    cleanup()
    client.clear()
  })

  describe('a clicked protein ring', () => {
    // The first click on a ring selects its subsystem, which mounts the panel.
    // The panel used to select the protein only when the click happened, and
    // no subnetwork was there yet.
    it('selects its protein in a subnetwork that was not rendered yet', async () => {
      clickRing('DR1')

      render(panel(SUBSYSTEM_A))
      await shown(SUB_A)

      await waitFor(() => expect(selectedIn(SUB_A)).toEqual(['a1']))
    })

    it('selects its protein at once in the subnetwork on screen', async () => {
      render(panel(SUBSYSTEM_A))
      await shown(SUB_A)

      clickRing('TAF11')

      expect(selectedIn(SUB_A)).toEqual(['a2'])
    })

    // The previous subnetwork stays in the panel's state while the next loads
    it('leaves the previous subnetwork alone while its own loads', async () => {
      followHierarchy()
      render(<FollowsHierarchy />)
      await shown(SUB_A)
      const fetches = deferFetches()

      act(() => {
        useSubNetworkStore.getState().setSelectedNodes(['DR1'], SUB_B)
        selectInHierarchy(SUBSYSTEM_B)
      })
      await waitFor(() => expect(fetches.has(SUB_B)).toBe(true))

      expect(selectedIn(SUB_A)).toEqual([])
      expect(selectedIn(SUB_B)).toEqual([])

      await act(async () => {
        fetches.get(SUB_B)?.()
      })
      await shown(SUB_B)

      await waitFor(() => expect(selectedIn(SUB_B)).toEqual(['b1']))
      expect(selectedIn(SUB_A)).toEqual([])
    })

    // The Cell View already paints the ring. An echo would clear the red border
    // when empty, and start the Cell View's expansion to the initial selection.
    it('is not echoed back to the Cell View', async () => {
      clickRing('DR1')

      render(panel(SUBSYSTEM_A))
      await shown(SUB_A)
      await waitFor(() => expect(selectedIn(SUB_A)).toEqual(['a1']))

      expect(echoes).toEqual([])
    })

    it('is not echoed back when the subnetwork is on screen', async () => {
      render(panel(SUBSYSTEM_A))
      await shown(SUB_A)
      echoes.length = 0

      clickRing('DR1')

      expect(selectedIn(SUB_A)).toEqual(['a1'])
      expect(echoes).toEqual([])
    })

    it('keeps its border when the subnetwork has no node for its protein', async () => {
      render(panel(SUBSYSTEM_A))
      await shown(SUB_A)
      selectInViewer(SUB_A, ['a2'])
      echoes.length = 0

      clickRing('NOT-IN-THE-SUBNETWORK')

      expect(selectedIn(SUB_A)).toEqual([])
      expect(echoes).toEqual([])
    })

    it('applies only once when the subnetwork is fetched again', async () => {
      render(panel(SUBSYSTEM_A))
      await shown(SUB_A)
      clickRing('DR1')
      selectInViewer(SUB_A, ['a2'])

      await act(async () => {
        await client.refetchQueries()
      })
      await shown(SUB_A)

      expect(selectedIn(SUB_A)).toEqual(['a2'])
    })

    it('applies only once when the panel is mounted again', async () => {
      const first = render(panel(SUBSYSTEM_A))
      await shown(SUB_A)
      clickRing('DR1')
      selectInViewer(SUB_A, ['a2'])
      first.unmount()

      render(panel(SUBSYSTEM_A))
      await shown(SUB_A)

      expect(selectedIn(SUB_A)).toEqual(['a2'])
    })
  })

  // The viewer unmounts with its tab, or when the right panel closes, while the
  // Cell View stays and keeps outlining the ring. A viewer that comes back must not
  // report a selection the Cell View already knows about.
  describe('a ring click across a remount of the viewer', () => {
    const remounted = async (...names: string[]) => {
      const first = render(panel(SUBSYSTEM_A))
      await shown(SUB_A)
      selectInViewer(SUB_A, ['a2'])
      clickRing(...names)
      first.unmount()
      echoes.length = 0

      render(panel(SUBSYSTEM_A))
      await shown(SUB_A)
    }

    it('is not echoed back', async () => {
      await remounted('DR1')

      expect(selectedIn(SUB_A)).toEqual(['a1'])
      expect(echoes).toEqual([])
    })

    it('keeps its border when the subnetwork has no node for its protein', async () => {
      await remounted('NOT-IN-THE-SUBNETWORK')

      expect(selectedIn(SUB_A)).toEqual([])
      expect(echoes).toEqual([])
    })

    it('does not stop the next viewer selection from being sent', async () => {
      await remounted('DR1')

      selectInViewer(SUB_A, ['a2'])

      expect(echoes).toEqual([['TAF11']])
    })

    // The background click cleared the Cell View, so it no longer shows this
    it('is sent again once another click has cleared the Cell View', async () => {
      const first = render(panel(SUBSYSTEM_A))
      await shown(SUB_A)
      clickRing('DR1')
      first.unmount()
      act(() => {
        useSubNetworkStore.getState().setSelectedNodes([], null)
      })
      echoes.length = 0

      render(panel(SUBSYSTEM_A))
      await shown(SUB_A)

      await waitFor(() => expect(echoes.at(-1)).toEqual(['DR1']))
    })
  })

  // A click is for the subnetwork of the subsystem it selected. Another subsystem
  // can be selected before that one arrives, in the Tree View for example.
  describe('a click overtaken by another selection', () => {
    const overtaken = async () => {
      followHierarchy()
      render(<FollowsHierarchy />)
      await shown(SUB_A)
      const fetches = deferFetches()

      act(() => {
        useSubNetworkStore.getState().setSelectedNodes(['DR1'], SUB_B)
        selectInHierarchy(SUBSYSTEM_B)
      })
      await waitFor(() => expect(fetches.has(SUB_B)).toBe(true))
      fetches.delete(SUB_A)

      act(() => {
        selectInHierarchy(SUBSYSTEM_A)
      })
      await waitFor(() => expect(fetches.has(SUB_A)).toBe(true))
      await act(async () => {
        fetches.get(SUB_A)?.()
      })
      await shown(SUB_A)
      return fetches
    }

    it('selects nothing in the subnetwork shown instead', async () => {
      await overtaken()

      expect(selectedIn(SUB_A)).toEqual([])
    })

    it('does not stop viewer selections from reaching the Cell View', async () => {
      await overtaken()
      echoes.length = 0

      selectInViewer(SUB_A, ['a2'])

      expect(echoes).toEqual([['TAF11']])
    })

    it('is not applied by a panel showing another subnetwork', async () => {
      useSubNetworkStore.getState().setSelectedNodes(['DR1'], SUB_B)

      render(panel(SUBSYSTEM_A))
      await shown(SUB_A)

      expect(selectedIn(SUB_A)).toEqual([])
    })
  })

  describe('other selections', () => {
    it('sends a selection made in the viewer to the Cell View by name', async () => {
      render(panel(SUBSYSTEM_A))
      await shown(SUB_A)
      echoes.length = 0

      selectInViewer(SUB_A, ['a2'])

      expect(echoes).toEqual([['TAF11']])
    })

    it('sends the next viewer selection after a ring click', async () => {
      render(panel(SUBSYSTEM_A))
      await shown(SUB_A)
      clickRing('DR1')
      echoes.length = 0

      selectInViewer(SUB_A, ['a2'])
      selectInViewer(SUB_A, ['a1'])

      expect(echoes).toEqual([['TAF11'], ['DR1']])
    })

    // `selectedSubnetworkNodes` in the URL restores into the view model, with no
    // click in the Cell View. A subnetwork arriving must not clear it.
    it('keeps a selection restored from the URL', async () => {
      useViewModelStore.getState().exclusiveSelect(SUB_A, ['a2'], [])

      render(panel(SUBSYSTEM_A))
      await shown(SUB_A)

      expect(selectedIn(SUB_A)).toEqual(['a2'])
      await waitFor(() => expect(echoes).toEqual([['TAF11']]))
    })

    // A click on the background selects no subsystem, so there is nowhere to apply it
    it('keeps a selection when the last click selected no subsystem', async () => {
      useViewModelStore.getState().exclusiveSelect(SUB_A, ['a2'], [])
      useSubNetworkStore.getState().setSelectedNodes([], null)

      render(panel(SUBSYSTEM_A))
      await shown(SUB_A)

      expect(selectedIn(SUB_A)).toEqual(['a2'])
    })

    it('clears the viewer when a subsystem ring is clicked', async () => {
      render(panel(SUBSYSTEM_A))
      await shown(SUB_A)
      selectInViewer(SUB_A, ['a2'])
      echoes.length = 0

      clickRing()

      expect(selectedIn(SUB_A)).toEqual([])
      expect(echoes).toEqual([[]])
    })
  })

  // `selectedSubnetworkNodes` in a link, by node id (#871). The subnetwork is
  // fetched after the link is read, so the request waits for it.
  describe('a selection from a link', () => {
    const requestFromLink = (subNetworkId: IdType, nodeIds: IdType[]) => {
      act(() => {
        useSubNetworkStore
          .getState()
          .requestUrlSelection({ subNetworkId, nodeIds, edgeIds: [] })
      })
    }

    it('selects its nodes once the subnetwork is shown', async () => {
      const fetches = deferFetches()
      requestFromLink(SUB_A, ['a2'])
      render(panel(SUBSYSTEM_A))
      await waitFor(() => expect(fetches.has(SUB_A)).toBe(true))
      expect(selectedIn(SUB_A)).toEqual([])

      await act(async () => {
        fetches.get(SUB_A)?.()
      })
      await shown(SUB_A)

      await waitFor(() => expect(selectedIn(SUB_A)).toEqual(['a2']))
      expect(useSubNetworkStore.getState().urlSelection).toBeNull()
    })

    it('is sent to the Cell View by name', async () => {
      requestFromLink(SUB_A, ['a1'])
      render(panel(SUBSYSTEM_A))
      await shown(SUB_A)

      await waitFor(() => expect(echoes.at(-1)).toEqual(['DR1']))
    })

    it('skips ids the subnetwork does not have', async () => {
      requestFromLink(SUB_A, ['a1', 'missing'])
      render(panel(SUBSYSTEM_A))
      await shown(SUB_A)

      await waitFor(() => expect(selectedIn(SUB_A)).toEqual(['a1']))
    })

    it('is not applied by a panel showing another subnetwork', async () => {
      requestFromLink(SUB_B, ['b2'])
      render(panel(SUBSYSTEM_A))
      await shown(SUB_A)

      expect(selectedIn(SUB_A)).toEqual([])
      expect(useSubNetworkStore.getState().urlSelection).not.toBeNull()
    })
  })
})
