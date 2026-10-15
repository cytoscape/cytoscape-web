import type { MDXContent } from 'mdx/types'

/**
 * The manual's table of contents. Order here is sidebar order.
 *
 * Data only — no component imports — so a Node script (the drift check, a
 * page generator) can read the registry without a DOM. Each page's content
 * loads lazily as its own chunk.
 */
export interface ManualPage {
  /** URL segment under /manual/. */
  readonly slug: string
  readonly title: string
  /**
   * The page's name on the Read the Docs manual, without `.html`. Old links
   * (`web-manual.cytoscape.org/en/latest/Styles.html#how-mappings-work`)
   * resolve to this page; heading ids keep the old anchors.
   */
  readonly legacyName: string
  /**
   * Source paths the page describes, as globs from the repo root. A change
   * under one of them is a reason to review the page.
   */
  readonly sources: readonly string[]
  readonly load: () => Promise<{ default: MDXContent }>
}

export const MANUAL_PAGES: readonly ManualPage[] = [
  {
    slug: 'introduction',
    title: 'Introduction',
    legacyName: 'Introduction',
    sources: [
      'src/features/ToolBar/HelpMenu/**',
      'src/features/FeatureAvailability/**',
      'src/features/ToolBar/AnalysisMenu/**',
      'src/features/ToolBar/DataMenu/OpenNetworkInCytoscapeMenuItem.tsx',
      'src/features/CytoscapeDesktopPermissionDialog.tsx',
    ],
    load: () => import('./content/introduction.mdx'),
  },
  {
    slug: 'quick-tour',
    title: 'Quick Tour of Cytoscape Web',
    legacyName: 'Quick_Tour_of_Cytoscape',
    sources: [
      'src/features/ToolBar/**',
      'src/features/Workspace/**',
      'src/features/NetworkPanel/**',
      'src/features/FloatingToolBar/**',
      'src/features/LayoutTools/**',
      'src/features/HierarchyViewer/**',
      'src/features/NetworkSearch/**',
      'src/features/Login/**',
      'src/features/Onboarding/**',
      'src/features/LLMQuery/**',
      'src/features/SummaryPanel/**',
      'src/features/TableBrowser/**',
      'src/models/LayoutModel/**',
      'src/assets/config.json',
    ],
    load: () => import('./content/quick-tour.mdx'),
  },
  {
    slug: 'creating-networks',
    title: 'Creating and Saving Networks',
    legacyName: 'Creating_Networks',
    sources: [
      'src/features/ToolBar/DataMenu/**',
      'src/features/Workspace/**',
      'src/data/external-api/ndex/**',
      'src/features/ToolBar/FileUpload.tsx',
      'src/features/TableDataLoader/components/CreateNetworkFromTable/**',
      'src/features/TableDataLoader/components/previewTableParts.tsx',
      'src/boot/steps/runUrlImports.ts',
      'src/features/SummaryPanel/**',
      'src/data/hooks/useSaveWorkspaceToNDEx.ts',
    ],
    load: () => import('./content/creating-networks.mdx'),
  },
  {
    slug: 'node-and-edge-column-data',
    title: 'Node and Edge Column Data',
    legacyName: 'Node_and_Edge_Column_Data',
    sources: [
      'src/features/TableBrowser/**',
      'src/features/TableDataLoader/components/JoinTableToNetwork/**',
      'src/features/TableDataLoader/components/previewTableParts.tsx',
      'src/features/TableDataLoader/components/ValueTypeNameForm.tsx',
      'src/features/TableDataLoader/model/impl/JoinTableToNetwork.ts',
      'src/models/TableModel/impl/valueTypeNameDisplay.ts',
    ],
    load: () => import('./content/node-and-edge-column-data.mdx'),
  },
  {
    slug: 'styles',
    title: 'Styles',
    legacyName: 'Styles',
    sources: ['src/features/Vizmapper/**', 'src/models/VisualStyleModel/**'],
    load: () => import('./content/styles.mdx'),
  },
  {
    slug: 'filters',
    title: 'Filters',
    legacyName: 'Filters',
    sources: [
      'src/features/Filter/**',
      'src/models/FilterModel/**',
      'src/data/filter/**',
      'docs/specifications/FILTER_SPECIFICATION.md',
    ],
    load: () => import('./content/filters.mdx'),
  },
  {
    slug: 'merge',
    title: 'Merging Networks',
    legacyName: 'Merge',
    sources: [
      'src/features/MergeNetworks/**',
      'src/features/ToolBar/ToolsMenu/MergeNetwork*.tsx',
    ],
    load: () => import('./content/merge.mdx'),
  },
  {
    slug: 'export',
    title: 'Exporting Your Data',
    legacyName: 'Export_Your_Data',
    sources: [
      'src/features/ToolBar/DataMenu/ExportNetworkToImage/**',
      'src/features/NetworkPanel/CyjsRenderer/CyjsRenderer.tsx',
    ],
    load: () => import('./content/export.mdx'),
  },
  {
    slug: 'extending',
    title: 'Extending Cytoscape Web',
    legacyName: 'Extending',
    sources: [
      'src/features/AppManager/**',
      'src/features/ServiceApps/**',
      'src/app-api/**',
      'src/features/ToolBar/AppMenu/**',
      'src/boot/steps/runInstallIntents.ts',
      'src/models/AppModel/impl/menuRouting.ts',
      'src/assets/apps.json',
    ],
    load: () => import('./content/extending.mdx'),
  },
  {
    slug: 'advanced',
    title: 'Advanced Topics',
    legacyName: 'Advanced',
    sources: [
      'src/boot/steps/**',
      'docs/specifications/ROUTING_SPECIFICATION.md',
      'src/features/FloatingToolBar/useCopyShareableNetworkUrl.ts',
      'src/features/FloatingToolBar/ShareNetworkButton.tsx',
      'src/data/external-api/ndex/accessKeys.ts',
      'src/features/AppManager/AppInstallConfirmationDialog.tsx',
      'src/features/ToolBar/DataMenu/ResetLocalWorkspace.tsx',
      'src/data/hooks/useResetWorkspace.ts',
      'src/features/Error.tsx',
      'src/features/ToolBar/HelpMenu/**',
    ],
    load: () => import('./content/advanced.mdx'),
  },
  {
    slug: 'privacy-policy',
    title: 'Privacy Policy',
    legacyName: 'Cytoscape_Privacy_Policy',
    sources: ['docs/privacy-policy.md', 'src/features/CookieConsent.tsx'],
    load: () => import('./content/privacy-policy.mdx'),
  },
]

export const DEFAULT_MANUAL_SLUG = MANUAL_PAGES[0].slug

export const findManualPage = (slug: string): ManualPage | undefined =>
  MANUAL_PAGES.find((page) => page.slug === slug)

/**
 * Maps a path under /manual/ to a page slug, accepting both current slugs
 * and Read the Docs paths (`en/latest/Styles.html`, `Styles.html`, `Styles`).
 * Returns undefined when nothing matches.
 */
export const resolveManualPath = (path: string): string | undefined => {
  const segments = path.split('/').filter((s) => s !== '')
  if (segments.length === 0) {
    return DEFAULT_MANUAL_SLUG
  }
  const last = segments[segments.length - 1]
  if (segments.length === 1 && findManualPage(last) !== undefined) {
    return last
  }
  const legacyName = last.replace(/\.html$/, '')
  if (legacyName === 'index') {
    return DEFAULT_MANUAL_SLUG
  }
  return MANUAL_PAGES.find(
    (page) => page.legacyName.toLowerCase() === legacyName.toLowerCase(),
  )?.slug
}
