/**
 * Shape of the `docs-data` payload injected into the published page.
 * The page's vanilla JS reads exactly this contract from a
 * `<script type="application/json">` tag, so keep it stable.
 */

export interface ChangelogSection {
  kind: string // 'added' | 'changed' | 'fixed' | 'removed' | ...
  breaking: boolean
  label: string // full heading suffix, e.g. 'Changed — BREAKING'
  html: string
  text: string
}

export interface ChangelogVersion {
  version: string
  date: string | null
  sections: ChangelogSection[]
}

export interface MethodErrorRef {
  code: string
  condition: string // HTML (inline)
}

export interface ReferenceMethod {
  name: string
  anchor: string // e.g. 'element.getNode'
  docSignature: string // from Api.md heading
  tsSignature: string | null // merged from the extracted TS surface
  descriptionHtml: string
  text: string
  errorRefs: MethodErrorRef[]
}

export interface ReferenceGroup {
  title: string
  intHtml?: string // prose that appears under the group heading before methods
  typesHtml?: string // a "Types" code block group
  methods: ReferenceMethod[]
}

export interface ReferenceNamespace {
  name: string // 'ElementApi'
  moduleId: string | null // 'cyweb/ElementApi'
  key: string // surface key, e.g. 'element'
  descriptionHtml: string
  groups: ReferenceGroup[]
}

export interface Guide {
  title: string
  anchor: string
  html: string
  text: string
}

export interface SurfaceMethod {
  name: string
  params: Array<{ name: string; type: string; optional: boolean }>
  returnType: string
  signature: string
  jsdoc: string | null
}

export interface SurfaceNamespace {
  interfaceName: string
  methods: Record<string, SurfaceMethod>
}

export interface Surface {
  version: string
  commit: string
  namespaces: Record<string, SurfaceNamespace> // keyed by surface key
}

export interface ErrorCode {
  code: string
  name: string | null
  catalog: string
  catalogSubtitle: string
  severity: string | null
  returnedBy: string[]
  cx2Spec: string | null
  descriptionHtml: string
  text: string
}

export interface DocsData {
  meta: {
    generatedAt: string
    apiTypesVersion: string
    methodCount: number
    namespaceCount: number
    errorCodeCount: number
    surfaceVersions: string[]
    commit: string
    branch: string
  }
  versions: ChangelogVersion[]
  namespaces: ReferenceNamespace[]
  guides: Guide[]
  surfaces: Record<string, Surface>
  errorCodes: ErrorCode[]
}
