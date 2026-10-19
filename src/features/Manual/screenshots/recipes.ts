// Screenshot recipes for the manual: how to bring the app into the state an
// image shows, and what to crop. `test/manual-screenshots/capture.spec.ts`
// runs them; `<Screenshot id="…" />` in a page shows the result from
// `public/manual-assets/generated/<id>.png`.
//
// Step sequences are recipes with one image per step of a procedure:
// `<Steps sequence="…">` pairs them with a numbered list in a page.
//
// Data only and no relative imports: the capture spec, the drift check
// (scripts/check-manual-drift.mjs, via Node's TypeScript support) and the app
// all read this file.

/** An element on the page, found the way the e2e tests find them. */
export type ScreenshotTarget =
  | { readonly testid: string }
  | { readonly role: string; readonly name: string }
  | { readonly text: string }
  /** An element whose `aria-label` is exactly `label`. */
  | { readonly label: string }
  /**
   * A Playwright selector, for elements with no test id or accessible name
   * (a Style panel row's boxes). Prefer the other kinds.
   */
  | { readonly selector: string }

export type ScreenshotStep =
  /** Data → Import → Network from File..., then upload `file` (repo path). */
  | { readonly importNetwork: string; readonly expectText: string }
  | { readonly click: ScreenshotTarget }
  | { readonly hover: ScreenshotTarget }
  | { readonly waitFor: ScreenshotTarget }
  /** Set the file of the `<input type="file">` inside `target`. */
  | { readonly upload: string; readonly into: ScreenshotTarget }
  | { readonly press: string }
  /** Replace the text in a field. */
  | { readonly fill: ScreenshotTarget; readonly text: string }
  /** Let an animation or layout finish, in milliseconds. */
  | { readonly wait: number }
  /** Select these nodes of the current network, as a click on them does. */
  | { readonly selectNodes: readonly string[] }

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
const U2OS_CELL_MAP =
  'src/features/Manual/screenshots/fixtures/u2os-cell-map.hcx.cx2'

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
    id: 'cell-view',
    alt: 'The U-2 OS cell map in Cell View: cell components drawn as nested circles',
    viewport: { width: 1280, height: 800 },
    steps: [
      {
        // The U-2 OS Multi-scale Integrated Cell Map (NDEx a5bf5dc8-…, the
        // test fixture renamed without its "DEV+TEST" suffix): a real
        // 276-system hierarchy with one interaction type, so Cell View is
        // offered.
        importNetwork: U2OS_CELL_MAP,
        expectText: 'U-2 OS Multi-scale Integrated Cell Map',
      },
      // The Sub Network Viewer opens empty ("Please select a subsystem");
      // close it so Cell View gets the width.
      { click: { testid: 'side-panel-close-button' } },
      { click: { role: 'tab', name: 'Cell View' } },
      { waitFor: { testid: 'circle-packing-svg' } },
    ],
    sources: [
      'src/features/HierarchyViewer/components/CirclePackingLayout/**',
      'src/features/HierarchyViewer/components/MainPanel.tsx',
    ],
  },
  {
    id: 'sub-network-viewer',
    alt: 'The Sub Network Viewer showing the interactions of the Cytochrome complex, selected in Cell View',
    viewport: { width: 1400, height: 800 },
    steps: [
      {
        importNetwork: U2OS_CELL_MAP,
        expectText: 'U-2 OS Multi-scale Integrated Cell Map',
      },
      { click: { role: 'tab', name: 'Cell View' } },
      { waitFor: { testid: 'circle-packing-svg' } },
      // Cytochrome complex, 16 proteins. Its interactions load from the
      // network the hierarchy names (idekerlab.ndexbio.org), so the capture
      // needs the network.
      { selectNodes: ['45756'] },
      { waitFor: { testid: 'subnetwork-panel' } },
    ],
    sources: [
      'src/features/HierarchyViewer/components/SubNetworkPanel.tsx',
      'src/features/HierarchyViewer/components/MainPanel.tsx',
    ],
  },
]

/** One image of a sequence, taken after its steps run. */
export interface SequenceFrame {
  readonly id: string
  /** Alt text, also shown under the image. */
  readonly alt: string
  /** The list item (1-based) this image illustrates, and the ones after it up
   * to the next frame. */
  readonly step: number
  /** Run before the capture, after the previous frame's steps. */
  readonly steps: readonly ScreenshotStep[]
  /** Elements to ring: what the reader acts on in this step. */
  readonly highlight?: readonly ScreenshotTarget[]
  /** The element to crop to; the whole viewport when absent. */
  readonly capture?: ScreenshotTarget
}

/**
 * Images of a procedure, captured in one run of the app: each frame continues
 * from the state the previous one left.
 */
export interface ScreenshotSequence {
  readonly id: string
  /** The page section the sequence illustrates, shown above the images. */
  readonly title: string
  readonly viewport: { readonly width: number; readonly height: number }
  readonly frames: readonly SequenceFrame[]
  /** As ScreenshotRecipe.sources. */
  readonly sources: readonly string[]
}

const JOIN_DIALOG = { role: 'dialog', name: 'Edit Column Definitions' } as const
/** Network from File's dialog for a table: the same title as JOIN_DIALOG. */
const CREATE_DIALOG = JOIN_DIALOG
const MERGE_DIALOG = { role: 'dialog', name: 'Advanced Network Merge' } as const
/**
 * A Style panel row's boxes: 0 Default, 1 Mapping, 2 Bypass. Rows have no
 * test id; the row is the element whose child is the property's name.
 */
const styleBox = (property: string, box: 0 | 1 | 2): ScreenshotTarget => ({
  selector: `[data-testid="vizmapper"] div:has(> :text-is("${property}")) > div >> nth=${box}`,
})
/** A swatch of the color picker's Swatches tab. */
const SWATCH = (hex: string): string =>
  `[data-testid="visual-property-value-picker-popover"] [title="${hex}"]`
/** The value box of one row of a discrete mapping. */
const DISCRETE_VALUE = (value: string): ScreenshotTarget => ({
  selector: `[data-testid="mapping-form-popover"] tr:has([data-testid="discrete-mapping-checkbox-${value}"]) td >> nth=2 >> div >> nth=0`,
})
const CURRENT_PALETTE =
  '[data-testid="mapping-form-popover"] span:text-is("Current Palette:") + button'
const BYPASS_VALUE =
  '[data-testid="bypass-form-popover"] :text("Apply the bypass value") + *'
const HSF1_NETWORK = 'src/assets/networks/hsf1-neighborhood.cx2'
const HSF1_NAME = 'HSF1 neighborhood'

export const SCREENSHOT_SEQUENCES: readonly ScreenshotSequence[] = [
  {
    id: 'import-table',
    title: 'Import Data Table Files',
    // The import dialog is at least 1000px tall; the viewport fits it.
    viewport: { width: 1280, height: 1100 },
    frames: [
      {
        id: 'table-button',
        alt: 'The Import table from file button in the table toolbar',
        step: 2,
        steps: [{ importNetwork: GAL_NETWORK, expectText: GAL_NAME }],
        highlight: [{ testid: 'import-table-button' }],
      },
      {
        id: 'upload',
        alt: 'The Upload Tabular Data File window',
        step: 3,
        steps: [
          { click: { testid: 'import-table-button' } },
          { waitFor: { testid: 'join-table-upload-dropzone' } },
        ],
        highlight: [{ testid: 'join-table-upload-browse-button' }],
        capture: { role: 'dialog', name: 'Upload Tabular Data File' },
      },
      {
        id: 'column-definitions',
        alt: 'The Edit Column Definitions window with a preview of the file',
        step: 4,
        steps: [
          {
            upload:
              'src/features/Manual/screenshots/fixtures/gal-annotations.csv',
            into: { testid: 'join-table-upload-dropzone' },
          },
          { waitFor: JOIN_DIALOG },
        ],
        capture: JOIN_DIALOG,
      },
      {
        id: 'import-as',
        alt: 'The Import data as choice: node or edge table columns',
        step: 5,
        steps: [],
        highlight: [
          { role: 'button', name: 'Node table columns' },
          { role: 'button', name: 'Edge table columns' },
        ],
        capture: JOIN_DIALOG,
      },
      {
        id: 'network-key',
        alt: 'The Key Column for Network list, open',
        step: 6,
        steps: [
          { click: { role: 'combobox', name: 'Key column for network' } },
        ],
        highlight: [{ role: 'option', name: 'name' }],
        // The list and popovers open inside the dialog's bounds.
        capture: JOIN_DIALOG,
      },
      {
        id: 'case-sensitive',
        alt: 'The Case sensitive key values checkbox',
        step: 7,
        steps: [
          { click: { role: 'option', name: 'name' } },
          { waitFor: JOIN_DIALOG },
        ],
        highlight: [{ text: 'Case sensitive key values' }],
        capture: JOIN_DIALOG,
      },
      {
        id: 'key-header',
        alt: 'The header of the file column name',
        step: 8,
        steps: [],
        highlight: [{ role: 'button', name: 'Edit column name' }],
        capture: JOIN_DIALOG,
      },
      {
        id: 'key-meaning',
        alt: 'The Meaning buttons of a file column, with the key button ringed',
        step: 9,
        steps: [{ click: { role: 'button', name: 'Edit column name' } }],
        highlight: [{ label: 'Key' }],
        // The list and popovers open inside the dialog's bounds.
        capture: JOIN_DIALOG,
      },
      {
        id: 'other-columns',
        alt: 'The Meaning and Data Type options of another file column',
        step: 10,
        steps: [
          { click: { label: 'Key' } },
          { press: 'Escape' },
          { click: { role: 'button', name: 'Edit column localization' } },
        ],
        highlight: [{ label: 'Attribute' }, { label: 'Not imported' }],
        // The list and popovers open inside the dialog's bounds.
        capture: JOIN_DIALOG,
      },
      {
        id: 'preview',
        alt: 'The preview, with the rows that match the network in bold',
        step: 12,
        steps: [{ press: 'Escape' }],
        highlight: [{ text: 'rows will be joined to the table' }],
        capture: JOIN_DIALOG,
      },
      {
        id: 'confirm',
        alt: 'The Confirm button',
        step: 13,
        steps: [],
        highlight: [{ testid: 'table-column-append-confirm-button' }],
        capture: JOIN_DIALOG,
      },
    ],
    sources: [
      'src/features/TableDataLoader/components/JoinTableToNetwork/**',
      'src/features/TableDataLoader/components/previewTableParts.tsx',
      'src/features/TableBrowser/components/TableToolbar.tsx',
    ],
  },
  {
    id: 'network-from-table',
    title: 'Import a Network from a Table',
    // Wide enough for the preview's six columns without scrolling.
    viewport: { width: 1600, height: 900 },
    frames: [
      {
        id: 'menu',
        alt: 'Data → Import → Network from File... in the menu bar',
        step: 1,
        steps: [
          { click: DATA_MENU },
          { click: { role: 'menuitem', name: 'Import' } },
        ],
        highlight: [{ role: 'menuitem', name: 'Network from File...' }],
      },
      {
        id: 'upload',
        alt: 'The Upload network file window',
        step: 2,
        steps: [
          { click: { role: 'menuitem', name: 'Network from File...' } },
          { waitFor: { testid: 'file-upload-dropzone' } },
        ],
        highlight: [{ testid: 'file-upload-browse-button' }],
        capture: { role: 'dialog', name: 'Upload network file' },
      },
      {
        id: 'column-definitions',
        alt: 'The Edit Column Definitions window with a preview of the table',
        step: 3,
        steps: [
          {
            upload: 'test/fixtures/tables/table-data-from-cy-tutorial.csv',
            into: { testid: 'file-upload-dropzone' },
          },
          { waitFor: { testid: 'create-network-from-table-modal' } },
        ],
        highlight: [{ testid: 'create-network-from-table-name-input' }],
        capture: CREATE_DIALOG,
      },
      {
        id: 'source',
        alt: 'The Meaning buttons of the source column, with Source node ringed',
        step: 4,
        steps: [{ click: { role: 'button', name: 'Edit column source' } }],
        highlight: [{ label: 'Source node' }],
        capture: CREATE_DIALOG,
      },
      {
        id: 'target',
        alt: 'The Meaning buttons of the target column, with Target node ringed',
        step: 5,
        steps: [
          { click: { label: 'Source node' } },
          { press: 'Escape' },
          { click: { role: 'button', name: 'Edit column target' } },
        ],
        highlight: [{ label: 'Target node' }],
        capture: CREATE_DIALOG,
      },
      {
        id: 'interaction',
        alt: 'The Meaning buttons of the interaction column, with Interaction type ringed',
        step: 6,
        steps: [
          { click: { label: 'Target node' } },
          { press: 'Escape' },
          { click: { role: 'button', name: 'Edit column interaction' } },
        ],
        highlight: [{ label: 'Interaction type' }],
        capture: CREATE_DIALOG,
      },
      {
        id: 'other-columns',
        alt: 'The Meaning and Data Type options of another column',
        step: 7,
        steps: [
          { click: { label: 'Interaction type' } },
          { press: 'Escape' },
          { click: { role: 'button', name: 'Edit column symbol' } },
        ],
        highlight: [{ label: 'Not imported' }, { label: 'Interaction type' }],
        capture: CREATE_DIALOG,
      },
      {
        id: 'preview',
        alt: 'The preview with source, target and interaction columns set',
        step: 8,
        steps: [{ press: 'Escape' }],
        capture: CREATE_DIALOG,
      },
      {
        id: 'confirm',
        alt: 'The Confirm button',
        step: 9,
        steps: [],
        highlight: [{ testid: 'table-column-assignment-confirm-button' }],
        capture: CREATE_DIALOG,
      },
      {
        id: 'result',
        alt: 'The new network in the workspace and the network view',
        step: 10,
        steps: [
          { click: { testid: 'table-column-assignment-confirm-button' } },
          { waitFor: { text: 'table-data-from-cy-tutorial' } },
          { waitFor: { testid: 'cyjs-renderer' } },
          { wait: 2000 },
        ],
      },
    ],
    sources: [
      'src/features/ToolBar/FileUpload.tsx',
      'src/features/TableDataLoader/components/CreateNetworkFromTable/**',
      'src/features/TableDataLoader/components/previewTableParts.tsx',
    ],
  },
  {
    id: 'merge',
    title: 'Basic Operations',
    viewport: { width: 1280, height: 900 },
    frames: [
      {
        id: 'menu',
        alt: 'Tools → Merge Networks in the menu bar',
        step: 1,
        steps: [
          { importNetwork: GAL_NETWORK, expectText: GAL_NAME },
          { importNetwork: HSF1_NETWORK, expectText: HSF1_NAME },
          { click: { testid: 'toolbar-tools-menu-menu-button' } },
        ],
        highlight: [{ role: 'menuitem', name: 'Merge Networks' }],
      },
      {
        id: 'merge-type',
        alt: 'The merge type buttons: Union, Intersection and Difference',
        step: 2,
        steps: [
          { click: { role: 'menuitem', name: 'Merge Networks' } },
          { waitFor: { testid: 'merge-dialog-union-button' } },
        ],
        highlight: [{ role: 'group', name: 'Merge type' }],
        capture: MERGE_DIALOG,
      },
      {
        id: 'name',
        alt: 'The Merged Network Name box',
        step: 3,
        steps: [],
        highlight: [{ role: 'textbox', name: 'Merged Network Name:' }],
        capture: MERGE_DIALOG,
      },
      {
        id: 'add',
        alt: 'A network selected in Available Networks, and the right arrow',
        step: 4,
        steps: [{ click: { role: 'button', name: GAL_NAME } }],
        highlight: [{ role: 'button', name: 'Add to Networks to Merge' }],
        capture: MERGE_DIALOG,
      },
      {
        id: 'order',
        alt: 'Both networks in Networks to Merge, the first marked as the base network, and the up and down arrows',
        step: 5,
        steps: [
          { click: { role: 'button', name: 'Add to Networks to Merge' } },
          { click: { role: 'button', name: HSF1_NAME } },
          { click: { role: 'button', name: 'Add to Networks to Merge' } },
          { click: { role: 'button', name: GAL_NAME } },
        ],
        highlight: [
          { role: 'button', name: 'Move up' },
          { role: 'button', name: 'Move down' },
        ],
        capture: MERGE_DIALOG,
      },
      {
        id: 'merge-button',
        alt: 'The Merge button',
        step: 6,
        steps: [],
        highlight: [{ testid: 'merge-dialog-merge-button' }],
        capture: MERGE_DIALOG,
      },
      {
        id: 'result',
        alt: 'The merged network in the workspace and the network view',
        step: 7,
        steps: [
          { click: { testid: 'merge-dialog-merge-button' } },
          { waitFor: { text: 'Merged Network' } },
          { wait: 2000 },
        ],
      },
    ],
    sources: [
      'src/features/MergeNetworks/components/MergeDialog.tsx',
      'src/features/ToolBar/ToolsMenu/MergeNetwork.tsx',
    ],
  },
  {
    id: 'column-filter',
    title: 'Select Nodes with a Column Filter',
    viewport: { width: 1280, height: 800 },
    frames: [
      {
        id: 'tab',
        alt: 'The FILTER tab of the side panel',
        step: 1,
        steps: [{ importNetwork: GAL_NETWORK, expectText: GAL_NAME }],
        highlight: [{ role: 'tab', name: 'Filter' }],
      },
      {
        id: 'add',
        alt: 'The Add new condition button',
        step: 2,
        steps: [
          { click: { role: 'tab', name: 'Filter' } },
          { waitFor: { testid: 'filter-condition-root-add' } },
        ],
        highlight: [{ testid: 'filter-condition-root-add' }],
      },
      {
        id: 'column-filter',
        alt: 'The kinds of condition, with Column filter ringed',
        step: 3,
        steps: [{ click: { testid: 'filter-condition-root-add' } }],
        highlight: [{ testid: 'filter-condition-root-add-column' }],
      },
      {
        id: 'column',
        alt: 'The column list, with Node: Degree ringed',
        step: 4,
        steps: [
          { click: { testid: 'filter-condition-root-add-column' } },
          { click: { role: 'combobox', name: 'Column' } },
        ],
        highlight: [{ role: 'option', name: 'Node: Degree' }],
      },
      {
        id: 'range',
        alt: 'The range fields and slider of a number column',
        step: 5,
        steps: [{ click: { role: 'option', name: 'Node: Degree' } }],
        highlight: [
          { role: 'textbox', name: 'Lower bound' },
          { role: 'textbox', name: 'Upper bound' },
        ],
      },
      {
        id: 'selected',
        alt: 'The nodes with degree 3 or more selected, and the select and show choice',
        step: 6,
        steps: [
          { fill: { role: 'textbox', name: 'Lower bound' }, text: '3' },
          { press: 'Tab' },
        ],
        highlight: [{ role: 'radiogroup', name: 'Apply the filter by' }],
      },
      {
        id: 'apply',
        alt: 'Apply when filter changes, the Apply button and the result line',
        step: 7,
        steps: [],
        highlight: [{ testid: 'filter-apply-panel' }],
      },
    ],
    sources: [
      'src/features/Filter/FilterTab.tsx',
      'src/features/Filter/components/**',
    ],
  },
  {
    id: 'styles-tutorial',
    title: 'Creating a Basic Style with Discrete and Continuous Mappings',
    viewport: { width: 1280, height: 800 },
    frames: [
      {
        id: 'shape-default',
        alt: 'The Shape picker opened from the Default box, with the ellipse ringed',
        step: 1,
        steps: [
          { importNetwork: GAL_NETWORK, expectText: GAL_NAME },
          { click: { testid: 'network-browser-panel-style-tab' } },
          { click: { testid: 'vizmapper-nodes-tab' } },
          { click: styleBox('Shape', 0) },
        ],
        highlight: [{ testid: 'node-shape-picker-option-ellipse' }],
      },
      {
        id: 'fill-default',
        alt: 'The color picker opened from the Default box of Fill Color, with a light grey ringed',
        step: 2,
        steps: [
          { click: { testid: 'node-shape-picker-option-ellipse' } },
          { click: { testid: 'node-shape-picker-confirm-button' } },
          { click: styleBox('Fill Color', 0) },
          { click: { testid: 'color-picker-swatches-tab' } },
        ],
        highlight: [{ selector: SWATCH('#d2d2d2') }],
      },
      {
        id: 'stroke-mapping',
        alt: 'The mapping form of Stroke Color, with the Column list ringed',
        step: 3,
        steps: [
          { click: { selector: SWATCH('#d2d2d2') } },
          { click: { testid: 'color-picker-confirm-button' } },
          { click: { testid: 'vizmapper-edges-tab' } },
          { click: styleBox('Stroke Color', 1) },
          { waitFor: { testid: 'mapping-form-popover' } },
        ],
        highlight: [{ testid: 'mapping-form-column-select' }],
      },
      {
        id: 'discrete',
        alt: 'A discrete mapping on interaction, listing pp and pd',
        step: 4,
        steps: [
          { click: { testid: 'mapping-form-column-select' } },
          { click: { role: 'option', name: 'interaction' } },
          { click: { testid: 'mapping-form-type-select' } },
          { click: { role: 'option', name: 'discrete' } },
        ],
        highlight: [
          { testid: 'discrete-mapping-checkbox-pp' },
          { testid: 'discrete-mapping-delete-button-pd' },
        ],
      },
      {
        id: 'discrete-color',
        alt: 'The color picker of the pp value, with a dark blue ringed',
        step: 5,
        steps: [
          { click: DISCRETE_VALUE('pp') },
          { click: { testid: 'color-picker-swatches-tab' } },
        ],
        highlight: [{ selector: SWATCH('#0b00a8') }],
      },
      {
        id: 'fill-mapping',
        alt: 'The mapping form of Fill Color on the Nodes tab, with the Column list ringed',
        step: 6,
        steps: [
          { click: { selector: SWATCH('#0b00a8') } },
          { click: { testid: 'color-picker-confirm-button' } },
          { click: DISCRETE_VALUE('pd') },
          { click: { testid: 'color-picker-swatches-tab' } },
          { click: { selector: SWATCH('#00a800') } },
          { click: { testid: 'color-picker-confirm-button' } },
          { click: { testid: 'mapping-form-close-button' } },
          { click: { testid: 'vizmapper-nodes-tab' } },
          { click: styleBox('Fill Color', 1) },
          { waitFor: { testid: 'mapping-form-popover' } },
        ],
        highlight: [{ testid: 'mapping-form-column-select' }],
      },
      {
        id: 'continuous',
        alt: 'A continuous mapping on gal1RGexp, with its gradient',
        step: 7,
        steps: [
          { click: { testid: 'mapping-form-column-select' } },
          { click: { role: 'option', name: 'gal1RGexp' } },
          { click: { testid: 'mapping-form-type-select' } },
          { click: { role: 'option', name: 'continuous' } },
        ],
        highlight: [{ testid: 'mapping-form-type-select' }],
      },
      {
        id: 'palette',
        alt: 'The Set Palette window on the diverging palettes',
        step: 8,
        steps: [
          { click: { selector: CURRENT_PALETTE } },
          { click: { testid: 'palette-category-tab-diverging' } },
        ],
        highlight: [{ label: 'Diverging 1' }],
      },
      {
        id: 'select-node',
        alt: 'One node selected in the network view',
        step: 9,
        steps: [
          { click: { label: 'Diverging 1' } },
          { click: { role: 'button', name: 'Confirm' } },
          { click: { testid: 'mapping-form-close-button' } },
          { selectNodes: ['7998'] },
        ],
      },
      {
        id: 'bypass',
        alt: 'The Bypass form of Fill Color for the selected node',
        step: 10,
        steps: [
          { click: styleBox('Fill Color', 2) },
          { waitFor: { testid: 'bypass-form-popover' } },
        ],
        highlight: [{ selector: BYPASS_VALUE }],
      },
    ],
    sources: [
      'src/features/Vizmapper/index.tsx',
      'src/features/Vizmapper/Forms/**',
      'src/features/Vizmapper/PalettePicker/**',
      'src/features/Vizmapper/VisualPropertyRender/Color.tsx',
      'src/features/Vizmapper/VisualPropertyRender/NodeShape.tsx',
    ],
  },
]

export const findScreenshotSequence = (
  id: string,
): ScreenshotSequence | undefined =>
  SCREENSHOT_SEQUENCES.find((sequence) => sequence.id === id)

/** Where a sequence frame is published, relative to `public/`. */
export const sequenceFramePath = (
  sequenceId: string,
  frameId: string,
): string => `manual-assets/generated/${sequenceId}/${frameId}.png`

export const findScreenshotRecipe = (
  id: string,
): ScreenshotRecipe | undefined =>
  SCREENSHOT_RECIPES.find((recipe) => recipe.id === id)

/** Where a recipe's image is published, relative to `public/`. */
export const screenshotPath = (id: string): string =>
  `manual-assets/generated/${id}.png`
