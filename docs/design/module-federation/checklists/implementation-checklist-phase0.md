# Implementation Checklist — Phase 0: Foundation Types

> Track progress for Phase 0. Mark `[x]` when complete. Run verification after each step.
>
> Phase 1 checklist: [implementation-checklist-phase1.md](implementation-checklist-phase1.md)

_Design: [phase1a-shared-types-design.md](../specifications/phase1a-shared-types-design.md) — line-by-line blueprint_

## Deliverables

- [ ] Create directory structure: `src/app-api/`, `src/app-api/types/`, `src/app-api/api_docs/`
- [ ] Verify `CyApp` interface location — `src/models/AppModel/CyApp.ts` import resolves
- [ ] Create `src/app-api/types/ApiResult.ts` — `ApiResult<T>`, `ApiSuccess<T>`, `ApiFailure`, `ApiError`, `ApiErrorCode`, `ok()`, `fail()`
- [ ] Create `src/app-api/types/AppContext.ts` — `AppContext`, `CyAppWithLifecycle` (app API fields commented out until each phase)
- [ ] Create `src/app-api/types/ElementTypes.ts` — re-exports of `IdType`, `AttributeName`, `ValueType`, `ValueTypeName`, `VisualPropertyName`, `CyNetwork`, `Cx2`, `Table`, `NetworkView`, `NetworkSummary`
- [ ] Create `src/app-api/types/index.ts` — barrel export for all type modules
- [ ] Create `src/app-api/index.ts` — top-level barrel export (app API hooks commented out initially)
- [ ] Create `src/app-api/CLAUDE.md` — local context file for this layer
- [ ] Modify `webpack.config.js` — add `'./ApiTypes': './src/app-api/types/index.ts'` to `exposes`
- [ ] Create `src/app-api/types/ApiResult.test.ts` — unit tests for `ok()`, `fail()`, type narrowing
- [ ] Create `src/app-api/api_docs/Api.md` — behavioral documentation stub

## Verification

- [ ] `npm run lint` passes
- [ ] `npm run test:unit -- --testPathPattern="ApiResult"` passes
- [ ] `npm run build` succeeds
