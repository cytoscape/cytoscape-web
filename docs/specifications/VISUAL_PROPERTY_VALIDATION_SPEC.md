# Visual Property Validation for the CX2 Validator — Design Spec

> **Status:** Design proposal (CW-594). This document describes *what* to build
> and *how* to wire it in. It is intentionally implementation-ready but no code
> has been written yet. Read
> [`EXTERNAL_INPUT_VALIDATION_POLICY.md`](./EXTERNAL_INPUT_VALIDATION_POLICY.md)
> first — it defines the validator's contract and the entry points that call it.

## 1. Motivation

CW-594 asks the CX2 validator to check the `visualProperties` aspect, which it
currently ignores entirely. The ticket lists a non-exhaustive set of tasks:

1. Validate visual property **values** (e.g. a color VP holding a valid color,
   a numeric VP holding a number).
2. Validate the **structure** of `PASSTHROUGH` / `DISCRETE` / `CONTINUOUS`
   mappings.
3. Produce **warnings** when a mapping references a column (attribute) that does
   not exist in the corresponding node/edge `attributeDeclarations`.

Today an invalid or malformed visual style either silently produces a broken
style on import (`visualStyleConverter` swallows unknown props) or, worse,
throws deep in conversion with no actionable message.

## 2. Where this fits today

| Concern | Location |
| --- | --- |
| Validator entry point | `src/models/CxModel/impl/validator.ts` → `validateCX2()` (line ~553) |
| Existing sub-validators | `validateCx2Structure`, `validateCx2Metadata`, `validateCx2ReferentialIntegrity`, `validateCx2Attributes` |
| Aspect lookup helper | `findAspect(cx, aspectKey)` (validator.ts:7) |
| Result & issue types | `src/models/CxModel/Cx2/Validator.ts` (`ValidationResult`, `ValidationIssue`) |
| Error-message formatting | `src/models/CxModel/impl/formatValidationErrors.ts` |
| CX VP aspect shape | `src/models/CxModel/Cx2/CoreAspects/VisualProperties.ts` |
| VP name ↔ CX name + value type table | `src/models/VisualStyleModel/impl/cxVisualPropertyConverter.ts` (`cxVisualPropertyConverter`, line ~361) |
| CX mapping shapes | `cxVisualPropertyConverter.ts` (`CXPassthroughMappingFunction`, `CXDiscreteMappingFunction`, `CXContinuousMappingFunction`, union `CXVisualMappingFunction`) |
| Import-time consumer | `src/models/CxModel/impl/converters/visualStyleConverter.ts` (`createVisualStyleFromCx`) |

### The CX2 `visualProperties` shape (recap)

```jsonc
{
  "visualProperties": [
    {
      "default": {
        "node":    { "NODE_SHAPE": "ellipse", "NODE_WIDTH": 40, ... },
        "edge":    { "EDGE_WIDTH": 2, ... },
        "network": { "NETWORK_BACKGROUND_COLOR": "#FFFFFF", ... }
      },
      "nodeMapping": {
        "NODE_BACKGROUND_COLOR": {
          "type": "DISCRETE",
          "definition": { "attribute": "group", "map": [ { "v": "A", "vp": "#FF0000" } ], "type": "string" }
        }
      },
      "edgeMapping": { ... }
    }
  ]
}
```

`VisualProperty` (VisualProperties.ts) types `nodeMapping` / `edgeMapping` as
`Record<string, object>` and `default.{node,edge,network}` as
`Record<string, object>`, so there is currently **no** compile-time or runtime
guarantee about their contents. That is exactly the gap.

## 3. Validator contract to honor

From `Validator.ts`:

```ts
interface ValidationIssue { message: string; path?: (string|number)[]; severity: 'error' | 'warning' }
interface ValidationResult { isValid: boolean; errors: ValidationIssue[]; warnings: ValidationIssue[]; version?: string; errorMessage?: string }
```

- `isValid === (errors.length === 0)`. **Warnings never flip `isValid`.**
- `validateCX2` runs sub-validators in sequence and **short-circuits** (early
  return) on the first sub-validator whose `isValid` is false; otherwise it
  merges `errors`/`warnings`.

### Severity policy for CW-594 (decision)

Per the CW-594 clarification, visual-property validation is **advisory**:

- **All findings are `warnings`**, never `errors`. A network with a bad VP value
  or a mapping on a missing column must still **load** — the visual style just
  degrades gracefully (as the converter already does).
- Because warnings never set `isValid = false`, the new sub-validator will never
  short-circuit the pipeline. This is the lowest-risk choice: no network that
  loads today will start failing.
- **However**, warnings are currently dropped from the user-facing message
  (`formatValidationErrors` only joins `errors`). To make CW-594 useful we must
  also surface warnings — see §6.

> If a future decision wants hard blocking for a subset (e.g. structurally
> malformed mappings), promote only those specific issues to `severity: 'error'`.
> The structure below is written so that promotion is a one-line change per rule.

## 4. What to validate

### 4.1 Aspect presence & shape

- If there is no `visualProperties` aspect → **no-op** (valid, no warnings).
- If present, it must be an array with (at most) one element (CX2 uses a single
  VP object). If it is empty → no-op. If element 0 is missing `default` →
  warning `visualProperties[0] is missing a "default" block`.

### 4.2 Default visual property **values** (task 1)

For each of `default.node`, `default.edge`, `default.network`:

- For each `{ cxVpName: value }` entry:
  - Resolve `cxVpName` against the reverse of the `cxVisualPropertyConverter`
    table (build a `Map<cxVPName, VisualPropertyName>` once). If unknown →
    warning `Unknown visual property "<cxVpName>" in default.<node|edge|network>`.
    (Skip known-but-commented-out ones like `NODE_X_LOCATION`.)
  - Validate the value against the VP's value type. The converter table encodes
    the value family via which `VP*Converter` produced the entry
    (`VPColorConverter`, `VPNumberConverter`, `VPStringConverter`,
    `VPNodeShapeTypeConverter`, `VPVisibilityTypeConverter`,
    `VPFontTypeConverter`, `VPCustomGraphicsConverter`, …). Recommended: extend
    the converter descriptor with a lightweight `valueType` tag (see §5) so the
    validator does not have to reverse-engineer families. Value checks:
    - **color** → matches `#RGB`/`#RRGGBB`/`#RRGGBBAA` (or a known CSS color); reuse/extend any existing color util.
    - **number** → `typeof value === 'number'` (or numeric string) and, for the
      value, finite.
    - **string / enum** → non-object; for enum families (shape, visibility,
      line style, label position) optionally check membership in the allowed set.
    - **font / custom graphics** → object with expected keys (loose check).
  - On mismatch → warning
    `Visual property "<cxVpName>" default value <value> is not a valid <valueType>`.

### 4.3 Mapping **structure** (task 2)

For each entry in `nodeMapping` and `edgeMapping` (`{ cxVpName: mapping }`):

- `cxVpName` must resolve to a known VP (same reverse lookup) → else warning.
- `mapping.type` must be one of `PASSTHROUGH` | `DISCRETE` | `CONTINUOUS`
  (matches `MappingFunctionType` and the `visualStyleConverter` switch) → else
  warning `Unknown mapping type "<type>" for "<cxVpName>"`.
- `mapping.definition` must exist and contain a non-empty `attribute: string`
  → else warning.
- Per type (shapes from `cxVisualPropertyConverter.ts`):
  - **PASSTHROUGH** — `definition.attribute` required; no `map` needed.
  - **DISCRETE** — `definition.map` must be an array; each entry has `v` and `vp`.
    An empty `map` → warning (mapping will be inert).
  - **CONTINUOUS** — `definition.map` must be an array with **≥ 2** control
    points (the converter drops mappings with `< 2`, see
    `visualStyleConverter.ts:234`); each entry should have the numeric interval
    fields (`min`/`max` + `minVPValue`/`maxVPValue`, `includeMin`/`includeMax`).
    `< 2` entries → warning `Continuous mapping for "<cxVpName>" needs at least 2 control points; it will be ignored`.
  - Optionally validate each `vp` value in the map with the same value check as
    §4.2 (reuse the value validator).

### 4.4 Mapping on a **non-existent column** (task 3)

- Gather declared attribute names from `attributeDeclarations[0]`:
  - node mappings check against `attributeDeclarations[0].nodes` **keys plus
    their aliases** (`a` field) — mappings may reference either the canonical
    name or the alias.
  - edge mappings check against `attributeDeclarations[0].edges` (+ aliases).
  - Special-case the implicit `name` attribute (and any other always-present
    columns) so a passthrough on `name` is not falsely flagged.
- If `definition.attribute` is not found → warning
  `Mapping for "<cxVpName>" references column "<attr>" which is not declared for <nodes|edges>`.
- Guard the missing-declarations case (CW-650 showed `attributeDeclarations`
  can be present but omit `nodes`/`edges`): default missing decls to `{}` before
  reading keys.

## 5. Suggested small refactor to make value checks clean

The `cxVisualPropertyConverter` table already knows the CX name and the value
family (implicitly, via which factory built each entry). To avoid the validator
duplicating that knowledge:

- Add an optional `valueType: 'color' | 'number' | 'string' | 'enum' | 'font' | 'customGraphics'`
  (plus optional `allowed?: string[]` for enums) to `CXVisualPropertyConverter`
  and set it in each `VP*Converter` factory. This is additive and does not change
  existing behavior.
- Export a `cxVpNameToVisualPropertyName` reverse map (built from the table) so
  both the validator and any future consumer share one source of truth.

If the refactor is deemed out of scope, the validator can instead maintain its
own small `Record<cxVpName, valueType>` map — but the table is the better home.

## 6. Wiring it in

1. **New sub-validator** in `validator.ts`:

   ```ts
   export const validateCx2VisualProperties = (input: Cx2): ValidationResult => {
     const vp = findAspect(input, 'visualProperties') as VisualProperty[] | undefined
     const errors: ValidationIssue[] = []
     const warnings: ValidationIssue[] = []
     if (vp === undefined || vp.length === 0) {
       return { isValid: true, errors, warnings }
     }
     // ...§4.1–4.4, pushing ValidationIssue{ severity: 'warning', path } ...
     return { isValid: errors.length === 0, errors, warnings }
   }
   ```

2. **Insert into `validateCX2`** after `validateCx2Attributes`, following the
   same merge pattern (errors + warnings merged). Because it emits only
   warnings, `isValid` is unaffected and it will not short-circuit. Place it
   last so structural/referential/attribute errors are reported first.

3. **Surface warnings to the user** (`formatValidationErrors.ts`): today it joins
   only `errors`. Add a warnings section so VP warnings actually reach the user,
   e.g.:

   ```
   Invalid CX2 network: <errors...>
   Warnings:
   - <warning 1>
   - <warning 2>
   Please see the CX2 spec ...
   ```

   Care: entry points that treat a *valid* result as "nothing to show" (see the
   policy doc's list — `FileUpload.tsx`, `fetchUrlCxUtil.ts`, NDEx API,
   `ServiceApps` result handler) should be updated to display warnings
   non-blockingly (e.g. a toast/snackbar) even when `isValid === true`. Decide
   one consistent surface (recommended: a dismissible warning snackbar) and route
   `validationResult.warnings` there.

## 7. Testing plan (for the implementation ticket)

Co-locate `validator.test.ts` additions (`.test.ts`, no jest-dom). Cover:

- No `visualProperties` aspect → valid, zero warnings.
- Valid default values (color/number/string/enum) → zero warnings.
- Bad color (`NODE_BACKGROUND_COLOR: "not-a-color"`) → one warning, still valid.
- Bad number (`NODE_WIDTH: "wide"`) → warning.
- Unknown VP name in defaults / mappings → warning.
- Unknown `mapping.type` → warning.
- Continuous mapping with `< 2` control points → warning.
- Discrete mapping with empty `map` → warning.
- Mapping `definition.attribute` not in `attributeDeclarations` → warning;
  and the same attribute present (canonical or alias) → no warning.
- `attributeDeclarations` present but missing `nodes`/`edges` key → no crash
  (guarded), warning still emitted for the missing column.
- `formatValidationErrors` includes warnings in its output.

## 8. Out of scope / follow-ups

- Validating `nodeBypasses` / `edgeBypasses` values (only their id references are
  checked today by referential integrity). Could reuse the §4.2 value validator.
- Validating `visualEditorProperties`.
- Cross-checking mapping `definition.type` against the referenced column's
  declared datatype (a stronger, separate check).
