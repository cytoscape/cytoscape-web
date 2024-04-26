import { Box, Tooltip } from '@mui/material'
import * as d3Hierarchy from 'd3-hierarchy'
import * as d3Selection from 'd3-selection'
import * as d3Zoom from 'd3-zoom'
import { useEffect, useRef, useState } from 'react'
import { Network } from '../../../../models/NetworkModel'
import {
  CirclePackingType,
  createCirclePackingView,
  createTreeLayout,
} from './CirclePackingLayout'
import {
  getColorMapper,
  getFontSize,
  getLabel,
  toCenter,
} from './CirclePackingUtils'
import { D3TreeNode } from './D3TreeNode'
import { useViewModelStore } from '../../../../store/ViewModelStore'
import { NetworkView } from '../../../../models/ViewModel'
import { IdType } from '../../../../models/IdType'
import { CirclePackingView } from '../../model/CirclePackingView'
import { useVisualStyleStore } from '../../../../store/VisualStyleStore'
import { VisualStyle } from '../../../../models/VisualStyleModel'
import { applyVisualStyle } from '../../../../models/VisualStyleModel/impl/VisualStyleFnImpl'
import { useSubNetworkStore } from '../../store/SubNetworkStore'
import { useTableStore } from '../../../../store/TableStore'
import { SearchState } from '../../../../models/FilterModel/SearchState'
import { useFilterStore } from '../../../../store/FilterStore'

interface CirclePackingPanelProps {
  network: Network
}

/**
 * Default styling values
 *
 * TODO: store these in the Visual Style model
 *
 */
const CpDefaults = {
  borderColor: '#666',
  selectedBorderColor: 'orange',
  leafBorderColor: 'red',
  borderWidth: 0.05,
  borderWidthHover: 1,
} as const

const CP_WRAPPER_CLASS = 'circle-packing-wrapper'

/**
 * Circle Packing renderer as a variant of the network viewer
 *
 *
 */
export const CirclePackingPanel = ({
  network,
}: CirclePackingPanelProps): JSX.Element => {
  // Color scale for the circles in the view
  const colorScale = getColorMapper([0, 1000])

  // Use this ref to access the SVG element generated by D3
  const ref = useRef<SVGSVGElement>(null)

  // Use this ref to access the parent element for checking the dimensions
  // const refParent = useRef<HTMLDivElement>(null)

  // Reference to check the component is initialized or not
  const initRef = useRef(false)

  // Dimensions of the parent (container) element
  // const [dimensions, setDimensions] = useState({ width: 0, height: 0 })

  // Check the state of the search result
  const searchState: SearchState = useFilterStore((state) => state.search.state)

  // Expand all circles if the search result is shown
  const [expandAll, setExpandAll] = useState<boolean>(false)

  // For keeping track of the selected leaf node which does not exist in the original network
  const [selectedLeaf, setSelectedLeaf] = useState<string>('')

  // ID of the network to be rendered
  const networkId: IdType = network.id
  const tables = useTableStore((state) => state.tables)

  // Tables associated with the network
  const { nodeTable, edgeTable } = tables[networkId] ?? {}

  // Use visual style store for getting the visual style
  const visualStyles: Record<string, VisualStyle> = useVisualStyleStore(
    (state) => state.visualStyles,
  )

  // VS for the current network view
  const visualStyle: VisualStyle = visualStyles[networkId]

  // For adding newly created Circle Packing view model
  const addViewModel = useViewModelStore((state) => state.add)
  const getViewModel = useViewModelStore((state) => state.getViewModel)
  const viewModelMap: Record<IdType, NetworkView[]> = useViewModelStore(
    (state) => state.viewModels,
  )
  const views: NetworkView[] = viewModelMap[networkId] ?? []

  // For updating the selected nodes
  const exclusiveSelect = useViewModelStore((state) => state.exclusiveSelect)

  // Find CP View Model
  const circlePackingView: CirclePackingView | undefined = views.find(
    (view) => view.type === CirclePackingType,
  ) as CirclePackingView

  const selectedNodes: IdType[] = circlePackingView?.selectedNodes ?? []

  // Pick the first selected node
  // const selected: string = selectedNodes[0]

  /**
   * Show all circles if selectedNodes has multiple entries
   * Also, it display the selected nodes as a red circles
   *
   */
  useEffect(() => {
    if (searchState === SearchState.DONE) {
      // setExpandAll(true)
      // d3Selection.selectAll('circle').style('display', 'inline')
    } else {
      // setExpandAll(false)
      // setShowSearchResult(false)
    }
  }, [searchState])

  // For tooltip
  const [tooltipOpen, setTooltipOpen] = useState<boolean>(false)
  const [tooltipContent, setTooltipContent] = useState<string>('')
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })

  const [hoveredEnter, setHoveredEnter] = useState<D3TreeNode>()

  // For selecting nodes in the sub network view
  const setSelectedNodes = useSubNetworkStore((state) => state.setSelectedNodes)

  const selectedNodeSet = new Set<string>(selectedNodes)

  // useEffect(() => {
  //   if (ref.current) {
  //     setDimensions({
  //       width: refParent.current.clientWidth,
  //       height: refParent.current.clientHeight,
  //     })
  //     console.log('Parent dimensions updated', dimensions)
  //   }
  // }, [refParent.current?.clientWidth, refParent.current?.clientHeight])

  const showObjects = (
    d: d3Hierarchy.HierarchyNode<D3TreeNode>,
    maxDepth: number,
  ): string => {
    // Always display all subsystems/genes if the search result is shown
    if (expandAll || d.depth === 0 || d.depth <= maxDepth) {
      return 'inline'
    } else {
      return 'none'
    }
  }

  const updateForZoom = (maxDepth: number): void => {
    d3Selection
      .selectAll('circle')
      .style('display', (d: d3Hierarchy.HierarchyNode<D3TreeNode>): string =>
        showObjects(d, maxDepth),
      )

    d3Selection
      .selectAll('text')
      .style('display', (d: d3Hierarchy.HierarchyNode<D3TreeNode>): string => {
        // Zooming logic:
        // 1. If the node is the root node, always hide the label
        // 2. If leaf node, hide the label if the zoom level is below the threshold
        // 3. If non-leaf node, show the label based on the expansion level
        const isLeaf: boolean = d.height === 0

        if (d.depth !== 0 && d.depth === maxDepth) {
          return 'inline'
        } else if (isLeaf && d.depth < maxDepth) {
          return 'inline'
        } else {
          return 'none'
        }
      })
  }

  const handleZoom = (e: any): void => {
    const selectedArea = d3Selection.select('svg g')
    selectedArea.attr('transform', e.transform)
    const currentZoomLevel = e.transform.k
    const maxDepth = Math.ceil(currentZoomLevel)
    updateForZoom(maxDepth)
  }

  const draw = (rootNode: d3Hierarchy.HierarchyNode<D3TreeNode>): void => {
    const width = ref.current?.clientWidth ?? 0
    const height = ref.current?.clientHeight ?? 0
    const pack = d3Hierarchy.pack().size([width, height]).padding(0)
    pack(rootNode)

    // Pick the base tag
    const svg: any = d3Selection.select(ref.current)
    const wrapper = svg.append('g').attr('class', CP_WRAPPER_CLASS)

    wrapper
      .append('g')
      .selectAll('circle')
      .data(rootNode.descendants())
      .join('circle')
      .attr('cx', (d: d3Hierarchy.HierarchyCircularNode<any>) => d.x)
      .attr('cy', (d: d3Hierarchy.HierarchyCircularNode<any>) => d.y)
      .attr('r', (d: d3Hierarchy.HierarchyCircularNode<any>) => d.r)
      .attr('stroke', (d: d3Hierarchy.HierarchyCircularNode<any>) =>
        selectedNodeSet.has(d.data.id)
          ? CpDefaults.selectedBorderColor
          : CpDefaults.borderColor,
      )
      .attr('stroke-width', (d: d3Hierarchy.HierarchyCircularNode<any>) => {
        // return d.data.id === selected || d.data.originalId === selected
        return selectedNodeSet.has(d.data.id) ||
          selectedNodeSet.has(d.data.originalId)
          ? CpDefaults.borderWidthHover
          : CpDefaults.borderWidth
      })
      .attr('fill', (d: d3Hierarchy.HierarchyNode<D3TreeNode>) => {
        return colorScale(d.depth * 200)
      })
      .on(
        'mouseenter',
        function (e: any, d: d3Hierarchy.HierarchyCircularNode<D3TreeNode>) {
          setHoveredEnter(d.data)
        },
      )
      .on('click', function (e: any, d: d3Hierarchy.HierarchyNode<D3TreeNode>) {
        if (d.height !== 0) {
          if (d.data.originalId !== undefined) {
            exclusiveSelect(network.id, [d.data.originalId], [])
          } else {
            exclusiveSelect(network.id, [d.data.id], [])
          }
        } else {
          // This is a leaf node

          // Set always one node by clicking on the leaf node
          setSelectedNodes([d.data.name])

          // Select the parent node instead
          const { parent } = d
          if (parent === null || parent === undefined) return

          const selectedChild = d.data.originalId ?? d.data.id
          setSelectedLeaf(selectedChild)

          if (parent.data.originalId !== undefined) {
            exclusiveSelect(network.id, [parent.data.originalId], [])
          } else {
            exclusiveSelect(network.id, [parent.data.id], [])
          }
        }
      })
      .on('mousemove', function (e: any) {
        setTooltipPosition({ x: e.clientX + 20, y: e.clientY + 20 })
      })

    wrapper
      .append('g')
      .selectAll('text')
      .data(rootNode.descendants())
      .join('text')
      .each(function (d: d3Hierarchy.HierarchyCircularNode<D3TreeNode>) {
        // Add the label on top of the circle
        const label: string = getLabel(
          d.data.id,
          circlePackingView,
          d.data.name,
        )

        // Split the label into words
        const words = label === undefined ? [] : label.split(' ') ?? []

        const fontSize = getFontSize(d)
        // Calculate the total height of the text
        const textHeight: number = words.length * fontSize
        // Create a tspan for each word
        words.forEach((word: string, lineNumber: number) => {
          d3Selection
            .select(this)
            .append('tspan')
            .text(word)
            .attr('x', d.x)
            .attr(
              'y',
              d.y + lineNumber * fontSize * 1.2 - textHeight / 2 + fontSize / 2,
            ) // Adjust the y position based on the line number
            .style('user-select', 'none')
        })
      })
      .attr(
        'font-size',
        (d: d3Hierarchy.HierarchyCircularNode<any>) => `${d.r / 70}em`,
      )
      .attr('text-anchor', 'middle')
      .attr('x', (d: d3Hierarchy.HierarchyCircularNode<any>) => d.x)
      .attr('y', (d: d3Hierarchy.HierarchyCircularNode<any>) => d.y)
      .style('display', (d: d3Hierarchy.HierarchyNode<D3TreeNode>): string => {
        const isLeaf: boolean = d.height === 0
        const isRoot: boolean = d.depth === 0
        return isLeaf || isRoot ? 'none' : 'inline'
      })

    // Now this should work
    const zoom = d3Zoom.zoom().scaleExtent([0.1, 40]).on('zoom', handleZoom)
    svg.call(zoom)
    updateForZoom(1)
    toCenter(wrapper, { width, height })
  }

  /**
   * Redraw the circle packing layout when the view model has been updated
   */
  useEffect(() => {
    if (circlePackingView === undefined) return

    const newCpViewModel = updateView()
    if (newCpViewModel === undefined) return

    const rootNode: d3Hierarchy.HierarchyNode<D3TreeNode> =
      newCpViewModel.hierarchy as d3Hierarchy.HierarchyNode<D3TreeNode>
    const { nodeViews } = newCpViewModel
    if (nodeViews === undefined) return

    d3Selection
      .select('.circle-packing-wrapper')
      .selectAll('text')
      .data(rootNode.descendants())
      .text((d) => getLabel(d.data.id, newCpViewModel, d.data.name))
  }, [visualStyle])

  const updateView = () => {
    if (network === undefined || nodeTable === undefined) return
    const primaryView = getViewModel(networkId)

    // Primary view is not ready yet.
    if (primaryView === undefined) return

    let rootNode: d3Hierarchy.HierarchyNode<D3TreeNode> =
      circlePackingView?.hierarchy as d3Hierarchy.HierarchyNode<D3TreeNode>

    if (rootNode === undefined) {
      rootNode = createTreeLayout(network, nodeTable)
    }

    const updatedView = applyVisualStyle({
      network: network,
      visualStyle: visualStyle,
      nodeTable: nodeTable,
      edgeTable: edgeTable,
      networkView: primaryView,
    })

    const cpViewModel: CirclePackingView = createCirclePackingView(
      updatedView,
      rootNode,
    )
    addViewModel(network.id, cpViewModel)
    console.log('CPV Model Created-----------')
    return cpViewModel
  }

  /**
   * Based on the network data and original view model, create a Circle Packing view model
   */
  useEffect(() => {
    updateView()
  }, [network])

  useEffect(() => {
    if (
      ref.current === null ||
      initRef.current ||
      circlePackingView === undefined
    )
      return

    const rootNode: d3Hierarchy.HierarchyNode<D3TreeNode> =
      circlePackingView.hierarchy as d3Hierarchy.HierarchyNode<D3TreeNode>

    if (rootNode === undefined) return

    draw(rootNode)
    initRef.current = true
  }, [circlePackingView])

  useEffect(() => {
    if (hoveredEnter === undefined) {
      setTooltipOpen(false)
      return
    }

    const label: string = getLabel(
      hoveredEnter.id,
      circlePackingView,
      hoveredEnter.name,
    )
    setTooltipContent(label)
    setTooltipOpen(true)
    const timeoutId = setTimeout(() => {
      setTooltipOpen(false)
    }, 2000)

    // Clear the timeout when the component unmounts
    return () => {
      clearTimeout(timeoutId)
    }
  }, [hoveredEnter])

  useEffect(() => {
    // Update the stroke color of the circles based on whether their node is selected
    d3Selection
      .select('.circle-packing-wrapper')
      .selectAll('circle')
      .attr('stroke', (d: d3Hierarchy.HierarchyCircularNode<D3TreeNode>) => {
        if (selectedNodeSet.has(d.data.id)) {
          return CpDefaults.selectedBorderColor
        } else if (d.data.name === selectedLeaf) {
          return CpDefaults.leafBorderColor
        } else {
          return CpDefaults.borderColor
        }
      })
      .attr(
        'stroke-width',
        (d: d3Hierarchy.HierarchyCircularNode<D3TreeNode>) =>
          selectedNodeSet.has(d.data.id) ||
          d.data.id === selectedLeaf ||
          d.data.name === selectedLeaf
            ? CpDefaults.borderWidthHover
            : CpDefaults.borderWidth,
      )
  }, [selectedNodes, selectedLeaf])

  console.log('Circle Packing Panel rendered')
  return (
    <>
      <svg ref={ref} width={'100%'} height={'100%'} />
      <Tooltip
        open={tooltipOpen}
        title={tooltipContent}
        style={{
          position: 'fixed',
          top: tooltipPosition.y,
          left: tooltipPosition.x,
        }}
      >
        <div />
      </Tooltip>
    </>
  )
}
