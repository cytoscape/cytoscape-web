export type RGB = `rgb(${number}, ${number}, ${number})`
export type RGBA = `rgba(${number}, ${number}, ${number}, ${number})`
export type HEX = `#${string}`

// restrict the type of color for now as most logic in the app assumes
// that the color is a hex string
export type ColorType = HEX
