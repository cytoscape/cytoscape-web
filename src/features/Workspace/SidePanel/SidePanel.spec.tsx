// src/features/Workspace/SidePanel/SidePanel.spec.tsx
//
// The selected tab lives in SidePanelStore, not in the component: the side
// panel is unmounted while the right pane is closed, and the App API
// (`panel.open`) selects a tab before opening it.

import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useAppResourceStore } from '@/data/hooks/stores/AppResourceStore'
import { useAppStore } from '@/data/hooks/stores/AppStore'
import { useSidePanelStore } from '@/data/hooks/stores/SidePanelStore'
import { AppStatus } from '@/models/AppModel/AppStatus'
import type { RegisteredAppResource } from '@/models/AppModel/RegisteredAppResource'

import { SidePanel } from './SidePanel'

vi.mock('@/data/hooks/stores/AppStore', async () => {
  const { create } = await vi.importActual<typeof import('zustand')>('zustand')
  return {
    useAppStore: create(() => ({
      apps: {} as Record<string, { status: AppStatus }>,
      serviceApps: {},
    })),
  }
})

// The registry import would otherwise pull in the whole app manager.
vi.mock('../../../data/hooks/stores/useAppManager', () => ({
  appRegistry: new Map(),
}))
vi.mock('../../../app-api/core/perAppApis', () => ({
  buildPerAppApis: () => ({}),
}))
vi.mock('@/features/HierarchyViewer/components/MainPanel', () => ({
  MainPanel: () => <div>viewer content</div>,
}))

const panel = (appId: string, id: string): RegisteredAppResource => ({
  id,
  appId,
  slot: 'right-panel',
  title: `${id} title`,
  component: () => <div>{`${id} content`}</div>,
})

const selectedTabLabel = (): string | null =>
  screen.getByRole('tab', { selected: true }).textContent

describe('SidePanel', () => {
  beforeEach(() => {
    useSidePanelStore.setState({ selectedTabId: null })
    useAppStore.setState({
      apps: { app1: { status: AppStatus.Active } },
    } as never)
    useAppResourceStore.setState({
      resources: [panel('app1', 'P1'), panel('app1', 'P2')],
    })
  })

  it('selects the first tab when nothing was selected', () => {
    render(<SidePanel />)

    expect(selectedTabLabel()).toBe('Sub Network Viewer')
  })

  it('shows a tab that was selected while the panel was unmounted', async () => {
    useSidePanelStore.getState().setSelectedTabId('app1::right-panel::P2')

    render(<SidePanel />)

    expect(selectedTabLabel()).toBe('P2 title')
    expect(await screen.findByText('P2 content')).toBeTruthy()
    expect(useSidePanelStore.getState().selectedTabId).toBe(
      'app1::right-panel::P2',
    )
  })

  it('follows a selection made in the store while mounted', () => {
    render(<SidePanel />)

    act(() => {
      useSidePanelStore.getState().setSelectedTabId('app1::right-panel::P1')
    })

    expect(selectedTabLabel()).toBe('P1 title')
  })

  it('writes a clicked tab to the store', () => {
    render(<SidePanel />)

    fireEvent.click(screen.getByRole('tab', { name: 'P2 title' }))

    expect(useSidePanelStore.getState().selectedTabId).toBe(
      'app1::right-panel::P2',
    )
    expect(selectedTabLabel()).toBe('P2 title')
  })

  it('resets the selection to the first tab when the selected one goes away', () => {
    useSidePanelStore.getState().setSelectedTabId('app1::right-panel::P2')
    render(<SidePanel />)

    act(() => {
      useAppResourceStore.setState({ resources: [panel('app1', 'P1')] })
    })

    expect(selectedTabLabel()).toBe('Sub Network Viewer')
    expect(useSidePanelStore.getState().selectedTabId).toBe(
      '__builtin__::right-panel::sub-network-viewer',
    )
  })
})
