import '@mui/material/styles'

declare module "@mui/material/styles" {
  interface TypeBackground {
    header: string
  }

  interface TypeButton {
    main: string
    hover: string
    selected: string
  }

  interface Palette {
    button: TypeButton; 
  }

  interface PaletteOptions {
    background?: Partial<TypeBackground>
    button: Partial<TypeButton>
  }
}