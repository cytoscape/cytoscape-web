# 0001: Use Discriminated Union `ApiResult<T>` for Facade API Error Handling

## Status

Accepted

## Context

The facade API layer (`src/app-api/`) introduces a public contract for external apps loaded via Module Federation. External apps call facade hooks that wrap internal store operations. These internal operations can fail for many reasons: invalid network IDs, missing nodes/edges, CX2 validation failures, and unexpected runtime errors.

A consistent error handling pattern is needed across all 8 facade hooks (~30+ operations). The pattern must:

- Be safe across Module Federation boundaries (thrown exceptions may not propagate correctly between separately bundled modules)
- Provide machine-readable error codes for programmatic handling
- Support TypeScript type narrowing so callers get correct types without casts
- Align with the codebase's preference for plain objects over class instances

Three alternatives were evaluated.

## Decision

All facade API operations return `ApiResult<T>`, a discriminated union on the `success` boolean field:

```typescript
interface ApiSuccess<T = void> {
  readonly success: true
  readonly data: T
}

interface ApiFailure {
  readonly success: false
  readonly error: { readonly code: ApiErrorCode; readonly message: string }
}

type ApiResult<T = void> = ApiSuccess<T> | ApiFailure
```

Helper functions `ok()` and `fail()` construct results. Type guards `isOk()` and `isFail()` are provided for functional pipelines.

Key sub-decisions:

- **`T = void` default** — Most write operations return no data. Callers use `ok()` without a type parameter.
- **`readonly` on all properties** — Result objects are immutable after creation. Compile-time enforcement.
- **No `cause` or `details` field** — Internal exceptions are logged via the `debug` logger, not exposed to external apps. The error model stays simple; a `details` field can be added later without breaking changes.
- **No `Object.freeze()`** — `readonly` provides compile-time safety. Runtime freezing adds overhead with no practical benefit since external apps have no reason to mutate results.
- **Named functions, not arrow functions** — Better stack traces and hoistable.
- **`fail()` takes primitives, not `ApiError` object** — Avoids requiring callers to construct an object literal for every failure.

## Rationale

### Alternative 1: Thrown exceptions (rejected)

```typescript
// Caller must try/catch
try {
  const nodeId = api.createNode(networkId, [100, 200])
} catch (e) {
  if (e instanceof ApiError) { ... }
}
```

**Rejected because:**

- Exceptions may not propagate correctly across Module Federation boundaries (different webpack runtimes)
- Callers who forget `try/catch` get uncaught exceptions
- No compile-time enforcement that errors are handled
- `instanceof` checks are unreliable across module boundaries (different class instances)

### Alternative 2: Class-based `Result<T, E>` (rejected)

```typescript
class Result<T, E> {
  map<U>(fn: (t: T) => U): Result<U, E> { ... }
  flatMap<U>(fn: (t: T) => Result<U, E>): Result<U, E> { ... }
}
```

**Rejected because:**

- Class instances are not serializable (breaks potential future event/message patterns)
- The codebase uses plain objects and `as const` patterns throughout, not classes
- Adds complexity (monadic API) that external app developers may not be familiar with
- `instanceof` unreliable across Module Federation boundaries

### Alternative 3: Separate return + error code (rejected)

```typescript
interface ApiReturn<T> {
  data?: T
  error?: string
  errorCode?: ApiErrorCode
}
```

**Rejected because:**

- No discriminated union — TypeScript cannot narrow the type based on a single check
- `data` and `error` are both optional, leading to ambiguous states
- Callers must check both `data !== undefined` and `error === undefined`

## Consequences

**Affected areas:**

- All 8 facade hooks (`useElementApi`, `useNetworkApi`, etc.) must return `ApiResult<T>`
- Internal hooks (`useCreateNode`, `useCreateEdge`, etc.) already return result-like objects; the facade wraps and converts them
- External app developers learn one pattern for all error handling
- `ApiErrorCode` is a closed set defined by the host — external apps cannot add custom codes

**Trade-offs:**

- Every facade call requires an `if (result.success)` check — slightly more verbose than direct returns
- `void` data on success for write operations means callers get `undefined` even on success — acceptable since the success flag is the primary signal
- No stack traces in error results — deliberate, since internal details should not leak to external apps

**Related documents:**

- [phase1a-shared-types-design.md](../design/module-federation/phase1a-shared-types-design.md) § 3.1 — Full type definitions and helper implementations
- [facade-api-specification.md](../design/module-federation/facade-api-specification.md) § 1.3 — Shared result types specification
