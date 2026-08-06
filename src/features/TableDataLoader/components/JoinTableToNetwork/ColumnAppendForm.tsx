import { Button, ButtonGroup, Tooltip } from '@mui/material'
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

export function ColumnAppendTypeRender(props: { value: ColumnAppendType }) {
  return (
    <Button
      size="small"
      variant="outlined"
      startIcon={columnAppendIconMap[props.value]}
      sx={{ ...compactButtonSx, justifyContent: 'flex-start' }}
    >
      {columnAppendType2Label[props.value]}
    </Button>
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
                sx={{
                  ...compactButtonSx,
                  opacity: !validValues.includes(v) ? 0.2 : 1,
                  backgroundColor: v === value ? 'action.selected' : 'transparent',
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
