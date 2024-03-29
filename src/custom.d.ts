declare module '*.jpg'
declare module '*.png'
declare module '*.woff2'
declare module '*.woff'
declare module '*.ttf'

declare module '*.svg' {
  import React = require('react')

  export const ReactComponent: React.FC<React.SVGProps<SVGSVGElement>>
  const src: string
  export default src
}

declare module '*.json' {
  const value: any
  export default value
}

// global variables for debugging
interface Window {
  cy: any
  n: any
  nt: any
  et: any
  vs: any
  nv: any
}
