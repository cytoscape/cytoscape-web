import SearchIcon from '@mui/icons-material/Search'
import {
  Box,
  Button,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  TextField,
  Typography,
} from '@mui/material'
import { useEffect, useMemo, useState } from 'react'

import { CyDialog } from '@/components/CyDialog'
import { getStyleSetMetadataFromDb, getVisualStyleSetFromDb } from '@/data/db'
import { useNetworkSummaryStore } from '@/data/hooks/stores/NetworkSummaryStore'
import { useStyleLibraryStore } from '@/data/hooks/stores/StyleLibraryStore'
import { useVisualStyleStore } from '@/data/hooks/stores/VisualStyleStore'
import { useWorkspaceStore } from '@/data/hooks/stores/WorkspaceStore'
import { logUi } from '@/debug'
import { IdType } from '@/models/IdType'
import { VisualStyle } from '@/models/VisualStyleModel'
import { PRESET_VISUAL_STYLES } from '@/models/VisualStyleModel/impl/presetVisualStyles'
import { useStylePreviewSample } from './preview/useStylePreviewSample'
import { styleFingerprint } from './styleFingerprint'
import { copiedStyleName } from './styleNaming'
import { StyleTile, StyleTileAction } from './StyleTile'

export interface StylePickerDialogProps {
  open: boolean
  networkId: IdType
  onClose: () => void
  /** Switch the active style of this network. Records an undoable edit. */
  onSwitch: (styleId: IdType) => void
  /** Copy a style that belongs to something else into this network. */
  onCopyIn: (name: string, visualStyle: VisualStyle) => void
  onRename: (styleId: IdType) => void
  onDuplicate: (styleId: IdType) => void
  onDelete: (styleId: IdType) => void
}

interface ForeignStyle {
  networkId: IdType
  styleId: IdType
  name: string
  /** Filled in once the network's row has been deserialized. */
  visualStyle?: VisualStyle
}

/** A ForeignStyle with its network's display name resolved at render time. */
interface NamedForeignStyle extends ForeignStyle {
  networkName: string
}

const matches = (name: string, query: string): boolean =>
  query.trim() === '' || name.toLowerCase().includes(query.trim().toLowerCase())

const Section = (props: {
  title: string
  hint: string
  children: React.ReactNode
  testId: string
}): React.ReactElement => (
  <Box sx={{ mb: 2 }} data-testid={props.testId}>
    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
      {props.title}
    </Typography>
    {/* The hint carries the semantics: clicking in one section switches the
        active style, clicking in another copies a style in. Without it the two
        look like the same gesture. */}
    <Typography
      variant="caption"
      sx={{ color: 'text.secondary', display: 'block', mb: 0.75 }}
    >
      {props.hint}
    </Typography>
    <Box
      role="listbox"
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
        gap: 1,
      }}
    >
      {props.children}
    </Box>
  </Box>
)

/**
 * Modal style picker: a thumbnail grid of every style available to this network.
 *
 * Three sections, because Cytoscape Web scopes a style to ONE network and moving
 * one across networks copies it (MULTIPLE_VISUAL_STYLES.md §1). Cytoscape
 * Desktop pools every style into a single flat list, which it can do only
 * because its styles are session-global and shared live. Here the sections are
 * what tell the user whether a click switches or copies.
 */
export const StylePickerDialog = (
  props: StylePickerDialogProps,
): React.ReactElement => {
  const {
    open,
    networkId,
    onClose,
    onSwitch,
    onCopyIn,
    onRename,
    onDuplicate,
    onDelete,
  } = props

  const styleSet = useVisualStyleStore((state) => state.styleSets[networkId])
  const activeVisualStyle = useVisualStyleStore(
    (state) => state.visualStyles[networkId],
  )
  const templates = useStyleLibraryStore((state) => state.templates)
  const hydrateLibrary = useStyleLibraryStore((state) => state.hydrate)
  const summaries = useNetworkSummaryStore((state) => state.summaries)
  const networkIds = useWorkspaceStore((state) => state.workspace.networkIds)

  const sample = useStylePreviewSample(networkId)

  const [query, setQuery] = useState('')
  const [foreign, setForeign] = useState<ForeignStyle[]>([])
  const [unopenedCount, setUnopenedCount] = useState(0)

  useEffect(() => {
    if (open) {
      void hydrateLibrary()
    }
  }, [open, hydrateLibrary])

  // Reset the query on each open: a stale filter from last time reads as an
  // empty picker.
  useEffect(() => {
    if (open) {
      setQuery('')
    }
  }, [open])

  useEffect(() => {
    if (!open) {
      return
    }
    let active = true
    const otherIds = networkIds.filter((id) => id !== networkId)

    const load = async (): Promise<void> => {
      // Names only — cheap, no style deserialization (see
      // getStyleSetMetadataFromDb).
      const metadata = await getStyleSetMetadataFromDb(otherIds)
      if (!active) {
        return
      }
      const entries: ForeignStyle[] = metadata.flatMap((meta) =>
        meta.styles.map((style) => ({
          networkId: meta.networkId,
          styleId: style.id,
          name: style.name,
        })),
      )
      setForeign(entries)
      // A network with no row has never been opened, so its style exists only
      // in the CX2 on the server. Reported rather than silently missing.
      setUnopenedCount(otherIds.length - metadata.length)

      // Now the content, one network at a time, so thumbnails can appear.
      for (const meta of metadata) {
        const loaded = await getVisualStyleSetFromDb(meta.networkId)
        if (!active) {
          return
        }
        if (loaded === undefined) {
          continue
        }
        setForeign((current) =>
          current.map((entry) =>
            entry.networkId === meta.networkId
              ? {
                  ...entry,
                  // Falls back to the active style: a legacy row reports a
                  // sentinel id that cannot be looked up (see LEGACY_STYLE_ID).
                  visualStyle:
                    loaded.styles[entry.styleId]?.visualStyle ??
                    loaded.styles[loaded.activeStyleId]?.visualStyle,
                }
              : entry,
          ),
        )
      }
    }

    void load().catch((e) => {
      logUi.warn(
        '[StylePickerDialog]: Failed to load styles of other networks',
        e,
      )
    })

    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `summaries` is
    // read only for display names, which are resolved at render below. Listing
    // it here re-ran the whole IndexedDB metadata-and-style load every time any
    // network summary changed.
  }, [open, networkId, networkIds])

  // Names resolved here rather than captured in the effect, so a summary
  // arriving late updates the label without re-reading IndexedDB.
  const namedForeign: NamedForeignStyle[] = useMemo(
    () =>
      foreign.map((entry) => ({
        ...entry,
        networkName: summaries[entry.networkId]?.name ?? entry.networkId,
      })),
    [foreign, summaries],
  )

  const localEntries = useMemo(() => {
    if (styleSet === undefined) {
      return []
    }
    return Object.values(styleSet.styles).map((entry) => ({
      id: entry.id,
      name: entry.name,
      isActive: entry.id === styleSet.activeStyleId,
      // The ACTIVE entry's content lives in the working copy, not in the set
      // (MULTIPLE_VISUAL_STYLES.md §2).
      visualStyle:
        entry.id === styleSet.activeStyleId
          ? activeVisualStyle
          : entry.visualStyle,
    }))
  }, [styleSet, activeVisualStyle])

  /**
   * Fingerprints of everything this network already owns.
   *
   * Copying is a copy, not a reference, so once a style has been pulled in from
   * network B it sits in this network forever — and B's picker then lists this
   * network's copy beside B's original, identical in every respect. Without this
   * the list grows a duplicate for every copy ever made.
   */
  const localFingerprints = useMemo(
    () =>
      new Set(
        localEntries
          .map((entry) =>
            entry.visualStyle === undefined
              ? undefined
              : styleFingerprint(entry.visualStyle),
          )
          .filter((value): value is string => value !== undefined),
      ),
    [localEntries],
  )

  const visibleLocal = localEntries.filter((entry) =>
    matches(entry.name, query),
  )
  // Matches the network name as well as the style name: the network is what the
  // tile leads with, so it is what a reader will type.
  const matchingForeign = namedForeign.filter(
    (entry) => matches(entry.name, query) || matches(entry.networkName, query),
  )
  // An entry is only judged a duplicate once its content has loaded; until then
  // it stays visible with a spinner.
  const duplicateForeign = matchingForeign.filter(
    (entry) =>
      entry.visualStyle !== undefined &&
      localFingerprints.has(styleFingerprint(entry.visualStyle)),
  )
  const visibleForeign = matchingForeign.filter(
    (entry) => !duplicateForeign.includes(entry),
  )
  const visibleTemplates = Object.values(templates).filter((template) =>
    matches(template.name, query),
  )
  // Deliberately NOT de-duplicated against this network's styles, unlike the
  // foreign section. That list grows without bound as copies accumulate; this one
  // is a fixed catalogue, and an entry vanishing from it because you happen to
  // have applied it once reads as the catalogue being broken.
  const visiblePresets = PRESET_VISUAL_STYLES.filter(
    (preset) =>
      matches(preset.name, query) || matches(preset.description, query),
  )

  const localActions = (entry: {
    id: IdType
    name: string
  }): StyleTileAction[] => [
    { label: 'Rename', onSelect: () => onRename(entry.id) },
    { label: 'Duplicate', onSelect: () => onDuplicate(entry.id) },
    {
      label: 'Delete',
      onSelect: () => onDelete(entry.id),
      // A network must always keep at least one style.
      disabled: localEntries.length <= 1,
    },
  ]

  const nothingMatches =
    visibleLocal.length === 0 &&
    visibleForeign.length === 0 &&
    visibleTemplates.length === 0 &&
    visiblePresets.length === 0

  return (
    <CyDialog
      open={open}
      fullWidth
      maxWidth="md"
      data-testid="style-picker-dialog"
    >
      <DialogTitle sx={{ pb: 1 }}>Styles</DialogTitle>
      <DialogContent>
        <TextField
          size="small"
          fullWidth
          autoFocus
          placeholder="Search styles"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          sx={{ mb: 2 }}
          inputProps={{ 'data-testid': 'style-picker-search' }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />

        {visibleLocal.length > 0 && (
          <Section
            title="This Network"
            hint="Click to make active"
            testId="style-picker-section-local"
          >
            {visibleLocal.map((entry) => (
              <StyleTile
                key={entry.id}
                name={entry.name}
                visualStyle={entry.visualStyle}
                sample={sample}
                selected={entry.isActive}
                onClick={() => onSwitch(entry.id)}
                actions={localActions(entry)}
                testId={`style-picker-local-${entry.id}`}
              />
            ))}
          </Section>
        )}

        {visibleForeign.length > 0 && (
          <Section
            title="Other Networks"
            hint="Click to copy into this network — the original is not changed"
            testId="style-picker-section-foreign"
          >
            {visibleForeign.map((entry) => (
              <StyleTile
                key={`${entry.networkId}:${entry.styleId}`}
                // Network first, style name second — the reverse of what reads
                // naturally, because almost every network's style is called
                // "Default" and the network is the only part that identifies it.
                // The style name stays as the secondary line so two styles from
                // one network ("Default", "Default 2") remain distinguishable.
                name={entry.networkName}
                provenance={entry.name}
                visualStyle={entry.visualStyle}
                sample={sample}
                selected={false}
                onClick={() => {
                  if (entry.visualStyle !== undefined) {
                    onCopyIn(
                      copiedStyleName(entry.name, entry.networkName),
                      entry.visualStyle,
                    )
                  }
                }}
                testId={`style-picker-foreign-${entry.networkId}-${entry.styleId}`}
              />
            ))}
          </Section>
        )}

        {visibleTemplates.length > 0 && (
          <Section
            title="Library"
            hint="Click to copy into this network"
            testId="style-picker-section-library"
          >
            {visibleTemplates.map((template) => (
              <StyleTile
                key={template.id}
                name={template.name}
                visualStyle={template.visualStyle}
                sample={sample}
                selected={false}
                onClick={() => onCopyIn(template.name, template.visualStyle)}
                testId={`style-picker-library-${template.id}`}
              />
            ))}
          </Section>
        )}

        {visiblePresets.length > 0 && (
          <Section
            title="General Styles"
            hint="Click to copy into this network"
            testId="style-picker-section-presets"
          >
            {visiblePresets.map((preset) => (
              <StyleTile
                key={preset.id}
                name={preset.name}
                provenance={preset.description}
                visualStyle={preset.visualStyle}
                sample={sample}
                selected={false}
                onClick={() => onCopyIn(preset.name, preset.visualStyle)}
                testId={`style-picker-preset-${preset.id}`}
              />
            ))}
          </Section>
        )}

        {nothingMatches && (
          <Typography
            variant="body2"
            sx={{ color: 'text.secondary', py: 2 }}
            data-testid="style-picker-no-matches"
          >
            No styles match &ldquo;{query}&rdquo;.
          </Typography>
        )}

        {duplicateForeign.length > 0 && (
          <Typography
            variant="caption"
            sx={{ color: 'text.secondary', display: 'block', mt: 1 }}
            data-testid="style-picker-duplicates-note"
          >
            {/* Said out loud rather than silently filtered: a list that quietly
                drops entries reads as a bug the first time someone counts. */}
            {duplicateForeign.length} style
            {duplicateForeign.length === 1 ? '' : 's'} from other networks{' '}
            {duplicateForeign.length === 1 ? 'is' : 'are'} hidden because this
            network already has an identical copy.
          </Typography>
        )}

        {unopenedCount > 0 && (
          <Typography
            variant="caption"
            sx={{ color: 'text.secondary', display: 'block', mt: 1 }}
            data-testid="style-picker-unopened-note"
          >
            {unopenedCount} network{unopenedCount === 1 ? '' : 's'} in this
            workspace {unopenedCount === 1 ? 'has' : 'have'} not been opened
            yet, so {unopenedCount === 1 ? 'its' : 'their'} styles are not
            available here.
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} data-testid="style-picker-close-button">
          Close
        </Button>
      </DialogActions>
    </CyDialog>
  )
}
