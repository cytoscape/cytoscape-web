import { ValidationResult } from '../Cx2/Validator'

/**
 * Formats validation errors into a human-readable error message.
 *
 * @param validationResult - The validation result containing errors and warnings
 * @returns A formatted error message string suitable for display to users
 */
export const formatValidationErrors = (
  validationResult: ValidationResult,
): string => {
  const uniqueErrors = Array.from(
    new Set(validationResult.errors.map((err) => err.message)),
  )
  const errorMessage = uniqueErrors.join('\n')
  const specUrl =
    'https://cytoscape.org/cx/cx2/specification/cytoscape-exchange-format-specification-(version-2)/'

  if (errorMessage) {
    return `Invalid CX2 network: ${errorMessage}\nPlease see the CX2 spec for full details ${specUrl}`
  }

  return `Invalid CX2 network. Please see the CX2 spec for full details ${specUrl}`
}

