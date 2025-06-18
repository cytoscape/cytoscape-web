import { Cx2 } from '../Cx2'
import { CoreAspectTag } from '../Cx2/CoreAspectTag'

/**
 * Validation options for CX validation
 */
export interface ValidationOptions {
  /** Whether to perform strict validation */
  strict?: boolean
  /** List of supported CX versions */
  supportedVersions?: string[]
}

/**
 * Represents a validation error or warning
 */
export interface ValidationIssue {
  /** Human readable message describing the issue */
  message: string
  /** Path to the invalid element in the CX structure */
  path?: string[]
  /** Severity level of the issue */
  severity: 'error' | 'warning'
}

/**
 * Result of CX validation
 */
export interface ValidationResult {
  /** Whether the CX document is valid */
  isValid: boolean
  /** List of validation errors */
  errors: ValidationIssue[]
  /** List of validation warnings */
  warnings: ValidationIssue[]
  /** CX version if found in descriptor */
  version?: string
}
