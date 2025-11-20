import { IdType } from '../../IdType'
import { Renderer } from '../Renderer'
import { ViewPort } from '../ViewPort'

export interface RendererState {
  renderers: Record<string, Renderer>
  defaultRendererName: string
  viewports: Record<string, Record<IdType, ViewPort>>
}

/**
 * Add a renderer
 */
export const add = (
  state: RendererState,
  renderer: Renderer,
): RendererState => {
  return {
    ...state,
    renderers: {
      ...state.renderers,
      [renderer.id]: renderer,
    },
  }
}

/**
 * Delete a renderer
 */
export const deleteRenderer = (
  state: RendererState,
  rendererId: string,
): RendererState => {
  const { [rendererId]: deleted, ...restRenderers } = state.renderers
  return {
    ...state,
    renderers: restRenderers,
  }
}

/**
 * Set viewport for a renderer and network
 */
export const setViewport = (
  state: RendererState,
  rendererId: string,
  networkId: IdType,
  viewport: ViewPort,
): RendererState => {
  const rendererViewports = state.viewports[rendererId] ?? {}
  return {
    ...state,
    viewports: {
      ...state.viewports,
      [rendererId]: {
        ...rendererViewports,
        [networkId]: viewport,
      },
    },
  }
}

/**
 * Get viewport for a renderer and network
 */
export const getViewport = (
  state: RendererState,
  rendererId: string,
  networkId: IdType,
): ViewPort | undefined => {
  return state.viewports[rendererId]?.[networkId]
}

