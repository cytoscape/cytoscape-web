import {
  Box,
  Button,
  Tooltip,
  Input,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Paper,
  IconButton,
} from '@mui/material'
import { styled } from '@mui/material/styles'
import Delete from '@mui/icons-material/Delete'
import React from 'react'

import { ValueType, ValueTypeName } from '../../models/TableModel'
import { serializeValue } from '../../models/TableModel/impl/ValueTypeImpl'

// components that render 'ValueType' values e.g. string, number, boolean, list

export const ValueViewBox = styled(Box)(({ theme }) => ({
  '&:hover': {
    cursor: 'pointer',
    boxShadow: theme.shadows[4],
  },
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
}))

interface ValueRenderProps {
  value: ValueType
}

interface ValueFormProps {
  value: ValueType
  dataType: ValueTypeName
  tooltipText?: string
  onValueChange: (newValue: ValueType) => void
}

export const ValueRender = (props: ValueRenderProps): React.ReactElement => {
  const displayValue = Array.isArray(props.value)
    ? props.value.join(', ')
    : props.value

  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      <Input disableUnderline size="small" value={displayValue}></Input>
    </Box>
  )
}

// Prototype list value form.  For now, we are encoding the list as a string,
// where the user has to edit each value via comma seperated values.
export const ListValueForm = (props: {
  value: ValueType
}): React.ReactElement => {
  if (!Array.isArray(props.value)) {
    console.error(
      'trying to render a list value form with a non-list value',
      props.value,
    )
    return <Box></Box>
  }

  return (
    <>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell></TableCell>
              <TableCell>Index</TableCell>
              <TableCell>Value</TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {props.value.map((v, index) => (
              <TableRow key={index}>
                <TableCell padding="checkbox">
                  <Checkbox onClick={() => {}} />
                </TableCell>
                <TableCell>{index}</TableCell>
                <TableCell>
                  <ValueForm
                    value={v}
                    onValueChange={() => {}}
                    dataType={'string'}
                  />
                </TableCell>
                <TableCell>
                  <IconButton onClick={() => {}}>
                    <Delete />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Button>Add new value</Button>
    </>
  )
}

export const ValueForm = (props: ValueFormProps): React.ReactElement => {
  // disable list specific form for now
  //   const formContent = Array.isArray(props.value) ? (
  //     <ListValueForm value={props.value} />
  //   ) : null

  const [localValue, setLocalValue] = React.useState(
    serializeValue(props.value),
  )

  React.useEffect(() => {
    setLocalValue(serializeValue(props.value))
  }, [props.dataType])

  return (
    <Box>
      <Tooltip title={props.tooltipText}>
        <Input
          sx={{ fontSize: 14 }}
          disableUnderline
          size="small"
          onChange={(e) => {
            setLocalValue(e.target.value)
            props.onValueChange(e.target.value)
          }}
          value={localValue}
        />
      </Tooltip>
    </Box>
  )
}
