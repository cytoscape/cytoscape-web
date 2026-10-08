import { Button, ButtonGroup, Chip, Tooltip } from '@mui/material'
import { IconBan, IconFileText, IconKey } from '@tabler/icons-react'

import { compactButtonSx } from '@/features/TableDataLoader/components/compactButtonSx'
import { ColumnAppendType } from '../../model/ColumnAppendType'
import { columnAppendType2Label } from '../../model/impl/JoinTableToNetwork'

export const columnAppendIconMap = {
  [ColumnAppendType.Key]: (
    <IconKey height={20} width={30} color="rgba(41, 2, 2, 1)" />
  ),
  [ColumnAppendType.Attribute]: (
    <IconFileText height={20} width={30} color="rgba(41, 2, 2, 1)" />
  ),
  [ColumnAppendType.NotImported]: <IconBan size={20} color="gray" />,
}

/**
 * Read-only summary of a column's meaning. A Chip, not a Button: it renders
 * inside ColumnHeaderEditor's role="button" container, and a nested
 * interactive element there is unreachable for assistive technology.
 */
export function ColumnAppendTypeRender(props: { value: ColumnAppendType }) {
  return (
    <Chip
      size="small"
      variant="outlined"
      icon={columnAppendIconMap[props.value]}
      label={columnAppendType2Label[props.value]}
      sx={{ ...compactButtonSx, justifyContent: 'flex-start' }}
    />
  )
}

export interface ColumnAppendFormProps {
  value: ColumnAppendType
  onChange: (nextValue: ColumnAppendType) => void
  validValues: ColumnAppendType[]
}

export function ColumnAppendForm(props: ColumnAppendFormProps) {
  const { value, onChange, validValues } = props

  return (
    <ButtonGroup size="small" variant="outlined">
      {Object.values(ColumnAppendType).map((v) => {
        return (
          <Tooltip key={v} title={columnAppendType2Label[v]}>
            <span>
              <Button
                aria-pressed={v === value}
                sx={{
                  ...compactButtonSx,
                  opacity: !validValues.includes(v) ? 0.2 : 1,
                  backgroundColor:
                    v === value ? 'action.selected' : 'transparent',
                }}
                disabled={!validValues.includes(v)}
                onClick={() => onChange(v)}
                variant="outlined"
                size="small"
              >
                {columnAppendIconMap[v]}
              </Button>
            </span>
          </Tooltip>
        )
      })}
    </ButtonGroup>
  )
}
