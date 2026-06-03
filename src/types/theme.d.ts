import '@mui/material/styles'

declare module "@mui/material/styles" {
  interface TypeBackground {
    header: string
  }

  interface PaletteOptions {
    background?: Partial<TypeBackground>
  }
}