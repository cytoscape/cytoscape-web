import * as React from 'react'
import {
  Button,
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

  const [addHandleFormValue, setAddHandleFormValue] = React.useState(0)
  const [addHandleFormVpValue, setAddHandleFormVpValue] = React.useState(0)
  const [draggedHandleId, setDraggedHandleId] = React.useState<number | null>(
    null,
  )

  const { min, max, controlPoints } = m

  const [minState, setMinState] = React.useState(min)
  const [maxState, setMaxState] = React.useState(max)

  const setContinuousMappingValues = useVisualStyleStore(
    (state) => state.setContinuousMappingValues,
  )

  const LINE_CHART_WIDTH = 425
  const LINE_CHART_HEIGHT = 200
  const LINE_CHART_MARGIN_LEFT = 50
  const LINE_CHART_MARGIN_RIGHT = 10
  const LINE_CHART_MARGIN_TOP = 10
  const LINE_CHART_MARGIN_BOTTOM = 50

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
          labelProps={{
            fontSize: 14,
            textAnchor: 'middle',
          }}
          labelOffset={25}
          stroke={'#1b1a1e'}
        />
        <AxisBottom
          scale={xScale}
          top={yMax}
          labelProps={{
            fontSize: 14,
            textAnchor: 'middle',
          }}
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
          marginTop: 8,
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
        <Paper sx={{ display: 'flex', position: 'relative' }}>
          <Tooltip
            title="Drag handles or change the handle values to edit the mapping"
            placement="bottom"
          >
            <Box
              sx={{
                display: 'flex',
                position: 'relative',
                userSelect: 'none',
              }}
            >
              {chart}
              {handles.map((h) => {
                const pixelPositionX =
                  xMapper([h.value as number, h.vpValue as number]) +
                  LINE_CHART_MARGIN_LEFT
                const pixelPositionY =
                  yMapper([h.value as number, h.vpValue as number]) +
                  LINE_CHART_MARGIN_TOP

                return (
                  <Draggable
                    key={h.id}
                    bounds={{
                      left: LINE_CHART_MARGIN_LEFT,
                      right: LINE_CHART_WIDTH - LINE_CHART_MARGIN_RIGHT,
                      top: LINE_CHART_MARGIN_TOP - 2, // -2 allows user to scroll slightly passed the top of the chart to increase the y value of the handle
                      bottom: LINE_CHART_HEIGHT - LINE_CHART_MARGIN_BOTTOM,
                    }}
                    handle=".handle"
                    onStart={(e) => {
                      setDraggedHandleId(h.id)
                    }}
                    onStop={(e) => {
                      setDraggedHandleId(null)
                    }}
                    onDrag={(e, data) => {
                      const newValue = Number(
                        xScale
                          .invert(data.x - LINE_CHART_MARGIN_LEFT)
                          .toFixed(4),
                      )
                      const newVpValue = Number(
                        yScale
                          .invert(data.y - LINE_CHART_MARGIN_TOP)
                          .toFixed(4),
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
                      x: pixelPositionX,
                      y: pixelPositionY,
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
                        zIndex: draggedHandleId === h.id ? 3 : 1,
                      }}
                    >
                      <Paper
                        sx={{
                          p: 0.5,
                          position: 'relative',
                          top: -65 - pixelPositionY,
                          zIndex: draggedHandleId === h.id ? 3 : 1,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                        }}
                      >
                        <Box
                          className="handle"
                          sx={{
                            position: 'absolute',
                            width: 2,
                            top: 65,
                            height: pixelPositionY,
                            backgroundColor: '#707070',
                            '&:hover': { cursor: 'move' },
                          }}
                        ></Box>

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
                        <Box>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Typography
                              sx={{
                                width: 60,
                                minWidth: 60,
                                overflow: 'hidden',
                                whiteSpace: 'nowrap',
                                textOverflow: 'ellipsis',
                              }}
                              variant="caption"
                            >
                              {props.visualProperty.displayName}
                            </Typography>
                            <TextField
                              sx={{ width: 40, ml: 0.5 }}
                              inputProps={{
                                sx: {
                                  p: 0.5,
                                  fontSize: 12,
                                  width: 50,
                                  boxShadow: 1,
                                },
                                inputMode: 'numeric',
                                pattern: '[0-9]*',
                                step: 0.1,
                              }}
                              onChange={(e) => {
                                const newVal = Number(
                                  Number(e.target.value).toFixed(2),
                                )
                                const handleIndex = handles.findIndex(
                                  (handle) => handle.id === h.id,
                                )
                                if (handleIndex >= 0) {
                                  const newHandles = [...handles]
                                  newHandles[handleIndex].vpValue = newVal
                                  setHandles(newHandles)
                                  updateContinuousMapping(
                                    minState,
                                    maxState,
                                    newHandles,
                                  )
                                }
                              }}
                              value={h.vpValue as number}
                            />
                          </Box>
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              mt: 0.25,
                            }}
                          >
                            <Typography
                              sx={{
                                width: 60,
                                minWidth: 60,
                                overflow: 'hidden',
                                whiteSpace: 'nowrap',
                                textOverflow: 'ellipsis',
                              }}
                              variant="caption"
                            >
                              {m.attribute}
                            </Typography>

                            <TextField
                              sx={{ width: 40, ml: 0.5 }}
                              inputProps={{
                                sx: {
                                  p: 0.5,
                                  fontSize: 12,
                                  width: 50,
                                  boxShadow: 1,
                                },
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
                                  const newVal = Number(
                                    Number(e.target.value).toFixed(2),
                                  )

                                  if (!isNaN(newVal)) {
                                    newHandles[handleIndex].value = newVal
                                    newHandles.sort(
                                      (a, b) =>
                                        (a.value as number) -
                                        (b.value as number),
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
                          </Box>
                        </Box>
                      </Paper>
                      <IconButton
                        className="handle"
                        size="large"
                        sx={{
                          position: 'relative',
                          top: -98,
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
        </Paper>
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
                //   const pixelPosX =
                //     xMapper([h.value as number, h.vpValue as number]) +
                //     LINE_CHART_MARGIN_LEFT

                //   const newDomain = [
                //     minState.value as number,
                //     ...handles.map((h) => h.value as number),
                //     newMax,
                //   ]
                //   const newXScale = visXScaleLinear({
                //     range: [0, xMax],
                //     domain: extent(newDomain) as [number, number],
                //   })

                //   const newValue = newXScale.invert(
                //     pixelPosX - LINE_CHART_MARGIN_LEFT,
                //   )
                //   console.log(newValue)

                //   return {
                //     ...h,
                //     value: newValue,
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
      <Paper
        sx={{ p: 1, display: 'flex', flexDirection: 'column', width: 200 }}
      >
        <Typography sx={{ ml: 2 }} variant="body2">
          Add handle
        </Typography>
        <Box sx={{ p: 1, display: 'flex', flexDirection: 'column' }}>
          <TextField
            sx={{ width: 150 }}
            size="small"
            label={
              <Typography variant="body2">{`${m.attribute} value`}</Typography>
            }
            variant="standard"
            value={addHandleFormValue}
            inputProps={{
              sx: { p: 0.5, fontSize: 14, width: 50 },
              inputMode: 'numeric',
              pattern: '[0-9]*',
              step: 0.1,
            }}
            onChange={(e) => {
              const newValue = Number(e.target.value)
              if (!isNaN(newValue)) {
                setAddHandleFormValue(newValue)
              }
            }}
          />
          <TextField
            sx={{ width: 150 }}
            size="small"
            label={
              <Typography variant="body2">{`${props.visualProperty.displayName} value`}</Typography>
            }
            variant="standard"
            value={addHandleFormVpValue}
            inputProps={{
              sx: { p: 0.5, fontSize: 14, width: 50 },
              inputMode: 'numeric',
              pattern: '[0-9]*',
              step: 0.1,
            }}
            onChange={(e) => {
              const newValue = Number(e.target.value)
              if (!isNaN(newValue)) {
                setAddHandleFormVpValue(newValue)
              }
            }}
          />
        </Box>
        <Button
          variant="contained"
          onClick={() => {
            let newHandleId = 0
            const handleIds = new Set(handles.map((h) => h.id))
            while (handleIds.has(newHandleId)) {
              newHandleId++
            }

            const newHandle = {
              id: newHandleId,
              value: addHandleFormValue,
              vpValue: addHandleFormVpValue,
              pixelPosition: {
                x: 0,
                y: 0,
              },
            }
            const newHandles = [...handles, newHandle].sort(
              (a, b) => (a.value as number) - (b.value as number),
            )
            setHandles(newHandles)
            updateContinuousMapping(min, max, newHandles)
          }}
          size="small"
        >
          Add Handle
        </Button>
      </Paper>
    </Box>
  )
}
