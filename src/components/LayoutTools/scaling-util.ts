/**
 * Compute scaling factor from the slider position
 *
 * @param value value from the slider
 * @returns actual scaling factor
 */
export const calcScale = (value: number): number => {
  let scale = 1.0
  if (value < 0) {
    scale = (10 - Math.abs(value)) / 10
  } else {
    scale = value + 1.0
  }

  return scale
}
