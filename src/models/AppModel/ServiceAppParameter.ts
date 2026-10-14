import { AppParameter } from './AppParameter'
import { ValidationType } from './ValidationType'

/**
 * A service app's parameter, as fetched from the service endpoint. The
 * shared `AppParameter` spec, with the fields the service protocol has
 * always sent as strings: every value, including checkbox and numeric ones,
 * travels as a string (`'true'`, `'10'`) both from the endpoint and back in
 * the run payload (see `buildCustomParameters`).
 */
export interface ServiceAppParameter extends AppParameter {
  // Tooltip or hint
  description: string

  defaultValue: string // Default value
  value?: string // Current/selected value

  validationType: ValidationType

  validationHelp: string

  // Ignored for certain types
  validationRegex: string
}
