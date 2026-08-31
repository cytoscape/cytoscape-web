import { act, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { usePersistenceStatusStore } from '@/data/hooks/stores/PersistenceStatusStore'
import { useWorkspaceStore } from '@/data/hooks/stores/WorkspaceStore'
import { WorkspaceNamePanel } from './WorkspaceNamePanel'

const seedWorkspace = (isRemote: boolean): void => {
  act(() => {
    useWorkspaceStore.setState((state) => {
      state.workspace.id = 'ws-1'
      state.workspace.name = 'Untitled Workspace'
      state.workspace.isRemote = isRemote
      return state
    })
  })
}

describe('WorkspaceNamePanel', () => {
  beforeEach(() => {
    usePersistenceStatusStore.getState().reset()
  })

  it('marks a workspace that has never been to NDEx as local', () => {
    seedWorkspace(false)
    render(<WorkspaceNamePanel />)

    expect(screen.getByText('Local workspace')).toBeTruthy()
    expect(screen.getByText('Untitled Workspace')).toBeTruthy()
  })

  it('does not call a workspace loaded from NDEx a local workspace', () => {
    // The working copy is in this browser either way, but the origin is not
    // local — and claiming otherwise contradicts the NDEx chips on the rows.
    seedWorkspace(true)
    render(<WorkspaceNamePanel />)

    expect(screen.getByText('From NDEx')).toBeTruthy()
    expect(screen.queryByText('Local workspace')).toBeNull()
  })

  it('reports autosave working', () => {
    seedWorkspace(false)
    render(<WorkspaceNamePanel />)

    expect(screen.getByTestId('workspace-autosave-line').textContent).toBe(
      'Autosaved locally',
    )

    act(() => {
      usePersistenceStatusStore.getState().writeStarted()
    })
    expect(screen.getByTestId('workspace-autosave-line').textContent).toBe(
      'Saving locally…',
    )
  })

  it('reports autosave failing', () => {
    seedWorkspace(false)
    render(<WorkspaceNamePanel />)

    act(() => {
      const store = usePersistenceStatusStore.getState()
      store.writeStarted()
      store.writeSettled(new Error('quota exceeded'))
    })

    expect(screen.getByTestId('workspace-autosave-line').textContent).toBe(
      'Autosave failed',
    )
  })

  it('renders nothing but a spacer before a workspace exists', () => {
    act(() => {
      useWorkspaceStore.setState((state) => {
        state.workspace.id = ''
        return state
      })
    })
    render(<WorkspaceNamePanel />)

    expect(screen.queryByTestId('workspace-origin-chip')).toBeNull()
    expect(screen.queryByTestId('workspace-autosave-line')).toBeNull()
  })
})
