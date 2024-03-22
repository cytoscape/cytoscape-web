import { Box } from '@mui/material'
import { ValueTypeName } from '../../../models/TableModel'

export const getText = (value: string) => (
  <Box
    sx={{
      color: 'D6D6D6',
      width: 35,
      height: 20,
      fontSize: 12,
      fontWeight: 900,
    }}
  >
    {value}
  </Box>
)

export const valueTypeNameRenderMap = {
  [ValueTypeName.Boolean]: getText('y/n'),
  [ValueTypeName.Integer]: getText('1'),
  [ValueTypeName.Double]: getText('1.0'),
  [ValueTypeName.Long]: getText('123'),
  [ValueTypeName.String]: getText('ab'),
  [ValueTypeName.ListBoolean]: getText('[y/n]'),
  [ValueTypeName.ListDouble]: getText('[1.0]'),
  [ValueTypeName.ListInteger]: getText('[1]'),
  [ValueTypeName.ListLong]: getText('[123]'),
  [ValueTypeName.ListString]: getText('[ab]'),
}
