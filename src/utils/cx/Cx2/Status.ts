import { Aspect } from './Aspect'

/**
 * Final element in the CX2 stream
 */
export interface Status extends Aspect {
  status: [
    {
      readonly error?: string
      readonly success: boolean
    }
  ]
}
