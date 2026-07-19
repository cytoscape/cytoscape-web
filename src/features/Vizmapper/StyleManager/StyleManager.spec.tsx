import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { useVisualStyleStore } from '../../../data/hooks/stores/VisualStyleStore'
import { useWorkspaceStore } from '../../../data/hooks/stores/WorkspaceStore'
import { IdType } from '../../../models/IdType'
import { createVisualStyle } from '../../../models/VisualStyleModel/impl/visualStyleFnImpl'
import { StyleManager } from './StyleManager'

const NETWORK_ID: IdType = 'style-manager-network'

describe('StyleManager', () => {
  beforeEach(() => {
    act(() => {
      useVisualStyleStore.getState().deleteAll()
      useVisualStyleStore.getState().add(NETWORK_ID, createVisualStyle())
    })
  })

  it('renders nothing for a network without styles', () => {
    render(<StyleManager networkId="unknown-network" />)
    expect(screen.queryByTestId('style-manager')).toBeNull()
  })

  it('shows the active style name in the selector', () => {
    render(<StyleManager networkId={NETWORK_ID} />)
    expect(screen.getByTestId('style-manager')).toBeDefined()
    expect(screen.getByText('Default')).toBeDefined()
  })

  it('disables Delete when only one style exists', () => {
    render(<StyleManager networkId={NETWORK_ID} />)
    fireEvent.click(screen.getByTestId('style-manager-menu-button'))
    const deleteItem = screen.getByTestId('style-manager-delete-menu-item')
    expect(deleteItem.getAttribute('aria-disabled')).toBe('true')
  })

  it('duplicates the current style and marks the network modified', () => {
    render(<StyleManager networkId={NETWORK_ID} />)
    fireEvent.click(screen.getByTestId('style-manager-menu-button'))
    fireEvent.click(screen.getByTestId('style-manager-duplicate-menu-item'))

    const setState = useVisualStyleStore.getState().styleSets[NETWORK_ID]
    const names = Object.values(setState.styles).map((entry) => entry.name)
    expect(names.sort()).toEqual(['Copy of Default', 'Default'])
    expect(
      useWorkspaceStore.getState().workspace.networkModified[NETWORK_ID],
    ).toBe(true)
  })

  it('creates a named style via the dialog and switches to it', () => {
    render(<StyleManager networkId={NETWORK_ID} />)
    fireEvent.click(screen.getByTestId('style-manager-menu-button'))
    fireEvent.click(screen.getByTestId('style-manager-new-menu-item'))

    const input = screen.getByTestId('style-name-input')
    fireEvent.change(input, { target: { value: 'Publication' } })
    fireEvent.click(screen.getByTestId('style-name-confirm-button'))

    const setState = useVisualStyleStore.getState().styleSets[NETWORK_ID]
    const active = setState.styles[setState.activeStyleId]
    expect(active.name).toBe('Publication')
  })

  it('renames the current style via the dialog', () => {
    render(<StyleManager networkId={NETWORK_ID} />)
    fireEvent.click(screen.getByTestId('style-manager-menu-button'))
    fireEvent.click(screen.getByTestId('style-manager-rename-menu-item'))

    const input = screen.getByTestId('style-name-input')
    fireEvent.change(input, { target: { value: 'Renamed' } })
    fireEvent.click(screen.getByTestId('style-name-confirm-button'))

    const setState = useVisualStyleStore.getState().styleSets[NETWORK_ID]
    expect(setState.styles[setState.activeStyleId].name).toBe('Renamed')
  })

  it('deletes the current style after confirmation when several exist', () => {
    act(() => {
      const newId = useVisualStyleStore
        .getState()
        .createStyle(NETWORK_ID, 'Doomed')
      useVisualStyleStore.getState().switchStyle(NETWORK_ID, newId as IdType)
    })
    render(<StyleManager networkId={NETWORK_ID} />)
    fireEvent.click(screen.getByTestId('style-manager-menu-button'))
    fireEvent.click(screen.getByTestId('style-manager-delete-menu-item'))
    fireEvent.click(
      screen.getByTestId('style-manager-delete-confirm-button'),
    )

    const setState = useVisualStyleStore.getState().styleSets[NETWORK_ID]
    const names = Object.values(setState.styles).map((entry) => entry.name)
    expect(names).toEqual(['Default'])
  })
})
