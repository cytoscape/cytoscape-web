import KeyIcon from '@mui/icons-material/Key'
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined'
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined'

import { ColumnAppendType } from '../model/ColumnAppendType'
import { Box, Button, Tooltip } from '@mui/material'
import { columnAppendType2Label } from '../model/impl/JoinTableToNetwork'

export const columnAppendIconMap = {
  [ColumnAppendType.Key]: (
    <KeyIcon height={20} width={30} sx={{ color: 'rgba(41, 2, 2, 1)' }} />
  ),
  [ColumnAppendType.Attribute]: (
    <AssignmentOutlinedIcon
      height={20}
      width={30}
      sx={{ color: 'rgba(41, 2, 2, 1)' }}
    />
  ),
  [ColumnAppendType.NotImported]: (
    <BlockOutlinedIcon height={20} width={20} sx={{ color: 'gray' }} />
  ),
}

export function ColumnAppendTypeRender(props: { value: ColumnAppendType }) {
  return (
    <Button size="small" startIcon={columnAppendIconMap[props.value]}>
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

  //   <Box>
  //   <Tooltip title={props.tooltipText}>
  //     <Box onClick={(e) => showValuePicker(e.currentTarget)}>
  //       <VisualPropertyValueRender
  //         vpName={props.visualProperty.name}
  //         value={props.currentValue}
  //         vpValueType={props.visualProperty.type}
  //       />
  //     </Box>
  //   </Tooltip>

  //   <Popover
  //     open={valuePicker != null}
  //     anchorEl={valuePicker}
  //     onClose={() => showValuePicker(null)}
  //     anchorOrigin={{ vertical: 'top', horizontal: 55 }}
  //   >
  //     <Box>
  //       {
  //         props.visualProperty && props.visualProperty.displayName.includes("Color") ? (
  //           <>
  //             <Tabs
  //               value={activeTab}
  //               onChange={(event, newValue) => setActiveTab(newValue)}
  //               aria-label="Tab panel"
  //             >
  //               <Tab label="ColorBrewer Sequential" />
  //               <Tab label="ColorBrewer Diverging" />
  //               <Tab label="Viridis Sequential" />
  //               <Tab label="Swatches" />
  //               <Tab label="Color Picker" />
  //             </Tabs>
  //           </>
  //         ) : null
  //       }
  //       {activeTab === 0 && (
  //         <Box sx={{
  //           margin: "auto", display: "flex", justifyContent: "center", alignItems: "center", overflow: 'auto',
  //           '&::-webkit-scrollbar': {
  //             display: 'none',
  //           },
  //           scrollbarWidth: 'none',
  //           msOverflowStyle: 'none'
  //         }}>
  //           {(
  //             vpName2RenderMap[props.visualProperty.name]?.pickerRender ??
  //             vpType2RenderMapSequential[props.visualProperty.type].pickerRender ??
  //             (() => { })
  //           )({
  //             onValueChange: (value: VisualPropertyValueType) =>
  //               props.onValueChange(value),
  //             currentValue: props.currentValue,
  //           })}
  //         </Box>
  //       )}
  //       {activeTab === 1 && (
  //         <Box sx={{
  //           margin: "auto", display: "flex", justifyContent: "center", alignItems: "center",
  //           overflow: 'auto',
  //           '&::-webkit-scrollbar': {
  //             display: 'none',
  //           },
  //           scrollbarWidth: 'none',
  //           msOverflowStyle: 'none'
  //         }}
  //         >
  //           {(
  //             vpName2RenderMap[props.visualProperty.name]?.pickerRender ??
  //             vpType2RenderMapDiverging[props.visualProperty.type].pickerRender ??
  //             (() => { })
  //           )({
  //             onValueChange: (value: VisualPropertyValueType) =>
  //               props.onValueChange(value),
  //             currentValue: props.currentValue,
  //           })}
  //         </Box>
  //       )}

  //       {activeTab === 2 && (
  //         <Box sx={{
  //           margin: "auto", display: "flex", justifyContent: "center", alignItems: "center",
  //           overflow: 'auto',
  //           '&::-webkit-scrollbar': {
  //             display: 'none',
  //           },
  //           scrollbarWidth: 'none',
  //           msOverflowStyle: 'none'
  //         }}
  //         >              {(
  //           vpName2RenderMap[props.visualProperty.name]?.pickerRender ??
  //           vpType2RenderMapViridis[props.visualProperty.type].pickerRender ??
  //           (() => { })
  //         )({
  //           onValueChange: (value: VisualPropertyValueType) =>
  //             props.onValueChange(value),
  //           currentValue: props.currentValue,
  //         })}
  //         </Box>
  //       )}

  //       {activeTab === 3 && (
  //         <Box sx={{
  //           margin: "auto", display: "flex", justifyContent: "center", alignItems: "center",
  //           overflow: 'auto',
  //           '&::-webkit-scrollbar': {
  //             display: 'none',
  //           },
  //           scrollbarWidth: 'none',
  //           msOverflowStyle: 'none'
  //         }}
  //         >              {(
  //           vpName2RenderMap[props.visualProperty.name]?.pickerRender ??
  //           vpType2RenderMap2[props.visualProperty.type].pickerRender ??
  //           (() => { })
  //         )({
  //           onValueChange: (value: VisualPropertyValueType) =>
  //             props.onValueChange(value),
  //           currentValue: props.currentValue,
  //         })}
  //         </Box>
  //       )}

  //       {activeTab === 4 && (
  //         <Box sx={{
  //           margin: "auto", display: "flex", justifyContent: "center", alignItems: "center",
  //           overflow: 'auto',
  //           '&::-webkit-scrollbar': {
  //             display: 'none',
  //           },
  //           scrollbarWidth: 'none',
  //           msOverflowStyle: 'none'
  //         }}
  //         >              {(
  //           vpName2RenderMap[props.visualProperty.name]?.pickerRender ??
  //           vpType2RenderMap[props.visualProperty.type].pickerRender ??
  //           (() => { })
  //         )({
  //           onValueChange: (value: VisualPropertyValueType) =>
  //             props.onValueChange(value),
  //           currentValue: props.currentValue,
  //         })}
  //         </Box>
  //       )}

  //     </Box>
  //   </Popover>
  return (
    <Box>
      {Object.values(ColumnAppendType).map((v) => {
        return (
          <Tooltip key={v} title={columnAppendType2Label[v]}>
            <Box
              onClick={() => onChange(v)}
              sx={{
                backgroundColor: v === value ? '#D6D6D6' : 'white',
                opacity: !validValues.includes(v) ? 0.2 : 1,
                color: value === v ? 'blue' : 'black',
                width: 100,
                p: 1,
                '&:hover': { cursor: 'pointer' },
              }}
              //   onClick={() => onValueChange(font)}
            >
              <ColumnAppendTypeRender value={v} />
            </Box>
            {/* <Button
              style={{ opacity: !validValues.includes(v) ? 0.2 : 1 }}
              disabled={!validValues.includes(v)}
              onClick={() => onChange(v)}
              bg={v === value ? '#D6D6D6' : 'white'}
              justify="flex-start"
              size="compact-xs"
              leftSection={columnAppendIconMap[v]}
              variant="default"
            ></Button> */}
          </Tooltip>
        )
      })}
    </Box>
  )
}
