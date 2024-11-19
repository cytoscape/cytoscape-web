import * as React from 'react'
import {
  Button,
  Box,
  Tooltip,
  IconButton,
  Paper,
  Popover,
  TextField,
  Typography,
} from '@mui/material'
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown'
import AddCircleIcon from '@mui/icons-material/AddCircle'
import EditIcon from '@mui/icons-material/Edit'
import Close from '@mui/icons-material/DisabledByDefault'
import { debounce } from 'lodash'

import { scaleLinear as visXScaleLinear } from '@visx/scale'
import { extent } from 'd3-array'

import Draggable from 'react-draggable'

import { IdType } from '../../../../../models/IdType'
import {
  VisualProperty,
  VisualPropertyValueType,
} from '../../../../../models/VisualStyleModel'
import { ContinuousMappingFunction } from '../../../../../models/VisualStyleModel/VisualMappingFunction'
import { ContinuousFunctionControlPoint } from '../../../../../models/VisualStyleModel/VisualMappingFunction/ContinuousMappingFunction'

import { useVisualStyleStore } from '../../../../../store/VisualStyleStore'

import { Handle, addHandle, removeHandle, editHandle } from './Handle'
import { LineChart } from './LineChart'
import { VisualPropertyValueForm } from '../../VisualPropertyValueForm'

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
  const [lastDraggedHandleId, setlastDraggedHandleId] = React.useState<
    number | null
  >(null)

  const [editMinMaxAnchorEl, setEditMinMaxAnchorEl] =
    React.useState<HTMLButtonElement | null>(null)
  const [createHandleAnchorEl, setCreateHandleAnchorEl] =
    React.useState<HTMLButtonElement | null>(null)

  const showMinMaxMenu = (event: React.MouseEvent<HTMLButtonElement>): void => {
    setEditMinMaxAnchorEl(event.currentTarget)
  }

  const hideMinMaxMenu = (): void => {
    setEditMinMaxAnchorEl(null)
  }

  const showCreateHandleMenu = (
    event: React.MouseEvent<HTMLButtonElement>,
  ): void => {
    setCreateHandleAnchorEl(event.currentTarget)
  }

  const hideCreateHandleMenu = (): void => {
    setCreateHandleAnchorEl(null)
  }

  const { min, max, controlPoints } = m

  const [minState, setMinState] = React.useState(min)
  const [maxState, setMaxState] = React.useState(max)

  const setContinuousMappingValues = useVisualStyleStore(
    (state) => state.setContinuousMappingValues,
  )

  const LINE_CHART_WIDTH = 600
  const LINE_CHART_HEIGHT = 275
  const LINE_CHART_MARGIN_LEFT = 50
  const LINE_CHART_MARGIN_RIGHT = 50
  const LINE_CHART_MARGIN_TOP = 10
  const LINE_CHART_MARGIN_BOTTOM = 50
  const HANDLE_VERTICAL_OFFSET = 70

  const [handles, setHandles] = React.useState(() => {
    return [...controlPoints]
      .sort((a, b) => (a.value as number) - (b.value as number))
      .map((pt, index) => {
        return {
          ...pt,
          id: index,
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

  const valueDomainExtent = extent(valueDomain)
  const vpValueDomainExtent = extent(vpValueDomain)
  const xScale = visXScaleLinear({
    range: [0, xMax],
    domain: valueDomainExtent as [number, number],
  })

  const yScale = visXScaleLinear({
    range: [yMax, 0],
    domain: vpValueDomainExtent as [number, number],
  })

  const xMapper = (d: [number, number]): number => xScale(xGetter(d)) ?? 0
  const yMapper = (d: [number, number]): number => yScale(yGetter(d)) ?? 0

  const updateContinuousMapping = React.useMemo(
    () =>
      debounce(
        (
          min: ContinuousFunctionControlPoint,
          max: ContinuousFunctionControlPoint,
          handles: Handle[],
          ltMinVpValue: VisualPropertyValueType,
          gtMaxVpValue: VisualPropertyValueType,
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
            ltMinVpValue,
            gtMaxVpValue,
          )
        },
        200,
        { trailing: true },
      ),
    [],
  )

  React.useEffect(() => {
    // if the mapping attribute changegs, recompute the continuous mapping
    // min, max and handles
    const nextMapping = props.visualProperty
      .mapping as ContinuousMappingFunction
    const nextMin = nextMapping.min ?? minState
    const nextMax = nextMapping.max ?? maxState
    const nextControlPoints =
      nextMapping.controlPoints ?? ([] as ContinuousFunctionControlPoint[])

    setMinState(nextMin)
    setMaxState(nextMax)
    setHandles(
      [...nextControlPoints]
        .sort((a, b) => (a.value as number) - (b.value as number))
        .map((pt, index) => {
          return {
            ...pt,
            id: index,
          }
        }),
    )
  }, [props.visualProperty.mapping?.attribute])

  const createHandle = (value: number, vpValue: number): void => {
    const newHandles = addHandle(handles, value, vpValue)

    setHandles(newHandles)
    updateContinuousMapping(
      min,
      max,
      newHandles,
      m.ltMinVpValue,
      m.gtMaxVpValue,
    )
  }

  const deleteHandle = (id: number): void => {
    const newHandles = removeHandle(handles, id)
    setHandles(newHandles)
    updateContinuousMapping(
      minState,
      maxState,
      newHandles,
      m.ltMinVpValue,
      m.gtMaxVpValue,
    )
  }

  const setHandle = (id: number, value: number, vpValue: number): void => {
    const newHandles = editHandle(handles, id, value, vpValue)
    setHandles(newHandles)
    updateContinuousMapping(
      minState,
      maxState,
      newHandles,
      m.ltMinVpValue,
      m.gtMaxVpValue,
    )
  }

  // when someone changes a handle, the new handle values may contain a new min/max value
  // update the min and max accordingly
  React.useEffect(() => {
    const [min, max] = extent(handles.map((h) => h.value as number))
    const minValue: number = minState.value as number
    if (min != null && min < minValue) {
      setMinState({
        ...minState,
        value: min,
      })
    }

    const maxValue: number = maxState.value as number
    if (max != null && max > maxValue) {
      setMaxState({
        ...maxState,
        value: max,
      })
    }
  }, [handles])

  // anytime someone changes the min value, make sure all handle values are greater than the min
  React.useEffect(() => {
    const newHandles = [...handles].map((h) => {
      return {
        ...h,
        value: Math.max(h.value as number, minState.value as number),
      }
    })
    setHandles(newHandles)

    updateContinuousMapping(
      minState,
      maxState,
      handles,
      m.ltMinVpValue,
      m.gtMaxVpValue,
    )
  }, [minState])

  // anytime someone changes the max value, make sure all handle values are less than the max
  React.useEffect(() => {
    const newHandles = [...handles].map((h) => {
      return {
        ...h,
        value: Math.min(h.value as number, maxState.value as number),
      }
    })
    setHandles(newHandles)

    updateContinuousMapping(
      minState,
      maxState,
      handles,
      m.ltMinVpValue,
      m.gtMaxVpValue,
    )
  }, [maxState])

  return (
    <Paper sx={{ backgroundColor: '#D9D9D9', pb: 2 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pt: 10,
          pb: 2,
        }}
      >
        <Paper
          elevation={4}
          sx={{
            display: 'flex',
            position: 'relative',
          }}
        >
          <Tooltip
            title="Drag handles or change the handle values to edit the mapping"
            placement="right"
          >
            <Box
              sx={{
                display: 'flex',
                position: 'relative',
                userSelect: 'none',
              }}
            >
              <LineChart
                height={LINE_CHART_HEIGHT}
                width={LINE_CHART_WIDTH}
                margin={{
                  top: LINE_CHART_MARGIN_TOP,
                  right: LINE_CHART_MARGIN_RIGHT,
                  bottom: LINE_CHART_MARGIN_BOTTOM,
                  left: LINE_CHART_MARGIN_LEFT,
                }}
                data={data as Array<[number, number]>}
                domain={valueDomain}
                range={vpValueDomain}
                domainLabel={m.attribute}
                rangeLabel={props.visualProperty.displayName}
              />
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
                      setlastDraggedHandleId(h.id)
                    }}
                    onStop={(e) => {
                      setlastDraggedHandleId(h.id)
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

                      setHandle(h.id, newValue, newVpValue)
                    }}
                    position={{
                      x: pixelPositionX,
                      y: pixelPositionY,
                    }}
                  >
                    <Box
                      onClick={() => setlastDraggedHandleId(h.id)}
                      sx={{
                        width: 2,
                        height: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        position: 'absolute',
                        zIndex: lastDraggedHandleId === h.id ? 3 : 1,
                      }}
                    >
                      <Paper
                        elevation={4}
                        sx={{
                          p: 0.5,
                          position: 'relative',
                          top: -HANDLE_VERTICAL_OFFSET - pixelPositionY,
                          zIndex: lastDraggedHandleId === h.id ? 3 : 1,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          border: '0.5px solid #03082d',
                        }}
                      >
                        <Box
                          className="handle"
                          sx={{
                            position: 'absolute',
                            width: 2,
                            top: HANDLE_VERTICAL_OFFSET,
                            height: pixelPositionY,
                            backgroundColor: '#03082d',
                            '&:hover': {
                              cursor: 'move',
                            },
                          }}
                        ></Box>

                        <IconButton
                          sx={{
                            position: 'absolute',
                            top: -20,
                            right: -20,
                          }}
                          onClick={() => deleteHandle(h.id)}
                        >
                          <Close sx={{ color: '#03082d' }} />
                        </IconButton>
                        <Box>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Typography
                              sx={{
                                width: 50,
                                minWidth: 50,
                                overflow: 'hidden',
                                whiteSpace: 'nowrap',
                                textOverflow: 'ellipsis',
                                fontWeight: 'bold',
                                fontSize: 10,
                              }}
                              variant="caption"
                            >
                              {props.visualProperty.displayName}
                            </Typography>
                            <TextField
                              sx={{ width: 50, ml: 0.5 }}
                              inputProps={{
                                sx: {
                                  p: 0.5,
                                  fontSize: 14,
                                  width: 50,
                                },
                                inputMode: 'numeric',
                                pattern: '[0-9]*',
                                step: 0.1,
                              }}
                              onChange={(e) => {
                                const newVal = Number(
                                  Number(e.target.value).toFixed(2),
                                )
                                setHandle(h.id, h.value as number, newVal)
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
                                width: 50,
                                minWidth: 50,
                                overflow: 'hidden',
                                whiteSpace: 'nowrap',
                                textOverflow: 'ellipsis',
                                fontWeight: 'bold',
                                fontSize: 10,
                              }}
                              variant="caption"
                            >
                              {m.attribute}
                            </Typography>

                            <TextField
                              sx={{ width: 50, ml: 0.5 }}
                              inputProps={{
                                sx: {
                                  p: 0.5,
                                  fontSize: 14,
                                  width: 50,
                                },
                                inputMode: 'numeric',
                                pattern: '[0-9]*',
                                step: 0.1,
                              }}
                              onChange={(e) => {
                                const newVal = Number(
                                  Number(e.target.value).toFixed(2),
                                )

                                if (!isNaN(newVal)) {
                                  setHandle(h.id, newVal, h.vpValue as number)
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
                          top: -114,
                          '&:hover': { cursor: 'move' },
                        }}
                      >
                        <ArrowDropDownIcon
                          sx={{
                            fontSize: '60px',
                            opacity: 1,
                            zIndex: 3,
                            color: '#03082d',
                          }}
                        />
                      </IconButton>
                    </Box>
                  </Draggable>
                )
              })}
              <Tooltip title="Set number value for values under the minimum.">
                <Box
                  sx={{
                    width: 2,
                    height: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    position: 'relative',
                    bottom: -LINE_CHART_HEIGHT + 50,
                    right: LINE_CHART_WIDTH - 25,
                    zIndex: 1000,
                  }}
                >
                  <VisualPropertyValueForm
                    currentValue={m.ltMinVpValue}
                    visualProperty={props.visualProperty}
                    currentNetworkId={props.currentNetworkId}
                    onValueChange={(newValue) => {
                      updateContinuousMapping(
                        min,
                        max,
                        handles,
                        newValue,
                        m.gtMaxVpValue,
                      )
                    }}
                  />
                </Box>
              </Tooltip>
              <Tooltip title="Set number value for values over the maximum.">
                <Box
                  sx={{
                    width: 2,
                    height: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    position: 'relative',
                    bottom: -LINE_CHART_HEIGHT + 50,
                    right: 25,
                    zIndex: 1000,
                  }}
                >
                  <VisualPropertyValueForm
                    currentValue={m.gtMaxVpValue}
                    visualProperty={props.visualProperty}
                    currentNetworkId={props.currentNetworkId}
                    onValueChange={(newValue) => {
                      updateContinuousMapping(
                        min,
                        max,
                        handles,
                        m.ltMinVpValue,
                        newValue,
                      )
                    }}
                  />
                </Box>
              </Tooltip>
            </Box>
          </Tooltip>
        </Paper>
      </Box>
      <Paper
        sx={{
          display: 'flex',
          p: 1,
          m: 1,
          ml: 3,
          mr: 3,
          justifyContent: 'space-evenly',
          backgroundColor: '#fcfffc',
          color: '#595858',
        }}
      >
        <Button
          onClick={showCreateHandleMenu}
          variant="outlined"
          sx={{ color: '#63a5e8' }}
          size="small"
          startIcon={<AddCircleIcon />}
        >
          New Handle
        </Button>
        <Popover
          open={createHandleAnchorEl != null}
          anchorEl={createHandleAnchorEl}
          onClose={hideCreateHandleMenu}
          anchorOrigin={{
            vertical: 'top',
            horizontal: 'center',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'center',
          }}
        >
          <Box
            sx={{
              p: 1,
              display: 'flex',
              flexDirection: 'column',
              width: 180,
            }}
          >
            <Box sx={{ p: 1, display: 'flex', flexDirection: 'column' }}>
              <TextField
                sx={{ mb: 1 }}
                variant="outlined"
                size="small"
                label={m.attribute}
                inputProps={{
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
                value={addHandleFormValue}
              />

              <TextField
                variant="outlined"
                size="small"
                label={props.visualProperty.displayName}
                inputProps={{
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
                value={addHandleFormVpValue}
              />
            </Box>
            <Button
              variant="outlined"
              onClick={() => {
                createHandle(addHandleFormValue, addHandleFormVpValue)
                hideCreateHandleMenu()
              }}
              size="small"
            >
              Add Handle
            </Button>
          </Box>
        </Popover>
        <Button
          onClick={showMinMaxMenu}
          sx={{ color: '#63a5e8' }}
          variant="outlined"
          size="small"
          startIcon={<EditIcon />}
        >
          Set Min and Max
        </Button>
        <Popover
          open={editMinMaxAnchorEl != null}
          onClose={hideMinMaxMenu}
          anchorEl={editMinMaxAnchorEl}
          anchorOrigin={{
            vertical: 'top',
            horizontal: 'center',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'center',
          }}
        >
          <Box sx={{ p: 1 }}>
            <Box>
              <Typography variant="body1">{m.attribute}</Typography>

              <Box sx={{ p: 1, display: 'flex', flexDirection: 'column' }}>
                <TextField
                  sx={{ mb: 1 }}
                  variant="outlined"
                  size="small"
                  label="Min"
                  inputProps={{
                    inputMode: 'numeric',
                    pattern: '[0-9]*',
                    step: 0.1,
                  }}
                  onChange={(e) => {
                    const newValue = Number(e.target.value)
                    if (!isNaN(newValue)) {
                      setMinState({
                        ...minState,
                        value: newValue,
                      })
                    }
                  }}
                  value={minState.value}
                />
                <TextField
                  value={maxState.value}
                  variant="outlined"
                  size="small"
                  label="Max"
                  inputProps={{
                    inputMode: 'numeric',
                    pattern: '[0-9]*',
                    step: 0.1,
                  }}
                  onChange={(e) => {
                    const newValue = Number(e.target.value)
                    if (!isNaN(newValue)) {
                      setMaxState({
                        ...maxState,
                        value: newValue,
                      })
                    }
                  }}
                />
              </Box>
            </Box>
          </Box>
        </Popover>

        <Box sx={{ display: 'none' }}>
          <Box
            sx={{
              p: 1,
              display: 'flex',
              flexDirection: 'column',
              width: 180,
            }}
          >
            <Typography variant="body2">Add handle</Typography>
            <Box sx={{ p: 1, display: 'flex', flexDirection: 'column' }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  pt: 1,
                  pb: 1,
                }}
              >
                <Typography variant="body2">{m.attribute}:</Typography>
                <TextField
                  sx={{ width: 40, ml: 0.5, mr: 0.5 }}
                  inputProps={{
                    sx: {
                      p: 0.5,
                      fontSize: 12,
                      width: 50,
                    },
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
                  value={addHandleFormValue}
                />
              </Box>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  pt: 1,
                  pb: 1,
                }}
              >
                <Typography variant="body2">
                  {props.visualProperty.displayName}:
                </Typography>
                <TextField
                  sx={{ width: 40, ml: 0.5, mr: 0.5 }}
                  inputProps={{
                    sx: {
                      p: 0.5,
                      fontSize: 12,
                      width: 50,
                    },
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
                  value={addHandleFormVpValue}
                />
              </Box>
            </Box>
            <Button
              variant="text"
              onClick={() =>
                createHandle(addHandleFormValue, addHandleFormVpValue)
              }
              size="small"
            >
              Add Handle
            </Button>
          </Box>

          <Box sx={{ p: 1, backgroundColor: '#fcfffc', color: '#595858' }}>
            <Box>
              <Typography variant="body2">{m.attribute}:</Typography>
              <Box sx={{ display: 'flex' }}>
                <TextField
                  sx={{ width: 40, ml: 0.5, mr: 0.5 }}
                  inputProps={{
                    sx: {
                      p: 0.5,
                      fontSize: 12,
                      width: 50,
                    },
                    inputMode: 'numeric',
                    pattern: '[0-9]*',
                    step: 0.1,
                  }}
                  onChange={(e) => {
                    const newValue = Number(e.target.value)
                    if (!isNaN(newValue)) {
                      setMinState({
                        ...minState,
                        value: newValue,
                      })
                    }
                  }}
                  value={minState.value}
                />
                <TextField
                  value={maxState.value}
                  sx={{ width: 40, ml: 0.5, mr: 0.5 }}
                  inputProps={{
                    sx: {
                      p: 0.5,
                      fontSize: 12,
                      width: 50,
                    },
                    inputMode: 'numeric',
                    pattern: '[0-9]*',
                    step: 0.1,
                  }}
                  onChange={(e) => {
                    const newValue = Number(e.target.value)
                    if (!isNaN(newValue)) {
                      setMaxState({
                        ...maxState,
                        value: newValue,
                      })
                    }
                  }}
                />
              </Box>
            </Box>
          </Box>
        </Box>
      </Paper>
    </Paper>
  )
}
