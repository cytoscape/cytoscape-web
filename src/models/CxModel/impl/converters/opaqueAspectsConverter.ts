import { OpaqueAspects } from '../../../OpaqueAspectModel'
import { Cx2 } from '../../Cx2'
import { CoreAspectTag } from '../../Cx2/CoreAspectTag'

/**
 * Create optional aspects from CX2
 *
 * Filters out core CX2 aspects and returns only optional/custom aspects.
 *
 * @param cx2 - CX2 data object
 * @returns Array of optional Aspects (opaque aspects)
 */
export const createOpaqueAspectsFromCx = (cx2: Cx2): OpaqueAspects[] => {
  const CoreAspectTagValueSet = new Set<string>(
    Object.values(CoreAspectTag) as string[],
  )
  const opaqueAspects: OpaqueAspects[] = []
  for (const entry of cx2) {
    if (entry !== undefined) {
      const key = Object.keys(entry)[0]
      if (
        !CoreAspectTagValueSet.has(key) &&
        key !== 'status' &&
        key !== 'CXVersion'
      ) {
        opaqueAspects.push(entry as OpaqueAspects)
      }
    }
  }
  return opaqueAspects
}
