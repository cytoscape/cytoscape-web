import '@mui/material/styles'
import '@mui/material/Paper'

declare module '@mui/material/styles' {
  interface TypeBackground {
    subtle: string
  }

  interface PaletteOptions {
    background?: Partial<TypeBackground>
  }
}

declare module '@mui/material/Paper' {
  interface PaperPropsVariantOverrides {
    filled: true
  }
}
