import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useNetworkSummaryStore } from '../../../data/hooks/stores/NetworkSummaryStore'
import { useStyleLibraryStore } from '../../../data/hooks/stores/StyleLibraryStore'
import { useVisualStyleStore } from '../../../data/hooks/stores/VisualStyleStore'
import { useWorkspaceStore } from '../../../data/hooks/stores/WorkspaceStore'
import { IdType } from '../../../models/IdType'
import { PRESET_VISUAL_STYLES } from '../../../models/VisualStyleModel/impl/presetVisualStyles'
import { createVisualStyle } from '../../../models/VisualStyleModel/impl/visualStyleFnImpl'
import { StylePickerDialog } from './StylePickerDialog'

// jsdom cannot rasterize a canvas, so the real renderer is stubbed; the tiles'
// job here is to appear and be clickable, not to draw.
vi.mock('./preview/renderStylePreview', () => ({
  renderStylePreview: vi.fn().mockResolvedValue('data:image/png;base64,stub'),
  resetStylePreviewForTesting: vi.fn(),
}))

const { getStyleSetMetadataFromDb, getVisualStyleSetFromDb } = vi.hoisted(
  () => ({
    getStyleSetMetadataFromDb: vi.fn(),
    getVisualStyleSetFromDb: vi.fn(),
  }),
)

vi.mock('../../../data/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../data/db')>()
  const mocked: Record<string, any> = { ...actual }
  for (const key of Object.keys(actual)) {
    if (
      key.startsWith('put') ||
      key.startsWith('delete') ||
      key.startsWith('clear')
    ) {
      mocked[key] = vi.fn().mockResolvedValue(undefined)
    }
  }
  mocked.getStyleSetMetadataFromDb = getStyleSetMetadataFromDb
  mocked.getVisualStyleSetFromDb = getVisualStyleSetFromDb
  return mocked
})

const NETWORK_ID: IdType = 'picker-network'
const OTHER_NETWORK_ID: IdType = 'other-network'

const noopHandlers = {
  onClose: vi.fn(),
  onSwitch: vi.fn(),
  onCopyIn: vi.fn(),
  onRename: vi.fn(),
  onDuplicate: vi.fn(),
  onDelete: vi.fn(),
}

const renderDialog = (
  overrides: Partial<typeof noopHandlers> = {},
): typeof noopHandlers => {
  const handlers = { ...noopHandlers, ...overrides }
  render(<StylePickerDialog open networkId={NETWORK_ID} {...handlers} />)
  return handlers
}

describe('StylePickerDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getStyleSetMetadataFromDb.mockResolvedValue([])
    getVisualStyleSetFromDb.mockResolvedValue(undefined)
    act(() => {
      useVisualStyleStore.getState().deleteAll()
      useVisualStyleStore.getState().add(NETWORK_ID, createVisualStyle())
      useStyleLibraryStore.setState({ templates: {} })
      useWorkspaceStore.getState().setCurrentNetworkId(NETWORK_ID)
    })
  })

  const activeStyleId = (): IdType =>
    useVisualStyleStore.getState().styleSets[NETWORK_ID].activeStyleId

  it('lists this network styles and marks the active one', async () => {
    renderDialog()

    const tile = screen.getByTestId(`style-picker-local-${activeStyleId()}`)
    expect(tile.getAttribute('aria-selected')).toBe('true')
    expect(
      screen.getByTestId(
        `style-picker-local-${activeStyleId()}-selected-badge`,
      ),
    ).toBeDefined()
    // Rendered through the (stubbed) preview pipeline rather than left blank.
    await waitFor(() =>
      expect(
        screen.getByTestId(`style-picker-local-${activeStyleId()}-thumbnail`),
      ).toBeDefined(),
    )
  })

  it('switches on click', () => {
    const handlers = renderDialog()

    fireEvent.click(screen.getByTestId(`style-picker-local-${activeStyleId()}`))

    expect(handlers.onSwitch).toHaveBeenCalledWith(activeStyleId())
  })

  it('filters every section by the search query', () => {
    act(() => {
      useVisualStyleStore.getState().createStyle(NETWORK_ID, 'Publication')
    })
    renderDialog()

    fireEvent.change(screen.getByTestId('style-picker-search'), {
      target: { value: 'publi' },
    })

    expect(screen.getByText('Publication')).toBeDefined()
    expect(screen.queryByText('Default')).toBeNull()
  })

  it('reports when nothing matches instead of showing an empty grid', () => {
    renderDialog()

    fireEvent.change(screen.getByTestId('style-picker-search'), {
      target: { value: 'nothing-like-this' },
    })

    expect(screen.getByTestId('style-picker-no-matches')).toBeDefined()
    expect(screen.queryByTestId('style-picker-section-local')).toBeNull()
  })

  it('offers library templates as copies, not switches', () => {
    const template = createVisualStyle()
    act(() => {
      useStyleLibraryStore.setState({
        templates: {
          'tpl-1': { id: 'tpl-1', name: 'Metallic', visualStyle: template },
        },
      })
    })
    const handlers = renderDialog()

    fireEvent.click(screen.getByTestId('style-picker-library-tpl-1'))

    expect(handlers.onCopyIn).toHaveBeenCalledWith('Metallic', template)
    expect(handlers.onSwitch).not.toHaveBeenCalled()
  })

  describe('general styles', () => {
    it('always offers the shipped catalogue', () => {
      // The point of the section: on a fresh workspace the only other option is
      // the single "Default" the current network arrived with.
      renderDialog()

      expect(screen.getByTestId('style-picker-section-presets')).toBeDefined()
      PRESET_VISUAL_STYLES.forEach((preset) => {
        expect(
          screen.getByTestId(`style-picker-preset-${preset.id}`),
        ).toBeDefined()
      })
    })

    it('copies a preset in rather than switching', () => {
      const preset = PRESET_VISUAL_STYLES[0]
      const handlers = renderDialog()

      fireEvent.click(screen.getByTestId(`style-picker-preset-${preset.id}`))

      expect(handlers.onCopyIn).toHaveBeenCalledWith(
        preset.name,
        preset.visualStyle,
      )
      expect(handlers.onSwitch).not.toHaveBeenCalled()
    })

    it('matches a preset on its description as well as its name', () => {
      renderDialog()

      fireEvent.change(screen.getByTestId('style-picker-search'), {
        target: { value: 'projector' },
      })

      expect(
        screen.getByTestId('style-picker-preset-preset-high-contrast'),
      ).toBeDefined()
      expect(screen.queryByTestId('style-picker-no-matches')).toBeNull()
    })

    it('stays complete after a preset has been applied', () => {
      // NOT de-duplicated against this network's styles, unlike the foreign
      // section: a fixed catalogue losing entries as you use them reads as broken.
      const preset = PRESET_VISUAL_STYLES[0]
      act(() => {
        useVisualStyleStore
          .getState()
          .importStyle(NETWORK_ID, preset.name, preset.visualStyle)
      })
      renderDialog()

      expect(
        screen.getByTestId(`style-picker-preset-${preset.id}`),
      ).toBeDefined()
    })

    it('offers no management actions on a preset tile', () => {
      // They are code, not user data: nothing to rename or delete.
      const preset = PRESET_VISUAL_STYLES[0]
      renderDialog()

      expect(
        screen.queryByTestId(`style-picker-preset-${preset.id}-menu-button`),
      ).toBeNull()
    })
  })

  describe('other networks', () => {
    // Deliberately NOT a pristine createVisualStyle(): this network's own
    // "Default" is pristine too, and two pristine styles are byte-identical, so
    // the duplicate suppression below would (correctly) hide it.
    const foreignStyle = createVisualStyle()
    foreignStyle.nodeBackgroundColor.defaultValue = '#123456' as any

    beforeEach(() => {
      act(() => {
        useWorkspaceStore
          .getState()
          .addNetworkIds([NETWORK_ID, OTHER_NETWORK_ID])
        useNetworkSummaryStore.getState().addAll({
          [OTHER_NETWORK_ID]: { name: 'galFiltered' } as any,
        })
      })
      getStyleSetMetadataFromDb.mockResolvedValue([
        {
          networkId: OTHER_NETWORK_ID,
          activeStyleId: 'foreign-style',
          styles: [{ id: 'foreign-style', name: 'Big Labels' }],
        },
      ])
      getVisualStyleSetFromDb.mockResolvedValue({
        activeStyleId: 'foreign-style',
        styles: {
          'foreign-style': {
            id: 'foreign-style',
            name: 'Big Labels',
            visualStyle: foreignStyle,
          },
        },
      })
    })

    it('leads with the network, not the style name', async () => {
      // Almost every network's style is called "Default", so the network is the
      // only part that identifies it. The style name stays as the secondary line
      // so two styles from one network remain distinguishable.
      renderDialog()

      const testId = `style-picker-foreign-${OTHER_NETWORK_ID}-foreign-style`
      await waitFor(() => expect(screen.getByTestId(testId)).toBeDefined())
      expect(screen.getByTestId(`${testId}-name`).textContent).toBe(
        'galFiltered',
      )
      expect(screen.getByTestId(`${testId}-provenance`).textContent).toBe(
        'Big Labels',
      )
    })

    it('finds a style by its network name', async () => {
      renderDialog()
      const testId = `style-picker-foreign-${OTHER_NETWORK_ID}-foreign-style`
      await waitFor(() => expect(screen.getByTestId(testId)).toBeDefined())

      fireEvent.change(screen.getByTestId('style-picker-search'), {
        target: { value: 'galfil' },
      })

      // The network is what the tile leads with, so it is what a reader types.
      expect(screen.getByTestId(testId)).toBeDefined()
    })

    it('queries only the OTHER networks, never the current one', async () => {
      renderDialog()

      await waitFor(() => expect(getStyleSetMetadataFromDb).toHaveBeenCalled())
      expect(getStyleSetMetadataFromDb).toHaveBeenCalledWith([OTHER_NETWORK_ID])
    })

    it('copies rather than switches when one is clicked', async () => {
      const handlers = renderDialog()
      const testId = `style-picker-foreign-${OTHER_NETWORK_ID}-foreign-style`

      // Wait for the content read: a tile whose style has not loaded yet must
      // not fire a copy with an undefined style.
      await waitFor(() =>
        expect(screen.getByTestId(`${testId}-thumbnail`)).toBeDefined(),
      )
      fireEvent.click(screen.getByTestId(testId))

      expect(handlers.onCopyIn).toHaveBeenCalledWith('Big Labels', foreignStyle)
      expect(handlers.onSwitch).not.toHaveBeenCalled()
    })

    it('names a copy after its network when the style name says nothing', async () => {
      // Without this the copy arrives as another anonymous "Default 2" and every
      // trace of where it came from is gone.
      getStyleSetMetadataFromDb.mockResolvedValue([
        {
          networkId: OTHER_NETWORK_ID,
          activeStyleId: 'foreign-style',
          styles: [{ id: 'foreign-style', name: 'Default' }],
        },
      ])
      getVisualStyleSetFromDb.mockResolvedValue({
        activeStyleId: 'foreign-style',
        styles: {
          'foreign-style': {
            id: 'foreign-style',
            name: 'Default',
            visualStyle: foreignStyle,
          },
        },
      })
      const handlers = renderDialog()
      const testId = `style-picker-foreign-${OTHER_NETWORK_ID}-foreign-style`

      await waitFor(() =>
        expect(screen.getByTestId(`${testId}-thumbnail`)).toBeDefined(),
      )
      fireEvent.click(screen.getByTestId(testId))

      expect(handlers.onCopyIn).toHaveBeenCalledWith(
        'galFiltered',
        foreignStyle,
      )
    })

    it('hides a foreign style this network already has an identical copy of', async () => {
      // Copying is a copy, not a reference, so a style pulled in from another
      // network stays forever -- and that network's picker would then list this
      // network's identical copy beside its own original.
      const shared = createVisualStyle()
      act(() => {
        useVisualStyleStore
          .getState()
          .importStyle(NETWORK_ID, 'Copied Earlier', shared)
      })
      getVisualStyleSetFromDb.mockResolvedValue({
        activeStyleId: 'foreign-style',
        styles: {
          'foreign-style': {
            id: 'foreign-style',
            name: 'Big Labels',
            visualStyle: shared,
          },
        },
      })
      renderDialog()
      const testId = `style-picker-foreign-${OTHER_NETWORK_ID}-foreign-style`

      await waitFor(() =>
        expect(
          screen.getByTestId('style-picker-duplicates-note'),
        ).toBeDefined(),
      )
      expect(screen.queryByTestId(testId)).toBeNull()
      // Reported, not silently filtered.
      expect(
        screen.getByTestId('style-picker-duplicates-note').textContent,
      ).toContain('1 style')
    })

    it('keeps a foreign style whose content differs', async () => {
      renderDialog()
      const testId = `style-picker-foreign-${OTHER_NETWORK_ID}-foreign-style`

      await waitFor(() =>
        expect(screen.getByTestId(`${testId}-thumbnail`)).toBeDefined(),
      )
      expect(screen.queryByTestId('style-picker-duplicates-note')).toBeNull()
    })

    it('does nothing when clicked before its content has loaded', async () => {
      // Never resolves, so the tile stays in its loading state.
      getVisualStyleSetFromDb.mockReturnValue(new Promise(() => {}))
      const handlers = renderDialog()
      const testId = `style-picker-foreign-${OTHER_NETWORK_ID}-foreign-style`

      await waitFor(() => expect(screen.getByTestId(testId)).toBeDefined())
      fireEvent.click(screen.getByTestId(testId))

      expect(handlers.onCopyIn).not.toHaveBeenCalled()
    })

    it('reports networks that have never been opened', async () => {
      // No row in the DB, so the style exists only in the CX2 on the server.
      getStyleSetMetadataFromDb.mockResolvedValue([])
      renderDialog()

      await waitFor(() =>
        expect(screen.getByTestId('style-picker-unopened-note')).toBeDefined(),
      )
      expect(
        screen.getByTestId('style-picker-unopened-note').textContent,
      ).toContain('1 network')
    })
  })
})
