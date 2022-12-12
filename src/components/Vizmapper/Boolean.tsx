import { Box, Switch } from '@mui/material'

export function BooleanSwitch(props: {
  currentValue: boolean
  onClick: (value: boolean) => void
}): React.ReactElement {
  const { onClick, currentValue } = props
  return (
    <Box>
      <Switch
        checked={currentValue}
        onChange={(e) => onClick(e.target.checked)}
      ></Switch>
    </Box>
  )
}

export function Boolean(props: { value: boolean }): React.ReactElement {
  return <Box>{props.value}</Box>
}
