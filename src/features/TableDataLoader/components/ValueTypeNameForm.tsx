import {
  Autocomplete,
  Box,
  Button,
  ButtonGroup,
  TextField,
  Tooltip,
} from '@mui/material'

import { ValueTypeNameChip } from '@/components/ValueTypeNameChip'
import { ValueTypeName } from '../../../models/TableModel'
import { DelimiterType } from '../model/DelimiterType'
import { valueTypeNameLabel as valueTypeName2Label } from '../../../models/TableModel/impl/valueTypeNameDisplay'

export interface ValueTypeFormProps {
  value: ValueTypeName
  delimiter?: DelimiterType
  onChange: (nextValue: ValueTypeName, nextDelimiter?: DelimiterType) => void
  validValues: ValueTypeName[]
}

const compactButtonSx = {
  minWidth: 0,
  px: 0.75,
  py: 0.25,
  color: 'text.primary',
  borderColor: 'divider',
  textTransform: 'none',
} as const

// 'space' and 'tab' are display labels; the stored delimiter must be the
// actual character because parseValue() feeds it to String.split() directly.
const DELIMITER_SUGGESTIONS = ['|', ':', '\\', '/', ',', 'space', 'tab']
const DELIMITER_LABEL_TO_VALUE: Record<string, DelimiterType> = {
  space: DelimiterType.Space,
  tab: DelimiterType.Tab,
}
const DELIMITER_VALUE_TO_LABEL: Record<string, string> = {
  [DelimiterType.Space]: 'space',
  [DelimiterType.Tab]: 'tab',
}

function TypeButtonGroup(props: {
  types: ValueTypeName[]
  value: ValueTypeName
  validValues: ValueTypeName[]
  onSelect: (v: ValueTypeName) => void
}) {
  const { types, value, validValues, onSelect } = props
  return (
    <ButtonGroup size="small" variant="outlined">
      {types.map((v) => (
        <Tooltip key={v} title={valueTypeName2Label(v)}>
          <span>
            <Button
              sx={{
                ...compactButtonSx,
                opacity: !validValues.includes(v) ? 0.2 : 1,
                backgroundColor: v === value ? '#D6D6D6' : 'transparent',
              }}
              disabled={!validValues.includes(v)}
              onClick={() => onSelect(v)}
              variant="outlined"
              size="small"
            >
              <ValueTypeNameChip type={v} showTooltip={false} />
            </Button>
          </span>
        </Tooltip>
      ))}
    </ButtonGroup>
  )
}

export function ValueTypeForm(props: ValueTypeFormProps) {
  const { value, onChange, validValues } = props
  const allTypes = Object.values(ValueTypeName)

  return (
    <Box>
      <TypeButtonGroup
        types={allTypes.filter((x) => !x.startsWith('list_'))}
        value={value}
        validValues={validValues}
        onSelect={(v) => onChange(v)}
      />
      <Box sx={{ height: 24 }} />
      <TypeButtonGroup
        types={allTypes.filter((x) => x.startsWith('list_'))}
        value={value}
        validValues={validValues}
        onSelect={(v) => onChange(v, props.delimiter ?? '|')}
      />
      <Autocomplete
        freeSolo
        disableClearable
        disabled={!value?.startsWith('list_')}
        size="small"
        sx={{ width: 250, mt: 1.5 }}
        value={DELIMITER_VALUE_TO_LABEL[props.delimiter ?? '|'] ?? props.delimiter ?? '|'}
        onInputChange={(_, newValue) =>
          props.onChange(
            value,
            DELIMITER_LABEL_TO_VALUE[newValue] ?? (newValue as DelimiterType),
          )
        }
        options={DELIMITER_SUGGESTIONS}
        renderInput={(params) => (
          <TextField
            {...params}
            label="List Delimiter"
            placeholder="Select or type custom delimiter"
          />
        )}
      />
    </Box>
  )
}

/**
 * Data type badge plus its readable label, for the column header summary in
 * the import forms. The badge itself comes from the shared
 * {@link ValueTypeNameChip} so it matches the table browser headers and every
 * other data type surface (CW-562).
 */
export function ValueTypeNameRender(props: { value: ValueTypeName }) {
  return (
    <Button
      size="small"
      variant="outlined"
      startIcon={<ValueTypeNameChip type={props.value} showTooltip={false} />}
      sx={{ ...compactButtonSx, justifyContent: 'flex-start' }}
    >
      {valueTypeName2Label(props.value)}
    </Button>
  )
}
