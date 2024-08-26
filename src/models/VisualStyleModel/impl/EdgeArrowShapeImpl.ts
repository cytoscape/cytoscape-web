import { EdgeArrowShapeType } from '../VisualPropertyValue'

export const isOpenShape = (shape: string): boolean => {
  try {
    if (shape.includes('open_')) {
      return true
    } else {
      return false
    }
  } catch (e) {
    console.error(e)
    return false
  }
}

export const openShapeToFilledShape = (
  shape: EdgeArrowShapeType,
): EdgeArrowShapeType => {
  if (shape === EdgeArrowShapeType.OpenDelta) {
    return EdgeArrowShapeType.Triangle
  }

  if (shape === EdgeArrowShapeType.OpenCrossDelta) {
    return EdgeArrowShapeType.TriangleCross
  }
  if (isOpenShape(shape)) {
    return shape.replace('open_', '') as EdgeArrowShapeType
  }
  return shape
}
