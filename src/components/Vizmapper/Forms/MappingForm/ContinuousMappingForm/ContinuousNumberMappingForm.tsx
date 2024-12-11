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
import { ExpandableNumberInput } from './ExpandableNumberInput'
import ArrowLeftIcon from '@mui/icons-material/ArrowLeft'
import ArrowRightIcon from '@mui/icons-material/ArrowRight'

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
        const handle = {
          ...pt,
          id: index,
        }
        if (index === 0) {
          handle.value = min.value
        }
        if (index === controlPoints.length - 1) {
          handle.value = max.value
        }
        return handle
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
    const newHandles = [...handles]
      .map((h) => {
        return {
          ...h,
          value: Math.max(h.value as number, minState.value as number),
        }
      })
      .sort((a, b) => (a.value as number) - (b.value as number))

    newHandles[0].value = minState.value as number
    setHandles(newHandles)

    updateContinuousMapping(
      minState,
      maxState,
      handles,
      m.ltMinVpValue,
      m.gtMaxVpValue,
    )

    setAddHandleFormValue(minState.value as number)
  }, [minState])

  // anytime someone changes the max value, make sure all handle values are less than the max
  React.useEffect(() => {
    const newHandles = [...handles]
      .map((h) => {
        return {
          ...h,
          value: Math.min(h.value as number, maxState.value as number),
        }
      })
      .sort((a, b) => (a.value as number) - (b.value as number))

    newHandles[newHandles.length - 1].value = maxState.value as number
    setHandles(newHandles)

    updateContinuousMapping(
      minState,
      maxState,
      handles,
      m.ltMinVpValue,
      m.gtMaxVpValue,
    )

    setAddHandleFormValue(minState.value as number)
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
              {handles.map((h, index) => {
                const isEndHandle = index === 0 || index === handles.length - 1
                const isMinHandle = index === 0
                const isMaxHandle = index === handles.length - 1

                const pixelPositionX =
                  xMapper([h.value as number, h.vpValue as number]) +
                  LINE_CHART_MARGIN_LEFT
                const pixelPositionY =
                  yMapper([h.value as number, h.vpValue as number]) +
                  LINE_CHART_MARGIN_TOP

                return (
                  <Draggable
                    disabled={isEndHandle}
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
                        zIndex:
                          lastDraggedHandleId === h.id
                            ? 3
                            : isEndHandle
                              ? 1
                              : 2,
                      }}
                    >
                      <Paper
                        elevation={4}
                        sx={{
                          p: 1,
                          position: 'relative',
                          top: -HANDLE_VERTICAL_OFFSET - pixelPositionY,
                          zIndex:
                            lastDraggedHandleId === h.id
                              ? 3
                              : isEndHandle
                                ? 1
                                : 2,
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
                            backgroundColor: isEndHandle
                              ? '#D9D9D9'
                              : '#03082d',
                            '&:hover': {
                              cursor: 'move',
                            },
                          }}
                        ></Box>

                        {handles.length >= 3 && !isEndHandle ? (
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
                        ) : !isEndHandle ? (
                          <IconButton
                            sx={{
                              position: 'absolute',
                              top: -20,
                              right: -20,
                            }}
                            onClick={() => deleteHandle(h.id)}
                          >
                            <Close
                              sx={{
                                color: 'rgba(0, 0, 0, 0.3)',
                                pointerEvents: 'none',
                              }}
                            />
                          </IconButton>
                        ) : null}
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
                            <ExpandableNumberInput
                              value={h.vpValue as number}
                              onConfirm={(newVal) => {
                                setHandle(h.id, h.value as number, newVal)
                              }}
                            ></ExpandableNumberInput>
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
                            <ExpandableNumberInput
                              value={h.value as number}
                              onConfirm={(newValue) => {
                                if (isMinHandle) {
                                  setMinState({ ...minState, value: newValue })
                                } else if (isMaxHandle) {
                                  setMaxState({ ...maxState, value: newValue })
                                } else {
                                  setHandle(h.id, newValue, h.vpValue as number)
                                }
                              }}
                              min={
                                isMinHandle
                                  ? undefined
                                  : (minState.value as number)
                              }
                              max={
                                isMaxHandle
                                  ? undefined
                                  : (maxState.value as number)
                              }
                            />
                          </Box>
                        </Box>
                      </Paper>
                      <IconButton
                        disabled={isEndHandle}
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
                            color: isEndHandle ? '#D9D9D9' : '#03082d',
                          }}
                        />
                      </IconButton>
                    </Box>
                  </Draggable>
                )
              })}
            </Box>
          </Tooltip>
          <Tooltip
            placement="top"
            title={`${m.attribute} values less than the minmum (${minState.value}) will be mapped to this height value (${m.ltMinVpValue}).`}
          >
            <Paper
              sx={{
                width: 50,
                height: 50,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'absolute',
                bottom: '130px',
                right: '610px',
              }}
            >
              <ArrowLeftIcon
                sx={{ fontSize: 40, position: 'absolute', left: -25 }}
              />
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
            </Paper>
          </Tooltip>

          <Tooltip
            placement="top"
            title={`${m.attribute} values greater than the maximum (${maxState.value}) will be mapped to this height value (${m.gtMaxVpValue}).`}
          >
            <Paper
              sx={{
                width: 50,
                height: 50,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'absolute',
                bottom: '130px',
                right: '-60px',
              }}
            >
              <ArrowRightIcon
                sx={{ fontSize: 40, position: 'absolute', left: 35 }}
              />
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
            </Paper>
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
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                {m.attribute}
                <ExpandableNumberInput
                  min={minState.value as number}
                  max={maxState.value as number}
                  value={addHandleFormValue}
                  onConfirm={(newVal) => {
                    setAddHandleFormValue(newVal)
                  }}
                ></ExpandableNumberInput>
              </Box>

              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                {props.visualProperty.displayName}
                <ExpandableNumberInput
                  value={addHandleFormVpValue}
                  onConfirm={(newVal) => {
                    setAddHandleFormVpValue(newVal)
                  }}
                ></ExpandableNumberInput>
              </Box>
            </Box>
            {!(
              addHandleFormValue < (maxState.value as number) &&
              addHandleFormValue > (minState.value as number)
            ) ? (
              <Typography color="error" variant="caption">
                {`Handle value must be between ${min.value as number} and ${
                  max.value as number
                }`}
              </Typography>
            ) : null}
            <Button
              variant="outlined"
              disabled={
                !(
                  addHandleFormValue < (maxState.value as number) &&
                  addHandleFormValue > (minState.value as number)
                )
              }
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
          <Box sx={{ p: 1, width: 200 }}>
            <Box>
              <Typography variant="body1">{m.attribute}</Typography>
              <Box sx={{ p: 1 }}>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Typography variant="body2">Minimum Value</Typography>

                  <ExpandableNumberInput
                    value={minState.value as number}
                    max={maxState.value as number}
                    onConfirm={(newVal) => {
                      setMinState({
                        ...minState,
                        value: newVal,
                      })
                    }}
                  ></ExpandableNumberInput>
                </Box>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Typography variant="body2">Maximum Value</Typography>

                  <ExpandableNumberInput
                    value={maxState.value as number}
                    min={minState.value as number}
                    onConfirm={(newVal) => {
                      setMaxState({
                        ...maxState,
                        value: newVal,
                      })
                    }}
                  ></ExpandableNumberInput>
                </Box>
              </Box>
            </Box>
          </Box>
        </Popover>
      </Paper>
    </Paper>
  )
}
