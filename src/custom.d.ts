/// <reference types="vite/client" />

declare module '*.jpg'
declare module '*.png'
declare module '*.woff2'
declare module '*.woff'
declare module '*.ttf'

declare module '*.svg' {
  import type React from 'react'

  export const ReactComponent: React.FC<React.SVGProps<SVGSVGElement>>
  const src: string
  export default src
}

declare module '*.json' {
  const value: any
  export default value
}

declare module 'allotment' {
  import type React from 'react'

  export interface CommonProps {
    className?: string
    maxSize?: number
    minSize?: number
    snap?: boolean
  }

  export enum LayoutPriority {
    Normal = 'NORMAL',
    Low = 'LOW',
    High = 'HIGH',
  }

  export type PaneProps = {
    children: React.ReactNode
    preferredSize?: number | string
    priority?: LayoutPriority
    visible?: boolean
  } & CommonProps

  export const Pane: React.ForwardRefExoticComponent<
    PaneProps & React.RefAttributes<HTMLDivElement>
  >

  export type AllotmentHandle = {
    reset: () => void
    resize: (sizes: number[]) => void
  }

  export type AllotmentProps = {
    children: React.ReactNode
    defaultSizes?: number[]
    proportionalLayout?: boolean
    separator?: boolean
    sizes?: number[]
    vertical?: boolean
    onChange?: (sizes: number[]) => void
    onReset?: () => void
    onVisibleChange?: (index: number, visible: boolean) => void
  } & CommonProps

  export function setSashSize(sashSize: number): void

  const Allotment: React.ForwardRefExoticComponent<
    AllotmentProps & React.RefAttributes<AllotmentHandle>
  > & { Pane: typeof Pane }

  export { Allotment }
  export default Allotment
}

// Constants injected by Vite (see vite.config.ts).
//
// These are the bare-identifier forms, as opposed to the process.env.* forms
// defined alongside them. They exist so the boot shell can read the version
// and build time without referencing process.env, which has no shim at the
// point the pre-React shell chunk runs.
declare const REACT_APP_VERSION: string
declare const REACT_APP_BUILD_TIME: string

// global variables for debugging
interface Window {
  debug: any
}
