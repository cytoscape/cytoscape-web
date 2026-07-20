# App API — Error Code Reference

Every app API failure is an `ApiFailure` with `error: { code, severity, message }`.
This is the canonical, code-keyed reference — [Api.md](./Api.md) documents behavior
per method; this document documents behavior per code, since a single code (e.g.
`APP1`) is returned by nearly every method across every domain.

**Severity** is `'error'` or `'warning'`. Three codes (`MI1`, `MI2`, `MI3`) are
recorded as `'warning'` because the underlying CX2 spec treats them as advisory —
but the app API always constructs a hard `ApiFailure` regardless of a code's
nominal severity, since `ApiResult` has no non-blocking channel today. Treat
`severity` as documentation of CX2 intent, not a signal that the call might still
have succeeded.

**Provenance:** codes that enforce a CX2 validation requirement reuse the CX2 code
string directly as `code` (`FK1`, `BV1`, `MI3`, …) — see the "CX2 spec" line on
each such entry, which cites the corresponding concept in the CX2 library's own
validation requirements (`research/cytoscape-beyond/cx2/wiki/analyses/` — a
separate, unrelated repo; not a hyperlink, since that repo isn't part of this
build). Codes with no CX2 equivalent use the `APP*` namespace instead.

Import the catalogs from `cyweb/ApiTypes`:

```typescript
import { AppCodes, ElementCodes, StyleCodes, TableCodes } from 'cyweb/ApiTypes'

if (!result.success) {
  if (result.error.code === TableCodes.COLUMN_ALREADY_EXISTS.code) {
    // handle AC6
  }
}
```

---

## ElementCodes — node/edge existence and structural rules

### N3

**Severity:** error
**Returned by:** `createNode`

The `attributes` payload passed to `createNode` contained an `"id"` key. The
element ID lives outside the attributes object; shadowing it is forbidden.

**CX2 spec:** `cx2-node-requirements#N3` — "Node id MUST NOT appear as a key in v".

### E6

**Severity:** error
**Returned by:** `createEdge`

Same rule as N3, for edges.

**CX2 spec:** `cx2-edge-requirements#E6`.

### GL1

**Severity:** error
**Returned by:** `getNode`, `createEdge` (source/target lookup), `moveEdge`,
`deleteNodes`, `getConnectedEdges`, `getConnectedNodes`, `getOutgoers`,
`getIncomers`, `getSuccessors`, `getPredecessors`, `getValue`, `getRow`,
`setValue`, `setValues`, `editRows`, `applyValueToElements`,
`updateNodePositions`, `createNetworkFromNodeList`

A referenced node ID does not exist in the network. This is app-api's most
common failure — every method that takes a node ID (or a list of node IDs)
returns this when a lookup misses.

**CX2 spec:** `cx2-library-design-requirements#GL1` — a CX2-library-defined
"runtime and lifecycle" code (distinct from the document-validation codes),
which app-api reuses directly since it describes the identical concept.

### GL2

**Severity:** error
**Returned by:** `getEdge`, `moveEdge`, `deleteEdges`, `getValue`, `getRow`,
`setValue`, `setValues`, `editRows`, `applyValueToElements`,
`createNetworkFromNodeList`

Same as GL1, for edges.

**CX2 spec:** `cx2-library-design-requirements#GL2`.

---

## TableCodes — column/attribute rules

### FK1

**Severity:** error
**Returned by:** `createColumn`, `setColumnName`

A column named `"id"` was requested for a node table. `id` is reserved for the
element identity and forbidden as a column name.

**CX2 spec:** `cx2-library-design-requirements#FK1`.

### FK2

**Severity:** error
**Returned by:** `createColumn`, `setColumnName`

Same as FK1, for edge tables.

**CX2 spec:** `cx2-library-design-requirements#FK2`.

### A8

**Severity:** error
**Returned by:** `createColumn`, `setColumnName`

A column named `"s"` or `"t"` was requested for an edge table — these keys are
reserved for the edge's structural source/target reference and cannot be
reused as an attribute column.

**CX2 spec:** `cx2-validation-requirements#A8`.

### A6

**Severity:** error
**Returned by:** `createColumn`

`defaultValue` was `null` or `undefined`. Falsy-but-valid defaults (`0`,
`false`, `''`) are accepted.

**CX2 spec:** `cx2-validation-requirements#A6`.

### A1

**Severity:** error
**Returned by:** `setValue`, `setValues`, `editRows`, `applyValueToElements`

A cell value did not match its column's declared type. Checked strictly — no
coercion (e.g. `1.5` is rejected for an `integer` column). Writes to
*undeclared* columns pass through unchecked (declaration policy is a separate,
not-yet-implemented concern).

**CX2 spec:** `cx2-validation-requirements#A1`.

### AC6

**Severity:** error
**Returned by:** `createColumn`, `setColumnName`

The requested column name is already declared on the table. Renaming a column
to its own current name is treated as a no-op, not a collision.

**CX2 spec:** `cx2-library-design-requirements#AC6`.

---

## StyleCodes — visual style, mapping, and bypass rules

### BV1

**Severity:** error
**Returned by:** `setBypass`

One or more `elementIds` passed to `setBypass` do not exist in the network.
The message names the missing IDs.

**CX2 spec:** `cx2-library-design-requirements#BV1` — "Element does not exist
for bypass," a context-specific existence check distinct from the generic
GL1/GL2 lookups.

### BV2

**Severity:** error
**Returned by:** `setBypass`

An element ID in `setBypass` exists but doesn't match the visual property's
scope — a node-scoped property was bypassed with an edge ID, or vice versa.

**CX2 spec:** `cx2-library-design-requirements#BV2`.

### BV5

**Severity:** error
**Returned by:** `setBypass`

`setBypass` was called for a network-scoped visual property. Network-scoped
properties apply globally and cannot be bypassed per-element.

**CX2 spec:** `cx2-library-design-requirements#BV5`.

### MC1

**Severity:** error
**Returned by:** `createDiscreteMapping`, `createContinuousMapping`,
`createPassthroughMapping`

A mapping was requested for a network-scoped visual property. Mappings only
apply to node- or edge-scoped properties.

**CX2 spec:** `cx2-library-design-requirements#MC1`.

### MI1

**Severity:** warning (see the note at the top of this document)
**Returned by:** `createDiscreteMapping`, `createContinuousMapping`,
`createPassthroughMapping`

The mapping's source `attribute` is not declared as a column in the matching
node/edge table.

**CX2 spec:** `cx2-library-design-requirements#MI1`.

### MI2

**Severity:** warning (see the note at the top of this document)
**Returned by:** `createDiscreteMapping`, `createContinuousMapping`,
`createPassthroughMapping`

The caller-supplied `attributeType` does not match the declared type of the
mapping's source column.

**CX2 spec:** `cx2-library-design-requirements#MI2`.

### MI3

**Severity:** warning (see the note at the top of this document)
**Returned by:** `createContinuousMapping`

A `CONTINUOUS` mapping was requested against a non-numeric source column.

**CX2 spec:** `cx2-library-design-requirements#MI3`.

### V7

**Severity:** error
**Returned by:** `createContinuousMapping`

`attributeValues` was empty, contained non-numeric/non-finite values, or a
supplied `controlPoints` entry had a non-numeric/non-finite `value`. `NaN` and
`Infinity` are rejected outright, not coerced to `null`.

**CX2 spec:** `cx2-validation-requirements#V7`.

### VP1

**Severity:** error
**Returned by:** `setDefault`, `setBypass`

The value for a `string`-typed visual property was not a string.

**CX2 spec:** `cx2-validation-requirements#VP1`.

### VP2

**Severity:** error
**Returned by:** `setDefault`, `setBypass`

The value for a `color`-typed visual property was not a hex color string
(`#rgb`, `#rrggbb`, or `#rrggbbaa`).

**CX2 spec:** `cx2-validation-requirements#VP2`.

### VP3

**Severity:** error
**Returned by:** `setDefault`, `setBypass`

The value for an opacity property was outside the `0`–`1` range.

**CX2 spec:** `cx2-validation-requirements#VP3`.

### VP4

**Severity:** error
**Returned by:** `setDefault`, `setBypass`

The value for a `number`-typed visual property was not a finite number.

**CX2 spec:** `cx2-validation-requirements#VP4`.

### VP5

**Severity:** error
**Returned by:** `setDefault`, `setBypass`

The value did not match the property's enum (node shape, edge line style,
edge arrow shape, border line style, visibility, horizontal/vertical align).
Also used for `boolean`-typed properties that received a non-boolean value —
CX2 has no dedicated boolean code, and a boolean is effectively a two-value
enum.

**CX2 spec:** `cx2-validation-requirements#VP5`.

### VP6

**Severity:** error
**Returned by:** `setDefault`, `setBypass`

The value for a font-face property was not a recognized font.

**CX2 spec:** `cx2-validation-requirements#VP6`.

### VP7

**Severity:** error
**Returned by:** `setDefault`, `setBypass`

A `LabelPosition` object was missing a required align/anchor key, had an
invalid enum value for one, or had a non-finite `MARGIN_X`/`MARGIN_Y`.

**CX2 spec:** `cx2-validation-requirements#VP7`.

### VP9

**Severity:** error
**Returned by:** `setDefault`, `setBypass`

A `CustomGraphics` object had an unknown `type`/`name`, or a non-object
`properties` field.

**CX2 spec:** `cx2-validation-requirements#VP9`.

### VP10

**Severity:** error
**Returned by:** `setDefault`, `setBypass`

A `CustomGraphicsPosition` object had an invalid `JUSTIFICATION`, a non-finite
margin, or an invalid anchor (must be one of `C`/`N`/`S`/`E`/`W`).

**CX2 spec:** `cx2-validation-requirements#VP10`.

---

## AppCodes — runtime/registry concepts with no CX2 equivalent

CX2 is a static document format with no session, workspace, or registry state —
these codes describe live application concerns that have no corresponding CX2
validation rule.

### APP1 — `NETWORK_NOT_FOUND`

**Severity:** error
**Returned by:** almost every method across every domain

The specified `networkId` does not exist in the relevant store (network,
table, visual style, or view model — `exportToCx2` collapses all four checks
to this one code, since externally there's nothing actionable in knowing
*which* store was missing versus that the network isn't fully available).

### APP2 — `NO_CURRENT_NETWORK`

**Severity:** error
**Returned by:** `deleteCurrentNetwork`, `getCurrentNetworkId`

No network is currently selected in the workspace (no networks are open, or
none is marked current).

### APP3 — `OPERATION_FAILED`

**Severity:** error
**Returned by:** every method, as a `catch` fallback

An internal store operation threw an unexpected error. This is the generic
"something went wrong that isn't one of the specific validation failures"
bucket — details are in the message, not a further-typed code.

### APP4 — `LAYOUT_ENGINE_NOT_FOUND`

**Severity:** error
**Returned by:** `applyLayout`

No registered layout engine has an algorithm matching the requested (or
preferred) name.

### APP5 — `FUNCTION_NOT_AVAILABLE`

**Severity:** error
**Returned by:** `fit`

The renderer's `fit` function is not yet registered for this network view
(the renderer hasn't mounted, or hasn't registered its functions yet).

### APP6 — `CONTEXT_MENU_ITEM_NOT_FOUND`

**Severity:** error
**Returned by:** `removeContextMenuItem`

The specified `itemId` is not a currently-registered context menu item.

### APP7 — `RESOURCE_NOT_FOUND`

**Severity:** error
**Returned by:** `unregisterPanel`, `unregisterMenuItem`

The specified resource ID is not registered by this app in the given slot.

### APP8 — `INVALID_CX2`

**Severity:** error
**Returned by:** `createNetworkFromCx2`

The input document failed `validateCX2()`'s structural validation. The message
is the validator's own aggregated error text — `validateCX2()` currently
returns one combined message across all validation phases (structure,
metadata, referential integrity, attributes), not a per-rule diagnostic list,
so this code cannot yet be decomposed into the specific CX2 rule that failed.

### APP9 — `INVALID_INPUT`

**Severity:** error
**Returned by:** many methods, for malformed input with no specific CX2 rule

A residual bucket for caller errors that don't correspond to a CX2 validation
requirement: empty required strings (`name`, `label`, column names before the
FK1/A8 checks apply), empty required arrays (`edgeList`, `nodeIds`,
`elementIds`), an unrecognized visual property or mapping type name, or a
TSV import with too few lines or a missing key column. The message describes
the specific problem; the code itself is intentionally coarse — inventing a
bespoke code for each one-off "caller passed garbage" case would add ceremony
without adding information external callers can act on differently.
