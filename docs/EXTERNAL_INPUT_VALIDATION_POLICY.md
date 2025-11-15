# External Input Validation Policy

## Overview

This document outlines the application's policy for validating external inputs, specifically focusing on CX2 (Cytoscape Exchange Format version 2) network data. All external CX2 data must be validated before being processed or stored in the application to ensure data integrity, security, and application stability.

## Policy Statement

**All CX2 data imported from external sources MUST be validated using the `validateCX2` function before being processed, stored, or used within the application.**

## Validation Requirements

### What Gets Validated

The `validateCX2` function performs comprehensive validation of CX2 data, including:

1. **Structure Validation**: Ensures the data is a valid CX2 array structure with proper version (2.0) and aspect format
2. **Metadata Validation**: Verifies that metadata aspects are consistent with the actual data
3. **Referential Integrity**: Validates that:
   - All nodes have unique IDs
   - All edges have unique IDs
   - Edge source and target IDs reference valid nodes
   - Node and edge bypasses reference valid entities
4. **Attribute Validation**: Validates that node, edge, and network attributes conform to their declared types and schemas

### Validation Function

The validation is performed using `validateCX2` from `src/models/CxModel/impl/validator.ts`:

```typescript
import { validateCX2 } from '../models/CxModel/impl/validator'

const validationResult = validateCX2(cxData)
if (!validationResult.isValid) {
  // Handle validation errors
  const errorMessages = validationResult.errorMessage
  throw new Error(`Invalid CX2 network: ${errorMessages}`)
}
```

The `validateCX2` function returns a `ValidationResult` object with:
- `isValid`: Boolean indicating if the data is valid
- `errors`: Array of validation errors
- `warnings`: Array of validation warnings
- `errorMessage`: Formatted error message (automatically generated when validation fails)

### Where Validation Is Required

All entry points that receive CX2 data from external sources must validate the data:

1. **File Uploads** (`src/features/ToolBar/FileUpload.tsx`):
   - When users upload `.cx2` files
   - Validation must occur before parsing and processing

2. **URL Imports** (`src/models/CxModel/fetchUrlCxUtil.ts`):
   - When fetching CX2 data from remote URLs
   - Validation must occur after fetching and before processing

3. **NDEx API** (`src/api/ndex/network.ts`, `src/api/ndex/query.ts`):
   - When fetching networks from NDEx
   - When executing NDEx queries that return CX2 data
   - Validation should be performed when data is received

4. **Service Apps** (`src/features/ServiceApps/resultHandler/`):
   - When service apps return CX2 data (`addNetworks.ts`, `updateNetwork.ts`)
   - Validation must occur before processing the response

5. **External Applications** (`src/externalapps/`):
   - When external applications provide CX2 data
   - Validation must occur before integration into the application

## Error Handling

When validation fails:

1. **Log the Error**: Use appropriate logging functions (`logApi`, `logUi`, etc.) to record validation failures
2. **Display User-Friendly Messages**: Use the `errorMessage` field from `ValidationResult` to display clear error messages to users
3. **Do Not Process Invalid Data**: Never process, store, or use invalid CX2 data
4. **Provide Context**: Include information about what was being attempted when validation failed

Example error handling:

```typescript
const validationResult = validateCX2(cxData)
if (!validationResult.isValid) {
  logApi.warn(
    `[functionName]: Invalid CX2 network: ${validationResult.errors.length} error(s) found`,
    cxData,
  )
  logApi.warn(
    `[functionName]: Validation details: ${validationResult.errorMessage}`,
  )
  // Show user-friendly error message
  addMessage({
    message: `Failed to load network: ${validationResult.errorMessage}`,
    severity: MessageSeverity.ERROR,
  })
  return // or throw error
}
```

## Implementation Guidelines

1. **Always Use `validateCX2`**: Use `validateCX2` instead of `isValidCx2Network` when you need detailed error information
2. **Check `errorMessage` First**: When displaying errors to users, use the `errorMessage` field which provides a formatted, user-friendly message
3. **Log Validation Failures**: Always log validation failures with appropriate context
4. **Fail Fast**: Validate data as early as possible in the processing pipeline
5. **Consistent Error Messages**: Use the formatted error message from `ValidationResult.errorMessage` for consistency

## Testing

When testing components that handle external CX2 data:

1. Test with valid CX2 files
2. Test with invalid CX2 files (malformed structure, missing required fields, etc.)
3. Verify that validation errors are properly logged and displayed
4. Verify that invalid data is not processed or stored

## References

- [CX2 Specification](https://cytoscape.org/cx/cx2/specification/cytoscape-exchange-format-specification-(version-2)/)
- Validation implementation: `src/models/CxModel/impl/validator.ts`
- Error formatting: `src/models/CxModel/impl/formatValidationErrors.ts`


