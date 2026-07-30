import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useUiStateStore } from '../../../data/hooks/stores/UiStateStore'
import { useUndoStore } from '../../../data/hooks/stores/UndoStore'
import { useVisualStyleStore } from '../../../data/hooks/stores/VisualStyleStore'
import { useWorkspaceStore } from '../../../data/hooks/stores/WorkspaceStore'
import { useUndoStack } from '../../../data/hooks/useUndoStack'
import { IdType } from '../../../models/IdType'
import { createVisualStyle } from '../../../models/VisualStyleModel/impl/visualStyleFnImpl'
import { StyleManager } from './StyleManager'

vi.mock('./preview/renderStylePreview', () => ({
  renderStylePreview: vi.fn().mockResolvedValue('data:image/png;base64,stub'),
  resetStylePreviewForTesting: vi.fn(),
}))

const NETWORK_ID: IdType = 'undo-e2e-network'

/**
 * Stands in for the Edit menu: reads the undo stack and drives undo/redo exactly
 * as UndoMenuItem/RedoMenuItem do, including its own disabled calculation.
 *
 * The point is that this component infers the target network the same way the
 * real menu does, INDEPENDENTLY of the networkId prop StyleManager was given. A
 * mismatch between where an edit is filed and where undo looks for it is
 * invisible to a test that drives the store directly.
 */
const FakeEditMenu = (): React.ReactElement => {
  const { undoLastEdit, redoLastEdit } = useUndoStack()
  const activeNetworkId = useUiStateStore((state) => state.ui.activeNetworkView)
  const currentNetworkId = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )
  const targetNetworkId =
    activeNetworkId === undefined || activeNetworkId === ''
      ? currentNetworkId
      : activeNetworkId
  const stack = useUndoStore(
    (state) => state.undoRedoStacks[targetNetworkId],
  ) ?? { undoStack: [], redoStack: [] }

  return (
    <>
      <button
        data-testid="fake-undo"
        disabled={stack.undoStack.length === 0}
        onClick={() => undoLastEdit()}
      >
        {stack.undoStack[stack.undoStack.length - 1]?.description ?? 'Undo'}
      </button>
      <button
        data-testid="fake-redo"
        disabled={stack.redoStack.length === 0}
        onClick={() => redoLastEdit()}
      >
        Redo
      </button>
    </>
  )
}

const activeStyleId = (): IdType =>
  useVisualStyleStore.getState().styleSets[NETWORK_ID].activeStyleId

describe('StyleManager undo, end to end through the Edit menu', () => {
  let publicationId: IdType
  let defaultId: IdType

  beforeEach(() => {
    act(() => {
      useUndoStore.getState().deleteAllStacks()
      useVisualStyleStore.getState().deleteAll()
      useVisualStyleStore.getState().add(NETWORK_ID, createVisualStyle())
      // The app's steady state: the Vizmapper's networkId prop and the network
      // the Edit menu infers are the same.
      useWorkspaceStore.getState().setCurrentNetworkId(NETWORK_ID)
      useUiStateStore.getState().setActiveNetworkView('')
      publicationId = useVisualStyleStore
        .getState()
        .createStyle(NETWORK_ID, 'Publication') as IdType
    })
    defaultId = activeStyleId()
  })

  const switchViaPicker = (styleId: IdType): void => {
    fireEvent.click(screen.getByTestId('style-manager-picker-button'))
    fireEvent.click(screen.getByTestId(`style-picker-local-${styleId}`))
  }

  it('enables Undo with the switch description after switching', () => {
    render(
      <>
        <StyleManager networkId={NETWORK_ID} />
        <FakeEditMenu />
      </>,
    )
    expect(screen.getByTestId('fake-undo').hasAttribute('disabled')).toBe(true)

    switchViaPicker(publicationId)

    // If the edit were filed against a different network's stack, the menu item
    // would simply stay disabled — which reads as "undo does not work".
    expect(screen.getByTestId('fake-undo').hasAttribute('disabled')).toBe(false)
    expect(screen.getByTestId('fake-undo').textContent).toBe(
      'Switch style to "Publication"',
    )
  })

  it('reverts the active style when Undo is clicked', () => {
    render(
      <>
        <StyleManager networkId={NETWORK_ID} />
        <FakeEditMenu />
      </>,
    )

    switchViaPicker(publicationId)
    expect(activeStyleId()).toBe(publicationId)

    fireEvent.click(screen.getByTestId('fake-undo'))

    expect(activeStyleId()).toBe(defaultId)
  })

  it('redoes the switch', () => {
    render(
      <>
        <StyleManager networkId={NETWORK_ID} />
        <FakeEditMenu />
      </>,
    )

    switchViaPicker(publicationId)
    fireEvent.click(screen.getByTestId('fake-undo'))
    fireEvent.click(screen.getByTestId('fake-redo'))

    expect(activeStyleId()).toBe(publicationId)
  })

  it('works when the Vizmapper targets a non-current network', () => {
    // A HierarchyViewer subnetwork: ui.activeNetworkView drives the Vizmapper,
    // and the Edit menu follows the same value. Both must agree on the stack.
    act(() => {
      useWorkspaceStore.getState().setCurrentNetworkId('some-other-network')
      useUiStateStore.getState().setActiveNetworkView(NETWORK_ID)
    })
    render(
      <>
        <StyleManager networkId={NETWORK_ID} />
        <FakeEditMenu />
      </>,
    )

    switchViaPicker(publicationId)
    expect(screen.getByTestId('fake-undo').hasAttribute('disabled')).toBe(false)

    fireEvent.click(screen.getByTestId('fake-undo'))

    expect(activeStyleId()).toBe(defaultId)
  })
})
