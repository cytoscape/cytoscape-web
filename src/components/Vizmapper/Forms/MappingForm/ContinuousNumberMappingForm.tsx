import * as React from 'react'
import {
  Box,
  Tooltip,
  IconButton,
  Paper,
  TextField,
  Typography,
} from '@mui/material'
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown'
import Close from '@mui/icons-material/Close'
import { debounce } from 'lodash'

import { scaleLinear as visXScaleLinear } from '@visx/scale'
import { AreaClosed, LinePath } from '@visx/shape'
import { Group } from '@visx/group'
import { AxisLeft, AxisBottom } from '@visx/axis'
import { LinearGradient } from '@visx/gradient'
import { extent } from 'd3-array'

import Draggable from 'react-draggable'

import { IdType } from '../../../../models/IdType'
import {
  VisualProperty,
  VisualPropertyValueType,
} from '../../../../models/VisualStyleModel'
import { ContinuousMappingFunction } from '../../../../models/VisualStyleModel/VisualMappingFunction'

import { VisualPropertyValueForm } from '../VisualPropertyValueForm'
import { useVisualStyleStore } from '../../../../store/VisualStyleStore'
import { ContinuousFunctionControlPoint } from '../../../../models/VisualStyleModel/VisualMappingFunction/ContinuousMappingFunction'
import { Handle } from './Handle'

export function ContinuousNumberMappingForm(props: {
  currentNetworkId: IdType
  visualProperty: VisualProperty<VisualPropertyValueType>
}): React.ReactElement {
  const m: ContinuousMappingFunction | null = props.visualProperty
    ?.mapping as ContinuousMappingFunction

  if (m == null) {
    return <Box></Box>
  }

  const { min, max, controlPoints } = m

  const [minState, setMinState] = React.useState(min)
  const [maxState, setMaxState] = React.useState(max)

  const ref = React.useRef<SVGPathElement>(null)
  const setContinuousMappingValues = useVisualStyleStore(
    (state) => state.setContinuousMappingValues,
  )

  const LINE_CHART_WIDTH = 425
  const LINE_CHART_HEIGHT = 200
  const LINE_CHART_MARGIN_LEFT = 50
  const LINE_CHART_MARGIN_RIGHT = 0
  const LINE_CHART_MARGIN_TOP = 0
  const LINE_CHART_MARGIN_BOTTOM = 50

  const LINE_CHART_ELE_ID = 'line-chart'
  const [handles, setHandles] = React.useState(() => {
    return [...controlPoints]
      .sort((a, b) => (a.value as number) - (b.value as number))
      .map((pt, index) => {
        return {
          ...pt,
          id: index,
          pixelPosition: {
            x: 0,
            y: 0,
          },
        }
      })
  })

  const xMax =
    LINE_CHART_WIDTH - LINE_CHART_MARGIN_LEFT - LINE_CHART_MARGIN_RIGHT
  const yMax =
    LINE_CHART_HEIGHT - LINE_CHART_MARGIN_TOP - LINE_CHART_MARGIN_BOTTOM
  const data = [
    [minState.value, minState.vpValue],
    ...handles.map((h) => [h.value, h.vpValue]),
    [maxState.value, maxState.vpValue],
  ]
  const xGetter = (d: [number, number]): number => d[0]
  const yGetter = (d: [number, number]): number => d[1]

  const valueDomain = [
    minState.value as number,
    ...handles.map((h) => h.value as number),
    maxState.value as number,
  ]

  const vpValueDomain = [
    minState.vpValue as number,
    ...handles.map((h) => h.vpValue as number),
    maxState.vpValue as number,
  ]
  const xScale = visXScaleLinear({
    range: [0, xMax],
    domain: extent(valueDomain) as [number, number],
  })

  const yScale = visXScaleLinear({
    range: [yMax, 0],
    domain: extent(vpValueDomain) as [number, number],
  })

  const xMapper = (d: [number, number]): number => xScale(xGetter(d)) ?? 0
  const yMapper = (d: [number, number]): number => yScale(yGetter(d)) ?? 0

  const chart = (
    <svg width={LINE_CHART_WIDTH} height={LINE_CHART_HEIGHT}>
      <Group top={LINE_CHART_MARGIN_TOP} left={LINE_CHART_MARGIN_LEFT}>
        <AxisLeft
          scale={yScale}
          top={0}
          left={0}
          label={props.visualProperty.displayName}
          labelOffset={20}
          stroke={'#1b1a1e'}
        />
        <AxisBottom
          scale={xScale}
          top={yMax}
          label={m.attribute}
          stroke={'#1b1a1e'}
        />
        <LinePath
          data={data}
          stroke={'url(#gradient)'}
          x={xMapper}
          y={yMapper}
        />
        <AreaClosed
          ref={ref}
          data={data}
          fill={'url(#gradient)'}
          yScale={yScale}
          x={xMapper}
          y={yMapper}
        />

        <LinearGradient from="#63a5e8" to="#a6c9ed" id="gradient" />
      </Group>
    </svg>
  )

  const updateContinuousMapping = React.useMemo(
    () =>
      debounce(
        (
          min: ContinuousFunctionControlPoint,
          max: ContinuousFunctionControlPoint,
          handles: Handle[],
        ) => {
          setContinuousMappingValues(
            props.currentNetworkId,
            props.visualProperty.name,
            min,
            max,
            handles.map((h) => {
              return {
                value: h.value,
                vpValue: h.vpValue,
              }
            }),
          )
        },
        200,
        { trailing: true },
      ),
    [],
  )

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 12,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            p: 1,
            m: 1,
          }}
        >
          <VisualPropertyValueForm
            currentValue={minState.vpValue}
            visualProperty={props.visualProperty}
            onValueChange={(newValue) => {
              setMinState({
                ...minState,
                vpValue: newValue,
              })

              updateContinuousMapping(
                {
                  ...minState,
                  vpValue: newValue,
                },
                maxState,
                handles,
              )
            }}
          />
          <Typography variant="body2">Min</Typography>
          <TextField
            sx={{ width: 50 }}
            inputProps={{
              sx: { p: 0.5, fontSize: 14, width: 50 },
              inputMode: 'numeric',
              pattern: '[0-9]*',
              step: 0.1,
            }}
            onChange={(e) => {
              const newMin = Number(e.target.value)
              if (!isNaN(newMin)) {
                setMinState({
                  ...minState,
                  value: newMin,
                })

                updateContinuousMapping(
                  {
                    ...minState,
                    value: newMin,
                  },
                  maxState,
                  handles,
                )
              }
            }}
            value={minState.value}
          />
        </Box>
        <Box sx={{ display: 'flex', position: 'relative' }}>
          <Tooltip
            title="Drag handles or change the handle values to edit the mapping"
            placement="bottom"
          >
            <Box
              id={LINE_CHART_ELE_ID}
              sx={{
                display: 'flex',
                position: 'relative',
                userSelect: 'none',
              }}
            >
              {chart}
              {handles.map((h) => {
                return (
                  <Draggable
                    key={h.id}
                    bounds={{
                      left: LINE_CHART_MARGIN_LEFT,
                      right: LINE_CHART_WIDTH,
                      top: -LINE_CHART_MARGIN_TOP,
                      bottom: LINE_CHART_HEIGHT - LINE_CHART_MARGIN_BOTTOM,
                    }}
                    handle=".handle"
                    onDrag={(e, data) => {
                      const newValue = xScale.invert(
                        data.x - LINE_CHART_MARGIN_LEFT,
                      )
                      const newVpValue = yScale.invert(
                        data.y - LINE_CHART_MARGIN_TOP,
                      )

                      const handleIndex = handles.findIndex(
                        (handle) => handle.id === h.id,
                      )

                      if (handleIndex >= 0) {
                        const newHandles = [...handles]
                        newHandles[handleIndex].value = newValue
                        newHandles[handleIndex].vpValue = newVpValue
                        newHandles.sort(
                          (a, b) => (a.value as number) - (b.value as number),
                        )
                        setHandles(newHandles)
                        updateContinuousMapping(minState, maxState, newHandles)
                      }
                    }}
                    position={{
                      x:
                        xMapper([h.value as number, h.vpValue as number]) +
                        LINE_CHART_MARGIN_LEFT,
                      y: yMapper([h.vpValue as number, h.vpValue as number]),
                    }}
                  >
                    <Box
                      sx={{
                        width: 2,
                        height: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        position: 'absolute',
                        zIndex: 1,
                      }}
                    >
                      <Paper
                        sx={{
                          p: 1,
                          position: 'relative',
                          top: -105,
                          zIndex: 2,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                        }}
                      >
                        <IconButton
                          sx={{ position: 'absolute', top: -20, right: -16 }}
                          onClick={() => {
                            const handleIndex = handles.findIndex(
                              (handle) => handle.id === h.id,
                            )
                            if (handleIndex >= 0) {
                              const newHandles = [...handles]
                              newHandles.splice(handleIndex, 1)
                              setHandles(newHandles)
                              updateContinuousMapping(
                                minState,
                                maxState,
                                newHandles,
                              )
                            }
                          }}
                        >
                          <Close />
                        </IconButton>

                        <VisualPropertyValueForm
                          currentValue={h.vpValue ?? null}
                          visualProperty={props.visualProperty}
                          onValueChange={(newValue) => {
                            const handleIndex = handles.findIndex(
                              (handle) => handle.id === h.id,
                            )
                            if (handleIndex >= 0) {
                              const newHandles = [...handles]
                              newHandles[handleIndex].vpValue = newValue
                              setHandles(newHandles)
                              updateContinuousMapping(
                                minState,
                                maxState,
                                newHandles,
                              )
                            }
                          }}
                        />
                        <TextField
                          sx={{ width: 50, mt: 1 }}
                          inputProps={{
                            sx: { p: 0.5, fontSize: 14, width: 50 },
                            inputMode: 'numeric',
                            pattern: '[0-9]*',
                            step: 0.1,
                          }}
                          onChange={(e) => {
                            const handleIndex = handles.findIndex(
                              (handle) => handle.id === h.id,
                            )
                            if (handleIndex >= 0) {
                              const newHandles = [...handles]
                              const newVal = Number(e.target.value)

                              if (!isNaN(newVal)) {
                                newHandles[handleIndex].value = newVal
                                newHandles.sort(
                                  (a, b) =>
                                    (a.value as number) - (b.value as number),
                                )
                                setHandles(newHandles)
                                updateContinuousMapping(
                                  minState,
                                  maxState,
                                  newHandles,
                                )
                              }
                            }
                          }}
                          value={h.value as number}
                        />
                      </Paper>
                      <IconButton
                        className="handle"
                        size="large"
                        sx={{
                          position: 'relative',
                          top: -130,
                          '&:hover': { cursor: 'move' },
                        }}
                      >
                        <ArrowDropDownIcon sx={{ fontSize: '40px' }} />
                      </IconButton>
                    </Box>
                  </Draggable>
                )
              })}
            </Box>
          </Tooltip>
        </Box>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            p: 1,
            m: 1,
          }}
        >
          <VisualPropertyValueForm
            currentValue={maxState.vpValue}
            visualProperty={props.visualProperty}
            onValueChange={(newValue) => {
              setMaxState({
                ...maxState,
                vpValue: newValue,
              })
              updateContinuousMapping(minState, maxState, handles)
            }}
          />
          <Typography variant="body2">Max</Typography>
          <TextField
            sx={{ width: 50 }}
            inputProps={{
              sx: { p: 0.5, fontSize: 14, width: 50 },
              inputMode: 'numeric',
              pattern: '[0-9]*',
              step: 0.1,
            }}
            onChange={(e) => {
              const newMax = Number(e.target.value)
              if (!isNaN(newMax)) {
                setMaxState({
                  ...maxState,
                  value: newMax,
                })

                // const newHandles = handles.map((h) => {
                //   return {
                //     ...h,
                //     value: pixelPositionToRangePosition(
                //       [0, LINE_CHART_WIDTH],
                //       [minState.value as number, newMax],
                //       h.pixelPosition.x,
                //     ),
                //   }
                // })

                // setHandles(newHandles)
                updateContinuousMapping(minState, maxState, handles)
              }
            }}
            value={maxState.value}
          />
        </Box>
      </Box>
    </Box>
  )
}
