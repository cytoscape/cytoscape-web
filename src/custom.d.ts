declare module '*.jpg'
declare module '*.png'
declare module '*.woff2'
declare module '*.woff'
declare module '*.ttf'
declare module 'cytoscape'

declare module '*.svg' {
  import React = require('react')

  export const ReactComponent: React.FC<React.SVGProps<SVGSVGElement>>
  const src: string
  export default src
}
