// Screenshot recipes for the manual: how to bring the app into the state an
// image shows, and what to crop. `test/manual-screenshots/capture.spec.ts`
// runs them; `<Screenshot id="…" />` in a page shows the result from
// `public/manual-assets/generated/<id>.png`.
//
// Data only and no relative imports: the capture spec, the drift check
// (scripts/check-manual-drift.mjs, via Node's TypeScript support) and the app
// all read this file.

/** An element on the page, found the way the e2e tests find them. */
export type ScreenshotTarget =
  | { readonly testid: string }
  | { readonly role: string; readonly name: string }
  | { readonly text: string }

export type ScreenshotStep =
  /** Data → Import → Network from File..., then upload `file` (repo path). */
  | { readonly importNetwork: string; readonly expectText: string }
  | { readonly click: ScreenshotTarget }
  | { readonly hover: ScreenshotTarget }
  | { readonly waitFor: ScreenshotTarget }
  /** Set the file of the `<input type="file">` inside `target`. */
  | { readonly upload: string; readonly into: ScreenshotTarget }
  | { readonly press: string }

export interface ScreenshotRecipe {
  readonly id: string
  /** Alt text, and the caption when a page asks for one. */
  readonly alt: string
  readonly viewport: { readonly width: number; readonly height: number }
  readonly steps: readonly ScreenshotStep[]
  /** The element to crop to; the whole viewport when absent. */
  readonly capture?: ScreenshotTarget
  /**
   * Source paths the image shows, as globs. The manual drift check lists the
   * image for a new capture when one of them changes.
   */
  readonly sources: readonly string[]
}

const DATA_MENU = { testid: 'toolbar-data-menu-menu-button' } as const
const GAL_NETWORK = 'src/assets/networks/gal-filtered-chart.cx2'
const GAL_NAME = 'galFiltered chart_1'

export const SCREENSHOT_RECIPES: readonly ScreenshotRecipe[] = [
  {
    id: 'app-overview',
    alt: 'Cytoscape Web with a network loaded: menu bar, side panel, network view and table panel',
    viewport: { width: 1280, height: 800 },
    steps: [{ importNetwork: GAL_NETWORK, expectText: GAL_NAME }],
    sources: [
      'src/features/Workspace/WorkspaceEditor.tsx',
      'src/features/ToolBar/MenuBar.tsx',
      'src/features/Workspace/NetworkBrowserPanel/**',
      'src/features/TableBrowser/components/TableToolbar.tsx',
    ],
  },
  {
    id: 'layout-tools',
    alt: 'The Layout Tools section expanded below the workspace list',
    viewport: { width: 1280, height: 800 },
    steps: [
      { importNetwork: GAL_NETWORK, expectText: GAL_NAME },
      { click: { role: 'button', name: 'Layout Tools' } },
      { waitFor: { testid: 'scaling-component' } },
    ],
    capture: { testid: 'layout-tools-accordion' },
    sources: ['src/features/LayoutTools/**'],
  },
  {
    id: 'export-image-dialog',
    alt: 'The Export Network To Image window',
    viewport: { width: 1280, height: 800 },
    steps: [
      { importNetwork: GAL_NETWORK, expectText: GAL_NAME },
      { click: DATA_MENU },
      { click: { role: 'menuitem', name: 'Export' } },
      { click: { role: 'menuitem', name: 'Network to Image...' } },
      { waitFor: { testid: 'export-network-to-image-dialog' } },
    ],
    capture: { role: 'dialog', name: 'Export Network To Image' },
    sources: ['src/features/ToolBar/DataMenu/ExportNetworkToImage/**'],
  },
  {
    id: 'create-network-from-table',
    alt: 'The Edit Column Definitions window for a table file imported as a network',
    viewport: { width: 1280, height: 800 },
    steps: [
      { click: DATA_MENU },
      { click: { role: 'menuitem', name: 'Import' } },
      { click: { role: 'menuitem', name: 'Network from File...' } },
      {
        upload: 'test/fixtures/tables/table-data-from-cy-tutorial.csv',
        into: { testid: 'file-upload-dropzone' },
      },
      { waitFor: { testid: 'create-network-from-table-modal' } },
    ],
    capture: { role: 'dialog', name: 'Edit Column Definitions' },
    sources: [
      'src/features/TableDataLoader/components/CreateNetworkFromTable/**',
      'src/features/TableDataLoader/components/previewTableParts.tsx',
    ],
  },
  {
    id: 'join-table-to-network',
    alt: 'The Edit Column Definitions window for a table file added to a network',
    viewport: { width: 1280, height: 800 },
    steps: [
      { importNetwork: GAL_NETWORK, expectText: GAL_NAME },
      { click: { testid: 'import-table-button' } },
      {
        upload: 'src/features/Manual/screenshots/fixtures/gal-annotations.csv',
        into: { testid: 'join-table-upload-dropzone' },
      },
      { waitFor: { text: 'Edit Column Definitions' } },
    ],
    capture: { role: 'dialog', name: 'Edit Column Definitions' },
    sources: [
      'src/features/TableDataLoader/components/JoinTableToNetwork/**',
      'src/features/TableDataLoader/components/previewTableParts.tsx',
    ],
  },
  {
    id: 'cell-view',
    alt: 'A hierarchy shown in Cell View: systems drawn as nested circles',
    viewport: { width: 1280, height: 800 },
    steps: [
      {
        importNetwork: 'test/fixtures/hcx/valid/tree.valid.cx2',
        expectText: 'Test Network',
      },
      { click: { role: 'tab', name: 'Cell View' } },
      { waitFor: { testid: 'circle-packing-svg' } },
    ],
    sources: [
      'src/features/HierarchyViewer/components/CirclePackingLayout/**',
      'src/features/HierarchyViewer/components/MainPanel.tsx',
    ],
  },
]

export const findScreenshotRecipe = (
  id: string,
): ScreenshotRecipe | undefined =>
  SCREENSHOT_RECIPES.find((recipe) => recipe.id === id)

/** Where a recipe's image is published, relative to `public/`. */
export const screenshotPath = (id: string): string =>
  `manual-assets/generated/${id}.png`
