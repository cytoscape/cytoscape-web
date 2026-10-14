import {
  Box,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormHelperText,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  SelectChangeEvent,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { useEffect, useRef, useState } from 'react'

import {
  AppParameter,
  ParameterValue,
} from '../../models/AppModel/AppParameter'
import {
  coerceParameterValue,
  parameterValueType,
  validateParameterValue,
} from '../../models/AppModel/impl/parameters'
import { ParameterUiType } from '../../models/AppModel/ParameterUiType'
import { ValueTypeName } from '../../models/TableModel'
import { Column } from '../../models/TableModel'
import { columnChoices } from './parameterErrors'
import { NetworkColumns } from './useNetworkColumns'

export interface ParameterFieldProps {
  param: AppParameter
  /** The parameter's key (see the key rule); used for test ids and ids. */
  fieldKey: string
  value: ParameterValue | null | undefined
  /** Receives a value typed by the declaration (see `coerceParameterValue`). */
  onChange: (value: ParameterValue) => void
  /** A message computed outside the field (e.g. a stale column); shown as helper text. */
  error?: string
  columns: NetworkColumns
  disabled?: boolean
  testIdPrefix: string
}

const NOT_IN_NETWORK = ' (not in this network)'
/** What a column picker shows, and offers, when no column is selected. */
const NO_COLUMN = '(none)'

/** Label on the left, control on the right — the row every dialog uses. */
const Row = ({
  param,
  children,
  htmlFor,
}: {
  param: AppParameter
  children: React.ReactNode
  htmlFor?: string
}): JSX.Element => (
  <Tooltip title={param.description ?? ''} placement="top-start" arrow>
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 2,
        mb: 2,
      }}
    >
      <Typography component="label" htmlFor={htmlFor} sx={{ flex: '1 1 auto' }}>
        {param.displayName}
      </Typography>
      {children}
    </Box>
  </Tooltip>
)

/**
 * A `text` parameter keeps a local draft and commits through `onChange`
 * only when the draft validates, so a half-typed number never reaches the
 * consumer's stored value (which Apply Default Layout and `applyLayout`
 * run ungated). The draft resyncs when the stored value changes from
 * outside (a reset, another algorithm selected).
 */
const TextParameter = ({
  param,
  fieldKey,
  value,
  onChange,
  error,
  disabled,
  testIdPrefix,
}: ParameterFieldProps): JSX.Element => {
  const stored = value ?? param.defaultValue ?? ''
  const [draft, setDraft] = useState<string>(String(stored))
  // Compared as typed values: a service app stores the committed number back
  // as a string ('1' for 1), and comparing '1' with 1 would reset a draft of
  // '1.' on every keystroke.
  const lastCommitted = useRef<ParameterValue>(
    coerceParameterValue(param, value),
  )

  useEffect(() => {
    const typed = coerceParameterValue(param, value)
    if (!Object.is(typed, lastCommitted.current)) {
      lastCommitted.current = typed
      setDraft(String(value ?? param.defaultValue ?? ''))
    }
  }, [value, param])

  const draftError = validateParameterValue(param, draft)
  const message = draftError ?? error
  const numeric = parameterValueType(param) !== ValueTypeName.String

  return (
    <Row param={param} htmlFor={`parameter-${fieldKey}`}>
      <TextField
        id={`parameter-${fieldKey}`}
        size="small"
        value={draft}
        error={message !== undefined}
        helperText={message ?? ''}
        disabled={disabled}
        inputProps={{
          'data-testid': `${testIdPrefix}-field-${fieldKey}`,
          inputMode: numeric ? 'decimal' : undefined,
          'aria-label': param.displayName,
        }}
        sx={{ width: 180 }}
        onChange={(e) => {
          const next = e.target.value
          setDraft(next)
          if (validateParameterValue(param, next) === undefined) {
            const coerced = coerceParameterValue(param, next)
            lastCommitted.current = coerced
            onChange(coerced)
          }
        }}
      />
    </Row>
  )
}

const ChoiceParameter = ({
  param,
  fieldKey,
  value,
  onChange,
  error,
  disabled,
  testIdPrefix,
  choices,
  staleSuffix,
  emptyLabel,
}: ParameterFieldProps & {
  choices: readonly string[]
  staleSuffix: string
  /**
   * When given, an empty value is a legitimate choice: it is offered as an
   * option under this label and shown under it when nothing is selected
   * (column pickers, where "no column" is a valid answer).
   */
  emptyLabel?: string
}): JSX.Element => {
  const current = value === null || value === undefined ? '' : String(value)
  // A stored value that is not among the choices (a column of another
  // network, a valueList that changed) still renders, marked, so MUI never
  // sees an out-of-range value and the user can see what is set.
  const stale = current !== '' && !choices.includes(current)
  return (
    <Row param={param}>
      <FormControl size="small" error={error !== undefined} sx={{ width: 180 }}>
        <Select
          value={current}
          displayEmpty
          renderValue={
            emptyLabel === undefined
              ? undefined
              : (selected: string) =>
                  selected === '' ? (
                    <em>{emptyLabel}</em>
                  ) : (
                    `${selected}${stale ? staleSuffix : ''}`
                  )
          }
          disabled={disabled}
          SelectDisplayProps={
            {
              'data-testid': `${testIdPrefix}-field-${fieldKey}`,
            } as React.HTMLAttributes<HTMLDivElement>
          }
          inputProps={{ 'aria-label': param.displayName }}
          onChange={(e: SelectChangeEvent<string>) =>
            onChange(coerceParameterValue(param, e.target.value))
          }
        >
          {emptyLabel !== undefined ? (
            <MenuItem value="">
              <em>{emptyLabel}</em>
            </MenuItem>
          ) : null}
          {stale ? (
            <MenuItem value={current}>
              {current}
              {staleSuffix}
            </MenuItem>
          ) : null}
          {choices.map((choice) => (
            <MenuItem key={choice} value={choice}>
              {choice}
            </MenuItem>
          ))}
        </Select>
        {error !== undefined ? <FormHelperText>{error}</FormHelperText> : null}
      </FormControl>
    </Row>
  )
}

const RadioParameter = ({
  param,
  fieldKey,
  value,
  onChange,
  error,
  disabled,
  testIdPrefix,
}: ParameterFieldProps): JSX.Element => {
  const current = value === null || value === undefined ? '' : String(value)
  return (
    <Row param={param}>
      <FormControl error={error !== undefined}>
        <RadioGroup
          data-testid={`${testIdPrefix}-field-${fieldKey}`}
          aria-label={param.displayName}
          value={current}
          onChange={(e) =>
            onChange(coerceParameterValue(param, e.target.value))
          }
        >
          {(param.valueList ?? []).map((choice) => (
            <FormControlLabel
              key={choice}
              value={choice}
              control={<Radio size="small" disabled={disabled} />}
              label={choice}
            />
          ))}
        </RadioGroup>
        {error !== undefined ? <FormHelperText>{error}</FormHelperText> : null}
      </FormControl>
    </Row>
  )
}

const CheckBoxParameter = ({
  param,
  fieldKey,
  value,
  onChange,
  disabled,
  testIdPrefix,
}: ParameterFieldProps): JSX.Element => (
  <Tooltip title={param.description ?? ''} placement="top-start" arrow>
    <FormControlLabel
      control={
        <Checkbox
          checked={coerceParameterValue(param, value) === true}
          disabled={disabled}
          inputProps={
            {
              'data-testid': `${testIdPrefix}-field-${fieldKey}`,
            } as React.InputHTMLAttributes<HTMLInputElement>
          }
          onChange={(e) => onChange(e.target.checked)}
        />
      }
      label={param.displayName}
      labelPlacement="start"
      sx={{
        marginLeft: '0px !important',
        display: 'flex',
        justifyContent: 'space-between',
        width: '100%',
        mb: 1,
      }}
    />
  </Tooltip>
)

/**
 * One control for one parameter, chosen by `param.type`. Host-filled types
 * (`ndexUUID`, `accessToken`) render nothing; the form filters them out
 * before getting here, but a direct caller gets the same.
 */
export const ParameterField = (
  props: ParameterFieldProps,
): JSX.Element | null => {
  const { param, columns } = props
  switch (param.type) {
    case ParameterUiType.Text:
      return <TextParameter {...props} />
    case ParameterUiType.DropDown:
      return (
        <ChoiceParameter
          {...props}
          choices={param.valueList ?? []}
          staleSuffix=" (not an option)"
        />
      )
    case ParameterUiType.Radio:
      return <RadioParameter {...props} />
    case ParameterUiType.CheckBox:
      return <CheckBoxParameter {...props} />
    case ParameterUiType.NodeColumn:
    case ParameterUiType.EdgeColumn:
      return (
        <ChoiceParameter
          {...props}
          choices={columnChoices(param, columns).map((c: Column) => c.name)}
          staleSuffix={NOT_IN_NETWORK}
          emptyLabel={NO_COLUMN}
        />
      )
    default:
      return null
  }
}
