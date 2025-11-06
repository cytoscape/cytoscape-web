import { DataMapper } from './dataMapper'
import { DirectMappingSelector } from './directMappingSelector'

/**
 * 1-1 mapping between data and visual property value
 */
export interface CyjsDirectMapper {
  selector: DirectMappingSelector
  style: {
    [key: string]: DataMapper
  }
}
