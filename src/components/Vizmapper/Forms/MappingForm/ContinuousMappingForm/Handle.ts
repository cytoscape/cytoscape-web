import { ValueType } from '../../../../../models/TableModel'
import { ContinuousFunctionControlPoint } from '../../../../../models/VisualStyleModel/VisualMappingFunction/ContinuousMappingFunction'
import { VisualPropertyValueType } from '../../../../../models/VisualStyleModel'

export interface Handle extends ContinuousFunctionControlPoint {
  id: number
  value: ValueType
  vpValue: VisualPropertyValueType
}

export const addHandle = (
  handles: Handle[],
  value: ValueType,
  vpValue: VisualPropertyValueType,
): Handle[] => {
  let newHandleId = 0
  const handleIds = new Set(handles.map((h) => h.id))
  while (handleIds.has(newHandleId)) {
    newHandleId++
  }

  const newHandle = {
    id: newHandleId,
    value,
    vpValue,
  }

  const newHandles = [...handles, newHandle].sort(
    (a, b) => (a.value as number) - (b.value as number),
  )

  return newHandles
}

export const removeHandle = (handles: Handle[], handleId: number): Handle[] => {
  const handleIndex = handles.findIndex((handle) => handle.id === handleId)
  if (handleIndex >= 0) {
    const newHandles = [...handles]
    newHandles.splice(handleIndex, 1)
    return newHandles
  } else {
    return handles
  }
}

export const editHandle = (
  handles: Handle[],
  id: number,
  value: ValueType,
  vpValue: VisualPropertyValueType,
): Handle[] => {
  const handleIndex = handles.findIndex((handle) => handle.id === id)

  if (handleIndex >= 0) {
    const newHandles = [...handles]
    newHandles[handleIndex].value = value
    newHandles[handleIndex].vpValue = vpValue
    newHandles.sort((a, b) => (a.value as number) - (b.value as number))
    return newHandles
  } else {
    return handles
  }
}
