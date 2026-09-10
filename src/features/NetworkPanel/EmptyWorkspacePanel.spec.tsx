import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useOnboardingStore } from '@/features/Onboarding/store/OnboardingStore'
import { DEFAULT_TOUR_ID } from '@/features/Onboarding/tours/registry'
import { useFileUploadDialogStore } from '@/features/ToolBar/DataMenu/store/fileUploadDialogStore'
import { useLoadFromNdexDialogStore } from '@/features/ToolBar/DataMenu/store/loadFromNdexDialogStore'
import { EmptyWorkspacePanel } from './EmptyWorkspacePanel'

// The sample-network load is a live NDEx round trip owned by the hook; the
// panel only has to render its states and call it.
const demo = vi.hoisted(() => ({
  loadDemoNetworks: vi.fn().mockResolvedValue(true),
  status: 'idle' as 'idle' | 'loading' | 'error',
  errorMessage: null as string | null,
}))

vi.mock('@/data/hooks/useLoadDemoNetworks', () => ({
  useLoadDemoNetworks: () => ({
    loadDemoNetworks: demo.loadDemoNetworks,
    status: demo.status,
    errorMessage: demo.errorMessage,
  }),
}))

describe('EmptyWorkspacePanel', () => {
  beforeEach(() => {
    demo.loadDemoNetworks.mockClear()
    demo.status = 'idle'
    demo.errorMessage = null
    useFileUploadDialogStore.setState({ isOpen: false, hasOpened: false })
    useLoadFromNdexDialogStore.setState({ isOpen: false, initialQuery: null })
    useOnboardingStore.getState().reset()
  })

  it('offers every way to get a network on screen', () => {
    render(<EmptyWorkspacePanel />)

    expect(screen.getByTestId('empty-workspace-panel')).toBeDefined()
    expect(screen.getByText('Welcome to Cytoscape Web')).toBeDefined()
    expect(screen.getByTestId('empty-workspace-open-samples')).toBeDefined()
    expect(screen.getByTestId('empty-workspace-import-file')).toBeDefined()
    expect(screen.getByTestId('empty-workspace-load-ndex')).toBeDefined()
    expect(screen.getByTestId('empty-workspace-take-tour')).toBeDefined()
  })

  it('Open Sample Networks starts the sample load', () => {
    render(<EmptyWorkspacePanel />)

    fireEvent.click(screen.getByTestId('empty-workspace-open-samples'))

    expect(demo.loadDemoNetworks).toHaveBeenCalledTimes(1)
  })

  it('Import from file opens the file upload dialog', () => {
    render(<EmptyWorkspacePanel />)

    fireEvent.click(screen.getByTestId('empty-workspace-import-file'))

    expect(useFileUploadDialogStore.getState().isOpen).toBe(true)
  })

  it('Load from NDEx opens the NDEx browser in browse mode', () => {
    render(<EmptyWorkspacePanel />)

    fireEvent.click(screen.getByTestId('empty-workspace-load-ndex'))

    const { isOpen, initialQuery } = useLoadFromNdexDialogStore.getState()
    expect(isOpen).toBe(true)
    // Guards against handing the click event to openDialog(query).
    expect(initialQuery).toBeNull()
  })

  it('Take a tour starts the default tour', () => {
    render(<EmptyWorkspacePanel />)

    fireEvent.click(screen.getByTestId('empty-workspace-take-tour'))

    expect(useOnboardingStore.getState().activeTour).toBe(DEFAULT_TOUR_ID)
  })

  it('disables every action while the samples are loading', () => {
    demo.status = 'loading'
    render(<EmptyWorkspacePanel />)

    expect(screen.getByText(/Opening sample networks/i)).toBeDefined()
    for (const id of [
      'empty-workspace-open-samples',
      'empty-workspace-import-file',
      'empty-workspace-load-ndex',
      'empty-workspace-take-tour',
    ]) {
      expect((screen.getByTestId(id) as HTMLButtonElement).disabled).toBe(true)
    }
  })

  it('shows the failure inline with a Retry that reloads', () => {
    demo.status = 'error'
    demo.errorMessage = 'NDEx unreachable'
    render(<EmptyWorkspacePanel />)

    expect(screen.getByTestId('empty-workspace-error')).toBeDefined()
    // The other paths stay available when NDEx is down.
    expect(
      (screen.getByTestId('empty-workspace-import-file') as HTMLButtonElement)
        .disabled,
    ).toBe(false)

    fireEvent.click(screen.getByTestId('empty-workspace-retry'))

    expect(demo.loadDemoNetworks).toHaveBeenCalledTimes(1)
  })

  it('hides the actions while a tour is running', () => {
    useOnboardingStore.getState().startTour(DEFAULT_TOUR_ID)
    render(<EmptyWorkspacePanel />)

    expect(screen.getByText('Welcome to Cytoscape Web')).toBeDefined()
    expect(screen.queryByTestId('empty-workspace-open-samples')).toBeNull()
    expect(screen.queryByTestId('empty-workspace-take-tour')).toBeNull()
  })
})
