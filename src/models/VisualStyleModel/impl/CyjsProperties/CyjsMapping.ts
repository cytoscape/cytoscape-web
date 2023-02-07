import { VisualPropertyName } from '../../VisualPropertyName'
import { CyjsVisualPropertyName } from './CyjsVisualPropertyName'

export type SelectorType = 'node' | 'edge'

export type DirectMappingSelector = `${SelectorType}[${CyjsVisualPropertyName}]`

export type DataMapper = `data(${string})`

/**
 * A unit of mapping from a visual property to actual visual value (color, width, etc.)
 */
export interface CyjsDirectMapper {
  selector: DirectMappingSelector
  style: {
    [key: string]: string
  }
}

interface DirectMapperProps {
  selector: SelectorType
  vpName: VisualPropertyName
  cyjsVpName: CyjsVisualPropertyName
}

export const buildDataMapper = (props: DirectMapperProps): CyjsDirectMapper => (
  {
    selector: `${props.selector}[${props.cyjsVpName}]`,
    style: {
      [props.cyjsVpName]: `data(${props.vpName})`
    }
  }
)

