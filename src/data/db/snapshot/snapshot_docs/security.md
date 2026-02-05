# Database Snapshot Security Documentation

## Overview

This document outlines the security risks, measures, validation requirements, and best practices for the database snapshot import/export functionality in Cytoscape Web. Allowing users to import JSON files into IndexedDB introduces several security risks, which are explained below along with how the current implementation mitigates them.

## Critical Security Risks

### 1. Prototype Pollution ⚠️ **HIGH RISK**

**What it is:**
Prototype pollution occurs when malicious JSON modifies JavaScript's prototype chain, affecting all objects in the application.

**Example Attack:**
```json
{
  "id": "network-1",
  "__proto__": { "isAdmin": true },
  "constructor": { "prototype": { "polluted": true } }
}
```

**Impact:**
- Could modify application behavior globally
- Could bypass security checks
- Could corrupt application state

**Mitigation:**
✅ `sanitizeRecord()` recursively removes `__proto__`, `constructor`, and `prototype` keys
✅ Creates new objects instead of copying references
✅ Applied to all nested objects

### 2. Denial of Service (DoS) ⚠️ **HIGH RISK**

**What it is:**
Malicious files designed to exhaust system resources (memory, CPU, disk).

**Attack Vectors:**
- **Large files**: 10GB+ JSON files crash the browser
- **Excessive records**: Millions of records exhaust memory
- **Deep nesting**: 1000+ levels cause stack overflow
- **Circular references**: Infinite loops during processing

**Example Attack:**
```json
{
  "data": {
    "cyNetworks": [/* 10 million records */],
    "deep": { "nested": { /* ... 1000 levels ... */ } }
  }
}
```

**Impact:**
- Browser tab crash
- System slowdown
- Memory exhaustion
- Application unavailability

**Mitigation:**
✅ File size limit: 100MB
✅ Record limit: 1M per store
✅ Depth limit: 10 levels
✅ Circular reference detection
✅ Early validation before processing

### 3. Memory Exhaustion ⚠️ **MEDIUM RISK**

**What it is:**
Deeply nested structures or circular references consume excessive memory.

**Example Attack:**
```json
{
  "circular": {
    "self": { /* references parent */ }
  }
}
```

**Impact:**
- Browser tab crash
- System instability
- Data loss

**Mitigation:**
✅ WeakSet-based circular reference detection
✅ Depth checking with early termination
✅ Size validation before parsing

### 4. Data Corruption ⚠️ **MEDIUM RISK**

**What it is:**
Invalid data structures corrupt the database, making it unusable.

**Attack Vectors:**
- Missing primary keys
- Wrong data types
- Invalid object store names
- Malformed relationships

**Example Attack:**
```json
{
  "data": {
    "cyNetworks": [
      { /* missing required 'id' field */ },
      { "id": null } /* invalid primary key */
    ]
  }
}
```

**Impact:**
- Database corruption
- Application errors
- Data loss
- Need to reset database

**Mitigation:**
✅ Comprehensive schema validation
✅ Primary key validation
✅ Type checking
✅ Transaction-based imports (rollback on error)

### 5. Code Injection ⚠️ **LOW RISK** (with proper handling)

**What it is:**
While `JSON.parse()` is safe, imported data could be executed if mishandled.

**Attack Vectors:**
- Data used in `eval()` or `Function()` constructors
- Data rendered as HTML without sanitization
- Data used in template strings that execute code

**Example Attack:**
```json
{
  "name": "Network ${alert('XSS')}",
  "script": "<script>maliciousCode()</script>"
}
```

**Impact:**
- Code execution in browser context
- XSS attacks
- Data theft
- Session hijacking

**Mitigation:**
✅ Safe JSON parsing (no `eval`)
✅ Data is stored, not executed
✅ Sanitization before storage
⚠️ **Note**: UI components must sanitize when rendering imported data

### 6. Cross-Site Scripting (XSS) ⚠️ **MEDIUM RISK** (UI layer)

**What it is:**
If imported data is rendered in the UI without sanitization, malicious scripts execute.

**Example Attack:**
```json
{
  "name": "<img src=x onerror='stealCookies()'>",
  "description": "<script>document.cookie</script>"
}
```

**Impact:**
- Cookie theft
- Session hijacking
- User data theft
- Malicious code execution

**Mitigation:**
✅ Import/export module stores data safely
⚠️ **UI components must sanitize** when displaying imported data
✅ Use React's built-in XSS protection
✅ Sanitize HTML if rendering user content

### 7. Data Exfiltration ⚠️ **LOW RISK**

**What it is:**
Importing data from untrusted sources could leak sensitive information.

**Attack Vectors:**
- Malicious snapshot files contain tracking code
- Data sent to external servers
- Sensitive data in logs

**Impact:**
- Privacy violation
- Data breach
- Compliance violations

**Mitigation:**
✅ User education (only import from trusted sources)
✅ Clear warnings in confirmation dialog
✅ Logging of import operations (for audit)
✅ No automatic data transmission

### 8. Version Incompatibility ⚠️ **LOW RISK**

**What it is:**
Snapshots from future versions might contain unsupported features.

**Impact:**
- Application errors
- Data loss
- Corrupted state

**Mitigation:**
✅ Version validation
✅ Rejecting incompatible future versions
✅ Warning about version mismatches

## Risk Assessment Summary

| Risk | Severity | Likelihood | Mitigation Status |
|------|----------|------------|-------------------|
| Prototype Pollution | High | Medium | ✅ Fully Mitigated |
| DoS (Large Files) | High | High | ✅ Fully Mitigated |
| DoS (Deep Nesting) | High | Medium | ✅ Fully Mitigated |
| Memory Exhaustion | Medium | Medium | ✅ Fully Mitigated |
| Data Corruption | Medium | Medium | ✅ Fully Mitigated |
| Code Injection | Low | Low | ✅ Mitigated (if UI is safe) |
| XSS | Medium | Medium | ⚠️ Requires UI sanitization |
| Data Exfiltration | Low | Low | ✅ User education |

## Current Implementation Status

### ✅ Fully Protected Against:
- Prototype pollution
- DoS attacks (size, depth, records)
- Memory exhaustion
- Data corruption
- Code injection (at storage layer)

### ⚠️ Requires Additional Protection:
- XSS (must sanitize in UI components)
- Data exfiltration (user education)

## Security Measures

### 1. File Size Limits

- **Maximum file size**: 100MB (100 * 1024 * 1024 bytes)
- Files exceeding this limit are rejected before parsing
- Prevents memory exhaustion and DoS attacks

### 2. Record Limits

- **Maximum records per object store**: 1,000,000
- Prevents excessive memory usage during import
- Protects against resource exhaustion attacks

### 3. Object Depth Limits

- **Maximum object depth**: 10 levels
- Prevents stack overflow from deeply nested structures
- Detects circular references

### 4. Input Sanitization

All imported records are sanitized to prevent:

- **Prototype Pollution**: Removes `__proto__`, `constructor`, and `prototype` keys
- **Malicious Code Injection**: Validates and sanitizes all object properties
- **Circular References**: Detects and prevents infinite loops

### 5. Schema Validation

Comprehensive validation ensures:

- Valid JSON structure
- Required metadata fields (version, exportDate, exportVersion)
- Valid object store names
- Array types for all object store data
- Required primary keys in all records

### 6. Version Compatibility

- Validates snapshot version against current database schema version
- Warns about version mismatches
- Rejects snapshots from incompatible future versions

## Validation Process

### Pre-Import Validation

1. **File Validation** (`validateSnapshotFile`):
   - File size check
   - File extension check
   - MIME type validation

2. **JSON Parsing**:
   - Safe JSON parsing with error handling
   - Size check before parsing

3. **Structure Validation** (`validateSnapshotStructure`):
   - Metadata validation
   - Data structure validation
   - Object store validation
   - Record structure sampling

### During Import

1. **Record Sanitization**:
   - Each record is sanitized before insertion
   - Dangerous keys are removed
   - Nested objects are recursively sanitized

2. **Primary Key Validation**:
   - Ensures all records have required primary keys
   - Prevents database corruption

3. **Transaction Safety**:
   - All imports use database transactions
   - Errors are caught and logged
   - Partial imports are tracked

## Error Handling

### Validation Errors

When validation fails:

- Import is rejected immediately
- Detailed error messages are provided
- No data is modified
- Errors are logged for debugging

### Import Errors

During import:

- Individual record errors are collected
- Import continues for other records
- Partial success is reported
- All errors are logged

## Logging

All security-related events are logged:

- File validation failures
- Structure validation failures
- Sanitization warnings
- Import errors
- Size limit violations

## Testing

Security measures are tested in `src/db/snapshot/snapshot.test.ts`:

- File size limit tests
- Structure validation tests
- Sanitization tests
- Security threat mitigation tests

## Configuration

Security limits are defined in `src/db/snapshot/snapshotValidator.ts`:

```typescript
export const MAX_SNAPSHOT_SIZE_BYTES = 100 * 1024 * 1024 // 100MB
export const MAX_RECORDS_PER_STORE = 1_000_000
export const MAX_OBJECT_DEPTH = 10
```

These limits can be adjusted based on application requirements, but should be carefully considered for security implications.

## Best Practices for Users

1. **Only import snapshots from trusted sources**
2. **Verify snapshot file integrity before import**
3. **Export existing database before import**
4. **Review import warnings and errors**
5. **Don't import snapshots from unknown sources**

## Best Practices for Developers

1. **Never bypass validation**
2. **Always sanitize imported data in UI**
3. **Use React's built-in XSS protection**
4. **Log all import operations**
5. **Monitor for suspicious patterns**
6. **Keep security limits up to date**
7. **Always validate before importing**
8. **Use transaction-based imports**
9. **Provide clear error messages**

## Additional Recommendations

### For Enhanced Security:

1. **Content Security Policy (CSP)**
   - Implement strict CSP headers
   - Prevent inline script execution

2. **Input Validation in UI**
   - Sanitize all user-displayed data
   - Use libraries like DOMPurify for HTML

3. **Audit Logging**
   - Log all import operations
   - Track file sources and sizes
   - Monitor for anomalies

4. **User Warnings**
   - Clear warnings about risks
   - Require explicit confirmation
   - Explain what will happen

5. **Rate Limiting**
   - Limit import frequency
   - Prevent rapid successive imports

## References

- [OWASP JSON Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Security_Cheat_Sheet.html)
- [Prototype Pollution Prevention](https://github.com/HoLyVieR/prototype-pollution-nsec18)
- [IndexedDB Security](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Basic_Concepts_Behind_IndexedDB#security)
- [XSS Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)

