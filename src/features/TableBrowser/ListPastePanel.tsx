import { Box, MenuItem, TextField, Typography } from '@mui/material'
import { useEffect, useMemo, useState } from 'react'

import { ValueTypeName } from '../../models/TableModel/ValueTypeName'
import { serializedStringIsValid } from '../../models/TableModel/impl/valueTypeImpl'
import { elementType } from './utils/listCellEditor'
import {
  ALL_DELIMITERS,
  DELIMITER_LABELS,
  detectDelimiter,
  parsePastedItems,
  PasteDelimiter,
  segmentPastedText,
} from './utils/listPasteParser'

interface ListPastePanelProps {
  listType: ValueTypeName
  /** Called whenever the parsed items change. */
  onParsedItemsChange?: (items: string[]) => void
}

// Semi-transparent so they read well in both light and dark themes.
const TOKEN_BG = 'rgba(102, 187, 106, 0.28)' // pale green — recognized item
const DELIM_BG = 'rgba(66, 165, 245, 0.34)' // blue — separator
const INVALID_BG = 'rgba(239, 83, 80, 0.30)' // red — invalid value

const LegendSwatch = ({
  color,
  label,
}: {
  color: string
  label: string
}): JSX.Element => (
  <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, mr: 1.5 }}>
    <Box
      sx={{
        width: 12,
        height: 12,
        borderRadius: 0.5,
        backgroundColor: color,
        flexShrink: 0,
      }}
    />
    <Typography variant="caption" color="text.secondary">
      {label}
    </Typography>
  </Box>
)

/**
 * "Paste items" panel for the list editor (CW-563). Users paste a blob of text
 * and see how it is split: recognized items are highlighted green and the
 * separators blue (invalid values for typed lists turn red). The separator is
 * auto-detected but can be overridden. Parsed items are folded into the editor
 * rows via Append or Replace; the stored model stays a plain list regardless of
 * the chosen separator.
 */
export const ListPastePanel = ({
  listType,
  onParsedItemsChange,
}: ListPastePanelProps): JSX.Element => {
  const [pasteText, setPasteText] = useState('')
  const [override, setOverride] = useState<'auto' | PasteDelimiter>('auto')

  const singleType = elementType(listType)
  const isStringList = singleType === ValueTypeName.String

  const placeholder = useMemo(() => {
    switch (singleType) {
      case ValueTypeName.Boolean:
        return 'e.g.\ntrue\nfalse\ntrue'
      case ValueTypeName.Integer:
      case ValueTypeName.Long:
        return 'e.g.\n10\n20\n30'
      case ValueTypeName.Double:
        return 'e.g.\n1.5\n2.0\n3.25'
      default:
        return 'e.g.\nalice\nbob\ncarol'
    }
  }, [singleType])

  const detected = detectDelimiter(pasteText)
  const delimiter: PasteDelimiter = override === 'auto' ? detected : override

  const segments = useMemo(
    () => segmentPastedText(pasteText, delimiter),
    [pasteText, delimiter],
  )

  const isTokenValid = (token: string): boolean => {
    const trimmed = token.trim()
    if (trimmed.length === 0) return true
    if (isStringList) return true
    return serializedStringIsValid(singleType, trimmed)
  }

  const items = useMemo(
    () => parsePastedItems(pasteText, delimiter),
    [pasteText, delimiter],
  )

  useEffect(() => {
    onParsedItemsChange?.(items)
  }, [items, onParsedItemsChange])

  const invalidCount = segments.filter(
    (s) =>
      s.type === 'token' && s.text.trim().length > 0 && !isTokenValid(s.text),
  ).length

  const showInvalidLegend = !isStringList

  return (
    <Box sx={{ mt: 1 }}>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: 'block' }}
      >
        Paste a list of values below. The text is split into items using the
        separator you choose; items are always stored as a list. Tip: use New
        line if your values contain commas.
      </Typography>

      <TextField
        select
        size="small"
        label="Separator"
        value={override}
        onChange={(e) => setOverride(e.target.value as 'auto' | PasteDelimiter)}
        sx={{ mt: 1, minWidth: 200, display: 'block' }}
        inputProps={{ 'data-testid': 'list-paste-separator-select' }}
      >
        <MenuItem value="auto">
          Auto-detect ({DELIMITER_LABELS[detected]})
        </MenuItem>
        {ALL_DELIMITERS.map((d) => (
          <MenuItem key={d} value={d}>
            {DELIMITER_LABELS[d]}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        multiline
        minRows={3}
        maxRows={8}
        fullWidth
        placeholder={placeholder}
        value={pasteText}
        onChange={(e) => setPasteText(e.target.value)}
        sx={{ mt: 1 }}
        inputProps={{ 'data-testid': 'list-paste-textarea' }}
      />

      {pasteText.length > 0 ? (
        <Box sx={{ mt: 1 }}>
          <Box sx={{ mb: 0.5 }}>
            <LegendSwatch color={TOKEN_BG} label="item" />
            <LegendSwatch color={DELIM_BG} label="separator" />
            {showInvalidLegend ? (
              <LegendSwatch color={INVALID_BG} label="invalid" />
            ) : null}
          </Box>
          <Box
            data-testid="list-paste-preview"
            sx={{
              p: 1,
              borderRadius: 1,
              border: (theme) => `1px solid ${theme.palette.divider}`,
              fontFamily: 'monospace',
              fontSize: 13,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              maxHeight: 140,
              overflowY: 'auto',
            }}
          >
            {segments.map((seg, i) => (
              <Box
                key={i}
                component="span"
                sx={{
                  backgroundColor:
                    seg.type === 'delimiter'
                      ? DELIM_BG
                      : isTokenValid(seg.text)
                        ? TOKEN_BG
                        : INVALID_BG,
                  borderRadius: 0.5,
                  px: 0.25,
                  mx: '1px',
                }}
              >
                {seg.display}
              </Box>
            ))}
          </Box>
          <Typography
            variant="caption"
            color={invalidCount > 0 ? 'error' : 'text.secondary'}
            sx={{ display: 'block', mt: 0.5 }}
            data-testid="list-paste-count"
          >
            {items.length} item{items.length === 1 ? '' : 's'} recognized
            {invalidCount > 0
              ? ` · ${invalidCount} invalid ${singleType} value${
                  invalidCount === 1 ? '' : 's'
                }`
              : ''}
          </Typography>
        </Box>
      ) : null}
    </Box>
  )
}

export default ListPastePanel
