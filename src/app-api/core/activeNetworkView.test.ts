// src/app-api/core/activeNetworkView.test.ts
//
// Runs against the real stores: what matters is the active view the App API
// leaves behind for the table browser, layout tools and search, which a
// mocked store cannot show (#927).

import { beforeEach, describe, expect, it } from 'vitest'

import {
  DEFAULT_UI_STATE,
  useUiStateStore,
} from '../../data/hooks/stores/UiStateStore'
import { useWorkspaceStore } from '../../data/hooks/stores/WorkspaceStore'
import { networkApi } from './networkApi'
import { workspaceApi } from './workspaceApi'

const activeView = () => useUiStateStore.getState().ui.activeNetworkView

const edgeList: [string, string][] = [['a', 'b']]

describe('App API changes of the current network', () => {
  beforeEach(() => {
    useWorkspaceStore.setState((state) => ({
      workspace: { ...state.workspace, networkIds: [], currentNetworkId: '' },
    }))
    useUiStateStore.setState({ ui: DEFAULT_UI_STATE })
  })

  it('switchCurrentNetwork moves the active view to the network it shows', () => {
    useWorkspaceStore.getState().addNetworkIds(['net-a', 'net-b'])
    useWorkspaceStore.getState().setCurrentNetworkId('net-a')
    useUiStateStore.getState().setActiveNetworkView('net-a')

    const result = workspaceApi.switchCurrentNetwork('net-b')

    expect(result.success).toBe(true)
    expect(activeView()).toBe('net-b')
  })

  it('switchCurrentNetwork keeps a subnetwork view of the network already shown', () => {
    useWorkspaceStore.getState().addNetworkIds(['net-a'])
    useWorkspaceStore.getState().setCurrentNetworkId('net-a')
    useUiStateStore.getState().setActiveNetworkView('net-a_7')

    workspaceApi.switchCurrentNetwork('net-a')

    expect(activeView()).toBe('net-a_7')
  })

  it('a rejected switch leaves the active view alone', () => {
    useWorkspaceStore.getState().addNetworkIds(['net-a'])
    useWorkspaceStore.getState().setCurrentNetworkId('net-a')
    useUiStateStore.getState().setActiveNetworkView('net-a')

    const result = workspaceApi.switchCurrentNetwork('net-missing')

    expect(result.success).toBe(false)
    expect(activeView()).toBe('net-a')
  })

  it('createNetworkFromEdgeList with addToWorkspace shows the new network', () => {
    useWorkspaceStore.getState().addNetworkIds(['net-a'])
    useWorkspaceStore.getState().setCurrentNetworkId('net-a')
    useUiStateStore.getState().setActiveNetworkView('net-a')

    const result = networkApi.createNetworkFromEdgeList({
      name: 'New',
      edgeList,
      addToWorkspace: true,
    })

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(activeView()).toBe(result.data.networkId)
  })

  it('createNetworkFromEdgeList without addToWorkspace leaves the active view alone', () => {
    useWorkspaceStore.getState().addNetworkIds(['net-a'])
    useWorkspaceStore.getState().setCurrentNetworkId('net-a')
    useUiStateStore.getState().setActiveNetworkView('net-a')

    const result = networkApi.createNetworkFromEdgeList({
      name: 'Detached',
      edgeList,
      addToWorkspace: false,
    })

    expect(result.success).toBe(true)
    expect(activeView()).toBe('net-a')
  })
})
