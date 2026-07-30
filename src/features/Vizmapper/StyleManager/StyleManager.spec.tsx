import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useUndoStore } from '../../../data/hooks/stores/UndoStore'
import { useVisualStyleStore } from '../../../data/hooks/stores/VisualStyleStore'
import { useWorkspaceStore } from '../../../data/hooks/stores/WorkspaceStore'
import { IdType } from '../../../models/IdType'
import { UndoCommandType } from '../../../models/StoreModel/UndoStoreModel'
import { createVisualStyle } from '../../../models/VisualStyleModel/impl/visualStyleFnImpl'
import { StyleManager } from './StyleManager'

// jsdom has no canvas, so the real renderer cannot rasterize — and spinning up
// cytoscape here would only make these tests slow and noisy.
vi.mock('./preview/renderStylePreview', () => ({
  renderStylePreview: vi.fn().mockResolvedValue('data:image/png;base64,stub'),
  resetStylePreviewForTesting: vi.fn(),
}))

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

  describe('style picker', () => {
    const addSecondStyle = (name: string): IdType => {
      let newId: IdType | undefined
      act(() => {
        newId = useVisualStyleStore.getState().createStyle(NETWORK_ID, name)
      })
      return newId as IdType
    }

    it('shows the active style name and opens the picker on click', () => {
      render(<StyleManager networkId={NETWORK_ID} />)

      expect(screen.getByTestId('style-manager-active-name').textContent).toBe(
        'Default',
      )
      expect(screen.queryByTestId('style-picker-dialog')).toBeNull()

      fireEvent.click(screen.getByTestId('style-manager-picker-button'))

      expect(screen.getByTestId('style-picker-dialog')).toBeDefined()
    })

    it('switches style from a tile and records an undoable edit', () => {
      const publicationId = addSecondStyle('Publication')
      render(<StyleManager networkId={NETWORK_ID} />)

      fireEvent.click(screen.getByTestId('style-manager-picker-button'))
      fireEvent.click(screen.getByTestId(`style-picker-local-${publicationId}`))

      expect(
        useVisualStyleStore.getState().styleSets[NETWORK_ID].activeStyleId,
      ).toBe(publicationId)

      // The switch is on the undo stack rather than having wiped it, and only
      // ids travel — never style content.
      const stack = useUndoStore.getState().undoRedoStacks[NETWORK_ID].undoStack
      const lastEdit = stack[stack.length - 1]
      expect(lastEdit.undoCommand).toBe(UndoCommandType.SWITCH_STYLE)
      expect(lastEdit.description).toBe('Switch style to "Publication"')
      expect(lastEdit.redoParams).toEqual([NETWORK_ID, publicationId])
      expect(lastEdit.undoParams[1]).not.toBe(publicationId)
    })

    it('closes the picker after switching', async () => {
      const publicationId = addSecondStyle('Publication')
      render(<StyleManager networkId={NETWORK_ID} />)

      fireEvent.click(screen.getByTestId('style-manager-picker-button'))
      fireEvent.click(screen.getByTestId(`style-picker-local-${publicationId}`))

      // waitFor, not a bare assertion: the Dialog stays mounted for the length
      // of its exit transition.
      await waitFor(() =>
        expect(screen.queryByTestId('style-picker-dialog')).toBeNull(),
      )
    })

    it('renames the style a tile menu targeted, not the active one', () => {
      // The rename dialog is shared with the MoreVert menu, which always means
      // "the active style" — a tile has to be able to override that target.
      const publicationId = addSecondStyle('Publication')
      render(<StyleManager networkId={NETWORK_ID} />)

      fireEvent.click(screen.getByTestId('style-manager-picker-button'))
      fireEvent.click(
        screen.getByTestId(`style-picker-local-${publicationId}-menu-button`),
      )
      fireEvent.click(
        screen.getByTestId(`style-picker-local-${publicationId}-action-Rename`),
      )
      fireEvent.change(screen.getByTestId('style-name-input'), {
        target: { value: 'Renamed From Tile' },
      })
      fireEvent.click(screen.getByTestId('style-name-confirm-button'))

      const setState = useVisualStyleStore.getState().styleSets[NETWORK_ID]
      expect(setState.styles[publicationId].name).toBe('Renamed From Tile')
      // The active style is untouched.
      expect(setState.styles[setState.activeStyleId].name).toBe('Default')
    })

    it('does not switch style when a tile menu is opened', () => {
      const publicationId = addSecondStyle('Publication')
      render(<StyleManager networkId={NETWORK_ID} />)
      const activeBefore =
        useVisualStyleStore.getState().styleSets[NETWORK_ID].activeStyleId

      fireEvent.click(screen.getByTestId('style-manager-picker-button'))
      fireEvent.click(
        screen.getByTestId(`style-picker-local-${publicationId}-menu-button`),
      )

      // Without stopPropagation on the menu button the tile's own click handler
      // would apply the style as a side effect of opening its menu.
      expect(
        useVisualStyleStore.getState().styleSets[NETWORK_ID].activeStyleId,
      ).toBe(activeBefore)
    })
  })
})
