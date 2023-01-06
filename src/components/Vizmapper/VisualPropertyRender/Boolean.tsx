import { Box, Switch } from '@mui/material'

export function BooleanSwitch(props: {
  currentValue: boolean
  onValueChange: (value: boolean) => void
}): React.ReactElement {
  const { onValueChange, currentValue } = props
  return (
    <Box>
      <Switch
        checked={currentValue}
        onChange={(e) => onValueChange(e.target.checked)}
      ></Switch>
    </Box>
  )
}

export function Boolean(props: { value: boolean }): React.ReactElement {
  return <Box>{props.value}</Box>
}
