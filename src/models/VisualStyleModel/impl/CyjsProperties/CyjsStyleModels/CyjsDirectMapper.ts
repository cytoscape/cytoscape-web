import { DataMapper } from './DataMapper'
import { DirectMappingSelector } from './DirectMappingSelector'

/**
 * 1-1 mapping between data and visual property value
 */
export interface CyjsDirectMapper {
  selector: DirectMappingSelector
  style: {
    [key: string]: DataMapper
  }
}
