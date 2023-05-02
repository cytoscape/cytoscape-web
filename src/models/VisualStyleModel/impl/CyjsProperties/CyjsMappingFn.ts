import { VisualPropertyName } from '../../VisualPropertyName'
import { CyjsDirectMapper } from './CyjsStyleModels/CyjsDirectMapper'
import { SelectorType } from './CyjsStyleModels/SelectorType'
import { CyjsVisualPropertyType } from './CyjsVisualPropertyName'

interface DirectMapperProps {
  selector: SelectorType // node or edge
  vpName: VisualPropertyName // Common visual property name, not cyjs one
  cyjsVpName: CyjsVisualPropertyType // VP names used in Cyjs
}

/**
 *
 * From a given props, create an entry for the Cyjs-compatible direct mapper
 *
 * @param props
 * @returns
 */
export const toDataMapper = (props: DirectMapperProps): CyjsDirectMapper => ({
  selector: `${props.selector}[${props.vpName}]`,
  style: {
    [props.cyjsVpName]: `data(${props.vpName})`,
  },
})
