/**
 * Concept-primer content shown in the first-run Welcome dialog.
 *
 * Single source of truth for the "what is this app" copy. Authored as
 * structured data (rendered with MUI Typography) rather than markdown so it
 * stays type-checked and needs no HTML injection.
 */

export interface ConceptSlide {
  /** MUI icon name (from @mui/icons-material) rendered at the top of the card. */
  icon: 'Hub' | 'AccountTree' | 'Palette' | 'TableChart' | 'Insights'
  title: string
  /** One or more paragraphs of body copy. */
  body: string[]
}

export const WELCOME_TITLE = 'Welcome to Cytoscape Web'

export const WELCOME_INTRO =
  'Cytoscape Web is a tool for exploring and styling biological networks right in your browser. Here are the core ideas — then we can walk through the app together.'

export const CONCEPT_SLIDES: ConceptSlide[] = [
  {
    icon: 'Hub',
    title: 'Workspace',
    body: [
      'Your workspace holds every network you are working with, along with their tables and visual styles.',
      'It is saved automatically in this browser, so your networks are still here when you come back. Networks in a workspace are shared across browser tabs on this computer.',
      'Nothing is uploaded to NDEx — or anywhere else — unless you ask for it. Editing a network you opened from NDEx leaves the copy in NDEx untouched.',
      'Browser storage is not a backup: clearing site data, switching browsers or profiles, and private windows all lose it. Use Data › Export Workspace Backup, or save to NDEx, for a copy that outlives this browser.',
    ],
  },
  {
    icon: 'AccountTree',
    title: 'Networks',
    body: [
      'A network is a graph of nodes (e.g. genes or proteins) connected by edges (their relationships).',
      'Load one from NDEx, import a file (CX2, SIF, or a table), or open a sample network to try things out. The network renders on the central canvas where you can pan, zoom, and select.',
    ],
  },
  {
    icon: 'Palette',
    title: 'Visual Styles',
    body: [
      'A visual style controls how the network looks — node color, size, shape, edge width, labels, and more.',
      'Using the Style panel (the Vizmapper), you can map data columns to visual properties, so the picture reflects the underlying data.',
    ],
  },
  {
    icon: 'TableChart',
    title: 'Tables',
    body: [
      'Every network has node and edge tables holding the data behind the graph.',
      'The table browser at the bottom lets you inspect and edit those columns — and any changes flow back into what you see on the canvas.',
    ],
  },
  {
    icon: 'Insights',
    title: 'Hierarchies & Analysis',
    body: [
      'Some networks are hierarchical (HCX) — systems made of nested subsystems that you can drill into with the Hierarchy viewer.',
      'From there you can run analyses, including LLM-assisted interpretation of gene sets.',
    ],
  },
]
