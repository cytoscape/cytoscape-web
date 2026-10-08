# 0005: Structured, Severity-Tagged Error Codes for App API

## Status

Accepted — supersedes the error-code/severity sub-decisions of
[ADR 0001](./0001-api-result-discriminated-union.md). The discriminated-union
structure ADR 0001 established (`ApiResult<T> = ApiSuccess<T> | ApiFailure`)
is unchanged and remains in effect.

## Context

`ApiError` originally carried `{ code, message }`, where `code` was a member
of a flat `ApiErrorCode` string enum (`NETWORK_NOT_FOUND`, `INVALID_INPUT`,
etc. — 11 coarse categories). Later validation-hardening work needed to
report *which* CX2 validation requirement a failure enforced (e.g. `FK1` for
a forbidden column name, `BV1` for a non-existent bypass target). Rather than
widen the category enum, that work added a second field, `cx2Code?: string`,
tagged onto the coarse category: `fail(ApiErrorCode.InvalidInput, message,
'FK1')`.

This produced a `code` that was simultaneously imprecise (`INVALID_INPUT`
covers ~15 distinct failure modes) and required a side-channel for precision.
External apps switching on `error.code` alone could not distinguish "column
name is `id`" (FK1) from "TSV import had too few lines" (a genuinely generic
input error) — both returned `INVALID_INPUT`.

Separately, an unrelated sibling repo (`research/cytoscape-beyond/cx2` — a
CX2 parsing/validation library, not a dependency of this project) has a
`DiagnosticCode` pattern that already solves this: `{ code, severity,
message }`, grouped into domain-namespaced catalogs, where `code` is
precise and load-bearing on its own.

## Decision

Replace `ApiErrorCode` + `ApiError.cx2Code` with a domain-grouped code
catalog mirroring cx2's `DiagnosticCode`:

```typescript
type ApiErrorSeverity = 'error' | 'warning'

interface ApiErrorCodeDef {
  readonly code: string
  readonly severity: ApiErrorSeverity
  readonly message: string | ((...args: any[]) => string)
}

interface ApiError {
  readonly code: string
  readonly severity: ApiErrorSeverity
  readonly message: string
}
```

Four catalogs: `ElementCodes`, `TableCodes`, `StyleCodes` (all three
CX2-derived), `AppCodes` (workspace/registry/runtime concepts with no CX2
analogue, plus a residual `INVALID_INPUT` bucket). Codes borrowed from CX2
reuse the CX2 code string verbatim as `code` — no secondary tag. Codes with
no CX2 equivalent use a new `APP1`–`APP9` namespace, chosen because it can
never collide with a future CX2 code addition (CX2's own prefixes are all
1–3 letter domain codes; `APP` is visually and namespace-distinct).

`fail()` changes from `fail(code, message, cx2Code?)` to
`fail(codeDef, ...templateArgs)`, mirroring cx2's `createDiagnostic(code,
...args)`.

`code` is typed `string`, not a closed literal union — matching cx2's own
choice. Every future code addition (e.g. `AI8` for undeclared attributes, HCX
guardrails, an export-validation code) is then a pure, non-breaking addition;
a closed union would make each one a breaking type change for any external
app that pattern-matches exhaustively.

`severity` is copied onto the runtime `ApiError`, not just the static catalog
entry, so a caller holding an `ApiFailure` can decide "log vs. surface"
without a lookup table. Three codes (`MI1`, `MI2`, `MI3`) are recorded as
`severity: 'warning'` because CX2 treats them as advisory — but `fail()`
always constructs a hard failure regardless of a code's nominal severity,
since `ApiResult` has no non-blocking channel. This is intentional and
documented per-entry: `severity` records CX2 spec intent, not a promise about
this API's blocking behavior.

## Rationale

**Why not keep `cx2Code` as a permanent secondary field?** A `code` that
requires a side-channel for precision is worse than a `code` that just *is*
precise. Prefix-matching (`VP*`, `BV*`, `MI*`, …) gives the same "coarse
category" grouping a flat enum offered, without sacrificing precision.

**Why reuse CX2 code strings instead of minting app-api-native codes for
everything?** The validation logic these codes describe already mirrors CX2
rules exactly (a forbidden column name is FK1 whether CX2 or app-api enforces
it). Minting parallel codes for the same concept would be pure duplication;
external apps already familiar with the CX2 spec recognize `FK1` directly.

**Why not decompose `exportToCx2`'s or `createNetworkFromCx2`'s failures into
per-rule codes?** `validateCX2()` (the underlying library call) returns one
aggregated error message across all validation phases, not a per-rule
diagnostic list. `APP8`/`INVALID_CX2` stays a single generic code because
there is no finer-grained signal to expose today; decomposing it would
require upgrading `validateCX2()` itself, a separate, larger effort.

**Why not add a non-blocking warning channel to `ApiResult` now, since three
codes are nominally warning-severity?** That's a materially larger change
(every `ApiSuccess` would need an optional `warnings` field, and call sites
would need to decide which failures are safe to proceed past). Recording
`severity: 'warning'` on the three affected codes captures the CX2-spec
intent for a future decision without forcing it now.

## Consequences

**Affected areas:**

- `src/app-api/types/ApiResult.ts` — new types and catalogs; `ApiErrorCode`
  removed
- All 11 files in `src/app-api/core/` — every `fail()` call site updated
- `packages/api-types` — published package; `ApiErrorCode` removed from the
  public surface (breaking change, documented in `CHANGELOG.md` with an
  old-code → new-code mapping table); version bumped `1.0.0-beta.2` →
  `1.0.0-beta.3`
- `src/app-api/api_docs/ErrorCodes.md` (new) — code-keyed reference,
  one entry per code with severity, message, returning methods, and CX2
  provenance
- `src/app-api/api_docs/Api.md` — every per-method error table tightened to
  the new codes

**Trade-offs:**

- External apps that pattern-matched on the old `ApiErrorCode` enum values
  (`'NETWORK_NOT_FOUND'`, etc.) must update to the new code strings — a
  breaking change, judged acceptable since the package is still pre-1.0.
- `code: string` (not a closed union) sacrifices exhaustiveness-checking in
  external `switch` statements for forward-compatibility. Given codes will
  keep being added as validation coverage grows (HCX guardrails, undeclared
  attributes, export validation), an open type is the right trade for this
  package's actual trajectory.
- `severity: 'warning'` on MI1/MI2/MI3 without a corresponding non-blocking
  behavior is a real (documented) inconsistency, not a clean abstraction —
  accepted as the pragmatic middle ground between "ignore CX2's severity
  entirely" and "redesign `ApiResult` now."

**Related documents:**

- [ADR 0001](./0001-api-result-discriminated-union.md) — original
  `ApiResult<T>` discriminated-union decision (structure unchanged by this
  ADR)
- [ErrorCodes.md](../../../../src/app-api/api_docs/ErrorCodes.md) — full
  code catalog
- `research/cytoscape-beyond/cx2/src/codes.ts` — the `DiagnosticCode`
  pattern this ADR adapts (external repo, not a dependency; prior art only)
