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
  readonly legacyName?: string
  /** The sidebar group the page belongs to. */
  readonly group: ManualGroup
  /**
   * Anchors that used to be on this page and moved to another one when the
   * page was split, mapped to the page that has them now. An old link
   * (`quick-tour#data`) follows the anchor to its new page.
   */
  readonly movedAnchors?: Readonly<Record<string, string>>
  /**
   * Source paths the page describes, as globs from the repo root. A change
   * under one of them is a reason to review the page.
   */
  readonly sources: readonly string[]
  readonly load: () => Promise<{ default: MDXContent }>
}

/** Sidebar groups, in order. */
export const MANUAL_GROUPS = [
  'Getting Started',
  'Working with Networks',
  'Extending and Troubleshooting',
  'About',
] as const
export type ManualGroup = (typeof MANUAL_GROUPS)[number]

export const MANUAL_PAGES: readonly ManualPage[] = [
  {
    slug: 'introduction',
    title: 'Introduction',
    legacyName: 'Introduction',
    group: 'Getting Started',
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
    title: 'Quick Tour',
    legacyName: 'Quick_Tour_of_Cytoscape',
    group: 'Getting Started',
    movedAnchors: Object.fromEntries([
      ...[
        'menu_bar',
        'data',
        'edit',
        'layout',
        'analysis',
        'tools',
        'apps',
        'help',
        'search_tool',
        'search-box',
        'light-and-dark-mode',
        'login',
        'sign-in-button',
        'the-menu-bar',
      ].map((anchor) => [anchor, 'menus']),
      ...[
        'network_management',
        'network-management',
        'workspace_tab',
        'workspace',
        'network-size-limits',
        'style_tab',
        'style',
        'filter',
        'layout_tools',
        'layout-tools',
      ].map((anchor) => [anchor, 'workspace-panels']),
      ...[
        'network_viewer',
        'network-viewer',
        'network_view',
        'network-view',
        'cell_view',
        'cell-view',
        'try-the-network-view-and-table',
      ].map((anchor) => [anchor, 'network-view']),
    ]),
    sources: [
      'src/features/NetworkPanel/EmptyWorkspacePanel.tsx',
      'src/features/Onboarding/WelcomeDialog.tsx',
      'src/features/Workspace/WorkspaceEditor.tsx',
      'src/features/TableBrowser/components/TableToolbar.tsx',
    ],
    load: () => import('./content/quick-tour.mdx'),
  },
  {
    slug: 'menus',
    title: 'Menus and Toolbar',
    group: 'Getting Started',
    sources: [
      'src/features/ToolBar/MenuBar.tsx',
      'src/features/ToolBar/*/index.tsx',
      'src/features/ToolBar/Search/**',
      'src/features/ToolBar/ThemeToggleButton.tsx',
      'src/features/Login/**',
      'src/features/LLMQuery/model/**',
      'src/models/LayoutModel/impl/layoutSelection.ts',
    ],
    load: () => import('./content/menus.mdx'),
  },
  {
    slug: 'workspace-panels',
    title: 'Workspace and Side Panel',
    group: 'Getting Started',
    sources: [
      'src/features/Workspace/NetworkBrowserPanel/**',
      'src/features/SummaryPanel/NetworkPropertyPanel.tsx',
      'src/features/LayoutTools/**',
      'src/assets/config.json',
    ],
    load: () => import('./content/workspace-panels.mdx'),
  },
  {
    slug: 'network-view',
    title: 'Network View',
    group: 'Getting Started',
    sources: [
      'src/features/FloatingToolBar/*Button.tsx',
      'src/features/HierarchyViewer/components/MainPanel.tsx',
      'src/features/NetworkPanel/CyjsRenderer/NetworkContextMenu.tsx',
    ],
    load: () => import('./content/network-view.mdx'),
  },
  {
    slug: 'creating-networks',
    title: 'Creating and Saving Networks',
    legacyName: 'Creating_Networks',
    group: 'Working with Networks',
    sources: [
      'src/features/ToolBar/DataMenu/**',
      'src/features/NetworkPanel/EmptyWorkspacePanel.tsx',
      'src/data/external-api/ndex/**',
      'src/features/ToolBar/FileUpload.tsx',
      'src/features/TableDataLoader/components/CreateNetworkFromTable/**',
      'src/features/TableDataLoader/components/previewTableParts.tsx',
      'src/boot/steps/runUrlImports.ts',
      'src/features/SummaryPanel/NetworkPropertyPanel.tsx',
      'src/data/hooks/useSaveWorkspaceToNDEx.ts',
      'src/features/NetworkPanel/CyjsRenderer/NetworkContextMenu.tsx',
    ],
    load: () => import('./content/creating-networks.mdx'),
  },
  {
    slug: 'node-and-edge-column-data',
    title: 'Node and Edge Column Data',
    legacyName: 'Node_and_Edge_Column_Data',
    group: 'Working with Networks',
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
    group: 'Working with Networks',
    sources: ['src/features/Vizmapper/**', 'src/models/VisualStyleModel/**'],
    load: () => import('./content/styles.mdx'),
  },
  {
    slug: 'filters',
    title: 'Filters',
    legacyName: 'Filters',
    group: 'Working with Networks',
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
    group: 'Working with Networks',
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
    group: 'Working with Networks',
    sources: ['src/features/ToolBar/DataMenu/ExportNetworkToImage/**'],
    load: () => import('./content/export.mdx'),
  },
  {
    slug: 'extending',
    title: 'Extending Cytoscape Web',
    legacyName: 'Extending',
    group: 'Extending and Troubleshooting',
    sources: [
      'src/features/AppManager/**',
      'src/features/ServiceApps/**',
      'src/app-api/core/index.ts',
      'src/app-api/AGENTS.md',
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
    group: 'Extending and Troubleshooting',
    sources: [
      'src/boot/steps/restoreUrlState.ts',
      'src/boot/steps/runUrlImports.ts',
      'src/boot/steps/resolveDeepLink.ts',
      'src/boot/steps/runInstallIntents.ts',
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
    group: 'About',
    sources: [
      'docs/privacy-policy.md',
      'src/features/CookieConsent.tsx',
      'src/data/hooks/useCrashDataConsent.ts',
      'src/features/Error.tsx',
      'src/data/external-api/error-report/**',
      'src/boot/googleAnalytics.ts',
      'src/features/LLMQuery/api/**',
    ],
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
    (page) => page.legacyName?.toLowerCase() === legacyName.toLowerCase(),
  )?.slug
}
