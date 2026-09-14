import cytoscape, { Core, CytoscapeOptions } from 'cytoscape'

import { registerCyExtensions } from '../registerCyExtensions'

let extensionsRegistered = false

export const ensureCyExtensions = (): void => {
  if (!extensionsRegistered) {
    registerCyExtensions()
    extensionsRegistered = true
  }
}

export interface SizedContainerOptions {
  id?: string
  width?: number
  height?: number
}

let containerCounter = 0

export const createSizedContainer = (
  options: SizedContainerOptions = {},
): HTMLDivElement => {
  const width = options.width ?? 800
  const height = options.height ?? 600
  const id = options.id ?? `cy-container-${++containerCounter}`

  const container = document.createElement('div')
  container.id = id
  container.style.width = `${width}px`
  container.style.height = `${height}px`

  Object.defineProperty(container, 'clientWidth', {
    configurable: true,
    value: width,
  })
  Object.defineProperty(container, 'clientHeight', {
    configurable: true,
    value: height,
  })
  Object.defineProperty(container, 'offsetWidth', {
    configurable: true,
    value: width,
  })
  Object.defineProperty(container, 'offsetHeight', {
    configurable: true,
    value: height,
  })
  container.getBoundingClientRect = () => ({
    top: 0,
    left: 0,
    right: width,
    bottom: height,
    width,
    height,
    x: 0,
    y: 0,
    toJSON: () => {},
  })

  document.body.appendChild(container)
  return container
}

export const createTestCytoscape = (
  options: Partial<CytoscapeOptions> = {},
  containerOptions?: SizedContainerOptions,
): { cy: Core; container: HTMLDivElement; destroy: () => void } => {
  ensureCyExtensions()
  const container =
    (options.container as HTMLDivElement) ??
    createSizedContainer(containerOptions)

  const cy = cytoscape({
    container,
    boxSelectionEnabled: true,
    hideEdgesOnViewport: true,
    ...options,
  })

  const destroy = (): void => {
    try {
      cy.destroy()
    } catch {
      // ignore
    }
    if (container.parentNode) {
      container.parentNode.removeChild(container)
    }
  }

  return { cy, container, destroy }
}
