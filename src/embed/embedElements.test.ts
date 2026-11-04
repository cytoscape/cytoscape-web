// @vitest-environment node
import cytoscape, { Core } from 'cytoscape'
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import { addCyElements } from '@/features/NetworkPanel/CyjsRenderer/cyjsFactoryUtil'
import {
  applyViewModel,
  createCyjsDataMapper,
} from '@/features/NetworkPanel/CyjsRenderer/cyjsRenderUtil'
import { getCyNetworkFromCx2 } from '@/models/CxModel/impl'
import { CyNetwork } from '@/models/CyNetworkModel'
import { NetworkView } from '@/models/ViewModel'
import VisualStyleFn from '@/models/VisualStyleModel'
import { VisualEditorProperties } from '@/models/VisualStyleModel/VisualStyleOptions'

import { buildEmbedElements } from './embedElements'

const FIXTURE_DIRS = ['test/fixtures/cx2/valid', 'test/fixtures/ndex']

// Fixtures over 1 MB (the 12,000-edge DAS network) take ~15 s here
const MAX_FIXTURE_BYTES = 1_000_000
const TIMEOUT_MS = 20_000

const fixtures = FIXTURE_DIRS.flatMap((dir) =>
  fs
    .readdirSync(dir)
    .filter((file) => file.endsWith('.cx2'))
    .map((file) => path.join(dir, file))
    .filter((file) => fs.statSync(file).size <= MAX_FIXTURE_BYTES),
)

const editorProperties = (cyNetwork: CyNetwork): VisualEditorProperties =>
  cyNetwork.visualStyleOptions?.visualEditorProperties ?? {
    nodeSizeLocked: false,
    arrowColorMatchesEdge: false,
    tableDisplayConfiguration: {
      nodeTable: { columnConfiguration: [] },
      edgeTable: { columnConfiguration: [] },
    },
  }

const headless = (): Core => cytoscape({ headless: true, styleEnabled: true })

/** The full app's pipeline: CyjsRenderer.tsx renderNetwork. */
const drawAsFullApp = (cyNetwork: CyNetwork, view: NetworkView): Core => {
  const cy = headless()
  addCyElements(
    cy,
    Object.values(view.nodeViews),
    cyNetwork.network.edges,
    view.edgeViews,
  )
  applyViewModel(cy, view, editorProperties(cyNetwork))
  cy.style(createCyjsDataMapper(cyNetwork.visualStyle) as any)
  return cy
}

const drawAsEmbed = (cyNetwork: CyNetwork, view: NetworkView): Core => {
  const cy = headless()
  const { nodes, edges, stylesheet } = buildEmbedElements(
    cyNetwork,
    view,
    editorProperties(cyNetwork),
  )
  cy.style(stylesheet as any)
  cy.add(nodes)
  cy.add(edges)
  return cy
}

/** Every computed style property that differs: [element, property, embed, app]. */
const styleDiffs = (embed: Core, app: Core): unknown[][] => {
  const diffs: unknown[][] = []
  app.elements().forEach((appEle) => {
    const embedStyle = embed.getElementById(appEle.id()).style()
    Object.entries(appEle.style()).forEach(([prop, value]) => {
      if (embedStyle[prop] !== value) {
        diffs.push([appEle.id(), prop, embedStyle[prop], value])
      }
    })
  })
  return diffs.slice(0, 10)
}

describe('buildEmbedElements', () => {
  it.each(fixtures)(
    'styles every element of %s as the full app',
    (file) => {
      const cyNetwork = getCyNetworkFromCx2(
        'n',
        JSON.parse(fs.readFileSync(file, 'utf8')),
      )
      const view = VisualStyleFn.applyVisualStyle({
        network: cyNetwork.network,
        networkView: cyNetwork.networkViews[0],
        nodeTable: cyNetwork.nodeTable,
        edgeTable: cyNetwork.edgeTable,
        visualStyle: cyNetwork.visualStyle,
      })
      const app = drawAsFullApp(cyNetwork, view)
      const embed = drawAsEmbed(cyNetwork, view)

      expect(styleDiffs(embed, app)).toEqual([])
      app.elements().select()
      embed.elements().select()
      expect(styleDiffs(embed, app)).toEqual([])
    },
    TIMEOUT_MS,
  )

  it('moves a value shared by every node out of the node data', () => {
    const cyNetwork = getCyNetworkFromCx2(
      'n',
      JSON.parse(
        fs.readFileSync(
          'test/fixtures/cx2/valid/small-network.valid.cx2',
          'utf8',
        ),
      ),
    )
    const view = VisualStyleFn.applyVisualStyle({
      network: cyNetwork.network,
      networkView: cyNetwork.networkViews[0],
      nodeTable: cyNetwork.nodeTable,
      edgeTable: cyNetwork.edgeTable,
      visualStyle: cyNetwork.visualStyle,
    })
    const { nodes, stylesheet } = buildEmbedElements(
      cyNetwork,
      view,
      editorProperties(cyNetwork),
    )
    const nodeDefaults = stylesheet.find(
      (rule, i) => rule.selector === 'node' && i > 1,
    )
    expect(nodeDefaults?.style).toHaveProperty('shape')
    expect(nodes.every((n) => n.data.nodeShape === undefined)).toBe(true)
  })
})
