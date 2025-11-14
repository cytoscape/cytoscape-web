/**
 * @fileoverview Database Snapshot Validation Module
 *
 * This module provides comprehensive validation for database snapshot files
 * to ensure data integrity, security, and compatibility before import.
 *
 * @module db/snapshot/snapshotValidator
 */

import { logDb } from '../../debug'
import { ObjectStoreNames } from '../index'

/**
 * Maximum allowed file size for database snapshots (100MB)
 */
export const MAX_SNAPSHOT_SIZE_BYTES = 100 * 1024 * 1024

/**
 * Maximum number of records allowed per object store (1 million)
 */
export const MAX_RECORDS_PER_STORE = 1_000_000

/**
 * Maximum depth for nested objects in records (10 levels)
 */
export const MAX_OBJECT_DEPTH = 10

/**
 * Validation result for database snapshot validation
 */
export interface SnapshotValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  errorMessage?: string
}

/**
 * Validates the structure of a database snapshot object.
 *
 * @param snapshot - The database snapshot object to validate
 * @param currentVersion - Current database schema version
 * @returns Validation result with errors and warnings
 */
export const validateSnapshotStructure = (
  snapshot: any,
  currentVersion: number,
): SnapshotValidationResult => {
  const errors: string[] = []
  const warnings: string[] = []

  // Check if snapshot is an object
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
    errors.push('Snapshot must be a valid JSON object')
    return {
      isValid: false,
      errors,
      warnings,
      errorMessage: errors.join('; '),
    }
  }

  // Validate metadata
  if (!snapshot.metadata) {
    errors.push('Snapshot is missing required "metadata" field')
  } else {
    const { metadata } = snapshot

    if (typeof metadata !== 'object' || Array.isArray(metadata)) {
      errors.push('Metadata must be an object')
    } else {
      // Validate version
      if (typeof metadata.version !== 'number') {
        errors.push('Metadata.version must be a number')
      } else if (metadata.version < 1) {
        errors.push('Metadata.version must be a positive integer')
      } else if (metadata.version > currentVersion + 1) {
        errors.push(
          `Snapshot version (${metadata.version}) is too new. Maximum supported: ${currentVersion + 1}`,
        )
      } else if (metadata.version > currentVersion) {
        warnings.push(
          `Snapshot version (${metadata.version}) is newer than current version (${currentVersion}). Some features may not be available.`,
        )
      }

      // Validate exportDate
      if (typeof metadata.exportDate !== 'string') {
        errors.push('Metadata.exportDate must be a string')
      } else {
        const date = new Date(metadata.exportDate)
        if (isNaN(date.getTime())) {
          errors.push('Metadata.exportDate must be a valid ISO date string')
        }
      }

      // Validate exportVersion
      if (typeof metadata.exportVersion !== 'string') {
        errors.push('Metadata.exportVersion must be a string')
      }

      // Validate buildId (optional)
      if (
        metadata.buildId !== undefined &&
        typeof metadata.buildId !== 'string'
      ) {
        errors.push('Metadata.buildId must be a string if provided')
      }

      // Validate buildDate (optional)
      if (metadata.buildDate !== undefined) {
        if (typeof metadata.buildDate !== 'string') {
          errors.push('Metadata.buildDate must be a string if provided')
        } else {
          const date = new Date(metadata.buildDate)
          if (isNaN(date.getTime())) {
            errors.push(
              'Metadata.buildDate must be a valid ISO date string if provided',
            )
          }
        }
      }
    }
  }

  // Validate data field
  if (!snapshot.data) {
    errors.push('Snapshot is missing required "data" field')
  } else if (
    typeof snapshot.data !== 'object' ||
    Array.isArray(snapshot.data)
  ) {
    errors.push('Data must be an object')
  } else {
    // Validate object stores
    const validStoreNames = Object.values(ObjectStoreNames)
    const dataKeys = Object.keys(snapshot.data)

    // Check for unknown object stores
    for (const key of dataKeys) {
      if (!validStoreNames.includes(key as ObjectStoreNames)) {
        warnings.push(`Unknown object store "${key}" will be ignored`)
      }
    }

    // Validate each object store's data is an array
    for (const storeName of validStoreNames) {
      if (snapshot.data[storeName] !== undefined) {
        if (!Array.isArray(snapshot.data[storeName])) {
          errors.push(
            `Object store "${storeName}" data must be an array, got ${typeof snapshot.data[storeName]}`,
          )
        } else {
          const records = snapshot.data[storeName]
          if (records.length > MAX_RECORDS_PER_STORE) {
            errors.push(
              `Object store "${storeName}" has too many records (${records.length}). Maximum allowed: ${MAX_RECORDS_PER_STORE}`,
            )
          }

          // Validate record structure
          for (let i = 0; i < Math.min(records.length, 100); i++) {
            // Sample first 100 records for structure validation
            const record = records[i]
            if (record === null || record === undefined) {
              errors.push(
                `Object store "${storeName}" contains null/undefined record at index ${i}`,
              )
              continue
            }

            if (typeof record !== 'object' || Array.isArray(record)) {
              errors.push(
                `Object store "${storeName}" record at index ${i} must be an object`,
              )
              continue
            }

            // Check for circular references and excessive depth
            const depth = getObjectDepth(record)
            if (depth > MAX_OBJECT_DEPTH) {
              errors.push(
                `Object store "${storeName}" record at index ${i} exceeds maximum depth (${depth} > ${MAX_OBJECT_DEPTH})`,
              )
            }
          }
        }
      }
    }
  }

  // Check for suspicious patterns (security)
  const snapshotString = JSON.stringify(snapshot)
  if (snapshotString.length > MAX_SNAPSHOT_SIZE_BYTES) {
    errors.push(
      `Snapshot size (${snapshotString.length} bytes) exceeds maximum allowed size (${MAX_SNAPSHOT_SIZE_BYTES} bytes)`,
    )
  }

  // Check for potential prototype pollution
  if (
    snapshotString.includes('__proto__') ||
    snapshotString.includes('constructor')
  ) {
    warnings.push(
      'Snapshot contains potentially suspicious patterns. Proceed with caution.',
    )
  }

  const isValid = errors.length === 0
  const errorMessage = errors.length > 0 ? errors.join('; ') : undefined

  return {
    isValid,
    errors,
    warnings,
    errorMessage,
  }
}

/**
 * Calculates the maximum depth of a nested object.
 *
 * @param obj - Object to analyze
 * @param currentDepth - Current depth (internal use)
 * @param visited - Set of visited objects to detect circular references
 * @returns Maximum depth of the object
 */
const getObjectDepth = (
  obj: any,
  currentDepth = 0,
  visited = new WeakSet(),
): number => {
  if (currentDepth > MAX_OBJECT_DEPTH) {
    return currentDepth
  }

  if (obj === null || obj === undefined) {
    return currentDepth
  }

  if (typeof obj !== 'object') {
    return currentDepth
  }

  // Detect circular references
  if (visited.has(obj)) {
    return currentDepth
  }

  visited.add(obj)

  let maxDepth = currentDepth

  if (Array.isArray(obj)) {
    for (const item of obj) {
      const depth = getObjectDepth(item, currentDepth + 1, visited)
      maxDepth = Math.max(maxDepth, depth)
    }
  } else {
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const depth = getObjectDepth(obj[key], currentDepth + 1, visited)
        maxDepth = Math.max(maxDepth, depth)
      }
    }
  }

  return maxDepth
}

/**
 * Validates a snapshot file before import.
 *
 * @param file - File object to validate
 * @returns Validation result
 */
export const validateSnapshotFile = (file: File): SnapshotValidationResult => {
  const errors: string[] = []
  const warnings: string[] = []

  // Check file size
  if (file.size > MAX_SNAPSHOT_SIZE_BYTES) {
    errors.push(
      `File size (${file.size} bytes) exceeds maximum allowed size (${MAX_SNAPSHOT_SIZE_BYTES} bytes)`,
    )
  }

  // Check file type
  if (!file.name.endsWith('.json')) {
    warnings.push('File does not have .json extension')
  }

  // Check MIME type if available
  if (file.type && file.type !== 'application/json' && file.type !== '') {
    warnings.push(
      `File MIME type is "${file.type}", expected "application/json"`,
    )
  }

  const isValid = errors.length === 0
  const errorMessage = errors.length > 0 ? errors.join('; ') : undefined

  return {
    isValid,
    errors,
    warnings,
    errorMessage,
  }
}

/**
 * Sanitizes a record to prevent prototype pollution and other security issues.
 *
 * @param record - Record to sanitize
 * @returns Sanitized record
 */
export const sanitizeRecord = (record: any): any => {
  if (record === null || record === undefined) {
    return record
  }

  if (typeof record !== 'object') {
    return record
  }

  // Create a new object to avoid prototype pollution
  const sanitized: any = Array.isArray(record) ? [] : {}

  for (const key in record) {
    // Skip prototype properties
    if (!Object.prototype.hasOwnProperty.call(record, key)) {
      continue
    }

    // Skip dangerous keys
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      logDb.warn(`[sanitizeRecord] Skipping dangerous key: ${key}`)
      continue
    }

    const value = record[key]

    // Recursively sanitize nested objects
    if (value !== null && typeof value === 'object') {
      sanitized[key] = sanitizeRecord(value)
    } else {
      sanitized[key] = value
    }
  }

  return sanitized
}
