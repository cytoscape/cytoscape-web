import {
  SequentialCustomColors,
  DivergingCustomColors,
  VirdisCustomColors,
} from './colorUtils'
import { ColorType } from '../VisualPropertyValue/ColorType'
import { ColorPalette } from '../VisualPropertyValue/ColorPalette'
import {
  PaletteDefinition,
  PaletteMetadata,
} from '../VisualPropertyValue/ColorPalette'

// Expanded palettes (ColorBrewer-like) for CustomGraphics
export const PALETTES: Record<string, PaletteDefinition> = {
  Sequential1: {
    metadata: {
      id: 'Sequential1',
      name: 'Sequential 1',
      category: 'sequential',
      colorBlindSafe: true,
    },
    colors: SequentialCustomColors[0] as ColorPalette,
  },
  Sequential2: {
    metadata: {
      id: 'Sequential2',
      name: 'Sequential 2',
      category: 'sequential',
      colorBlindSafe: true,
    },
    colors: SequentialCustomColors[1] as ColorPalette,
  },
  Sequential3: {
    metadata: {
      id: 'Sequential3',
      name: 'Sequential 3',
      category: 'sequential',
      colorBlindSafe: true,
    },
    colors: SequentialCustomColors[2] as ColorPalette,
  },
  Sequential4: {
    metadata: {
      id: 'Sequential4',
      name: 'Sequential 4',
      category: 'sequential',
      colorBlindSafe: true,
    },
    colors: SequentialCustomColors[3] as ColorPalette,
  },
  Sequential5: {
    metadata: {
      id: 'Sequential5',
      name: 'Sequential 5',
      category: 'sequential',
      colorBlindSafe: true,
    },
    colors: SequentialCustomColors[4] as ColorPalette,
  },
  Sequential6: {
    metadata: {
      id: 'Sequential6',
      name: 'Sequential 6',
      category: 'sequential',
      colorBlindSafe: true,
    },
    colors: SequentialCustomColors[5] as ColorPalette,
  },
  Sequential7: {
    metadata: {
      id: 'Sequential7',
      name: 'Sequential 7',
      category: 'sequential',
      colorBlindSafe: true,
    },
    colors: SequentialCustomColors[6] as ColorPalette,
  },
  Sequential8: {
    metadata: {
      id: 'Sequential8',
      name: 'Sequential 8',
      category: 'sequential',
      colorBlindSafe: true,
    },
    colors: SequentialCustomColors[7] as ColorPalette,
  },
  Sequential9: {
    metadata: {
      id: 'Sequential9',
      name: 'Sequential 9',
      category: 'sequential',
      colorBlindSafe: true,
    },
    colors: SequentialCustomColors[8] as ColorPalette,
  },
  Sequential10: {
    metadata: {
      id: 'Sequential10',
      name: 'Sequential 10',
      category: 'sequential',
      colorBlindSafe: true,
    },
    colors: SequentialCustomColors[9] as ColorPalette,
  },
  Sequential11: {
    metadata: {
      id: 'Sequential11',
      name: 'Sequential 11',
      category: 'sequential',
      colorBlindSafe: true,
    },
    colors: SequentialCustomColors[10] as ColorPalette,
  },
  Sequential12: {
    metadata: {
      id: 'Sequential12',
      name: 'Sequential 12',
      category: 'sequential',
      colorBlindSafe: true,
    },
    colors: SequentialCustomColors[11] as ColorPalette,
  },
  Sequential13: {
    metadata: {
      id: 'Sequential13',
      name: 'Sequential 13',
      category: 'sequential',
      colorBlindSafe: true,
    },
    colors: SequentialCustomColors[12] as ColorPalette,
  },
  Sequential14: {
    metadata: {
      id: 'Sequential14',
      name: 'Sequential 14',
      category: 'sequential',
      colorBlindSafe: true,
    },
    colors: SequentialCustomColors[13] as ColorPalette,
  },
  Sequential15: {
    metadata: {
      id: 'Sequential15',
      name: 'Sequential 15',
      category: 'sequential',
      colorBlindSafe: true,
    },
    colors: SequentialCustomColors[14] as ColorPalette,
  },
  Sequential16: {
    metadata: {
      id: 'Sequential16',
      name: 'Sequential 16',
      category: 'sequential',
      colorBlindSafe: true,
    },
    colors: SequentialCustomColors[15] as ColorPalette,
  },
  Sequential17: {
    metadata: {
      id: 'Sequential17',
      name: 'Sequential 17',
      category: 'sequential',
      colorBlindSafe: true,
    },
    colors: SequentialCustomColors[16] as ColorPalette,
  },
  Sequential18: {
    metadata: {
      id: 'Sequential18',
      name: 'Sequential 18',
      category: 'sequential',
      colorBlindSafe: true,
    },
    colors: SequentialCustomColors[17] as ColorPalette,
  },

  Diverging1: {
    metadata: {
      id: 'Diverging1',
      name: 'Diverging 1',
      category: 'diverging',
      colorBlindSafe: true,
    },
    colors: DivergingCustomColors[0] as ColorPalette,
  },
  Diverging2: {
    metadata: {
      id: 'Diverging2',
      name: 'Diverging 2',
      category: 'diverging',
      colorBlindSafe: true,
    },
    colors: DivergingCustomColors[1] as ColorPalette,
  },
  Diverging3: {
    metadata: {
      id: 'Diverging3',
      name: 'Diverging 3',
      category: 'diverging',
      colorBlindSafe: true,
    },
    colors: DivergingCustomColors[2] as ColorPalette,
  },
  Diverging4: {
    metadata: {
      id: 'Diverging4',
      name: 'Diverging 4',
      category: 'diverging',
      colorBlindSafe: true,
    },
    colors: DivergingCustomColors[3] as ColorPalette,
  },
  Diverging5: {
    metadata: {
      id: 'Diverging5',
      name: 'Diverging 5',
      category: 'diverging',
      colorBlindSafe: true,
    },
    colors: DivergingCustomColors[4] as ColorPalette,
  },
  Diverging6: {
    metadata: {
      id: 'Diverging6',
      name: 'Diverging 6',
      category: 'diverging',
      colorBlindSafe: true,
    },
    colors: DivergingCustomColors[5] as ColorPalette,
  },
  Diverging7: {
    metadata: {
      id: 'Diverging7',
      name: 'Diverging 7',
      category: 'diverging',
      colorBlindSafe: true,
    },
    colors: DivergingCustomColors[6] as ColorPalette,
  },
  Diverging8: {
    metadata: {
      id: 'Diverging8',
      name: 'Diverging 8',
      category: 'diverging',
      colorBlindSafe: true,
    },
    colors: DivergingCustomColors[7] as ColorPalette,
  },
  Diverging9: {
    metadata: {
      id: 'Diverging9',
      name: 'Diverging 9',
      category: 'diverging',
      colorBlindSafe: true,
    },
    colors: DivergingCustomColors[8] as ColorPalette,
  },
  Diverging10: {
    metadata: {
      id: 'Diverging10',
      name: 'Diverging 10',
      category: 'diverging',
      colorBlindSafe: true,
    },
    colors: DivergingCustomColors[9] as ColorPalette,
  },
  Diverging11: {
    metadata: {
      id: 'Diverging11',
      name: 'Diverging 11',
      category: 'diverging',
      colorBlindSafe: true,
    },
    colors: DivergingCustomColors[10] as ColorPalette,
  },

  Viridis1: {
    metadata: {
      id: 'Viridis1',
      name: 'Viridis 1',
      category: 'viridis',
      colorBlindSafe: true,
    },
    colors: VirdisCustomColors[0] as ColorPalette,
  },
  Viridis2: {
    metadata: {
      id: 'Viridis2',
      name: 'Viridis 2',
      category: 'viridis',
      colorBlindSafe: true,
    },
    colors: VirdisCustomColors[1] as ColorPalette,
  },
  Viridis3: {
    metadata: {
      id: 'Viridis3',
      name: 'Viridis 3',
      category: 'viridis',
      colorBlindSafe: true,
    },
    colors: VirdisCustomColors[2] as ColorPalette,
  },
  Viridis4: {
    metadata: {
      id: 'Viridis4',
      name: 'Viridis 4',
      category: 'viridis',
      colorBlindSafe: true,
    },
    colors: VirdisCustomColors[3] as ColorPalette,
  },

  // ColorBrewer diverging palettes for continuous mapping
  rdbu: {
    metadata: {
      id: 'rdbu',
      name: 'Red-Blue',
      category: 'diverging',
      colorBlindSafe: true,
    },
    colors: [
      '#67001f',
      '#b2182b',
      '#d6604d',
      '#f4a582',
      '#fddbc7',
      '#f7f7f7',
      '#d1e5f0',
      '#92c5de',
      '#4393c3',
      '#2166ac',
      '#053061',
    ] as ColorPalette,
    min: '#b2182b' as ColorType,
    middle: '#f7f7f7' as ColorType,
    max: '#2166ac' as ColorType,
  },
  puor: {
    metadata: {
      id: 'puor',
      name: 'Purple-Orange',
      category: 'diverging',
      colorBlindSafe: true,
    },
    colors: [
      '#7f3b08',
      '#b35806',
      '#e08214',
      '#fdb863',
      '#fee0b6',
      '#f7f7f7',
      '#d8daeb',
      '#b2abd2',
      '#8073ac',
      '#542788',
      '#2d004b',
    ] as ColorPalette,
    min: '#542788' as ColorType,
    middle: '#f7f7f7' as ColorType,
    max: '#b35806' as ColorType,
  },
  prgn: {
    metadata: {
      id: 'prgn',
      name: 'Purple-Red-Green',
      category: 'diverging',
      colorBlindSafe: true,
    },
    colors: [
      '#40004b',
      '#762a83',
      '#9970ab',
      '#c2a5cf',
      '#e7d4e8',
      '#f7f7f7',
      '#d9f0d3',
      '#a6dba0',
      '#5aae61',
      '#1b7837',
      '#00441b',
    ] as ColorPalette,
    min: '#762a83' as ColorType,
    middle: '#f7f7f7' as ColorType,
    max: '#1b7837' as ColorType,
  },
  spectral: {
    metadata: {
      id: 'spectral',
      name: 'Spectral Colors',
      category: 'diverging',
      colorBlindSafe: false,
    },
    colors: [
      '#9e0142',
      '#d53e4f',
      '#f46d43',
      '#fdae61',
      '#fee08b',
      '#ffffbf',
      '#e6f598',
      '#abdda4',
      '#66c2a5',
      '#3288bd',
      '#5e4fa2',
    ] as ColorPalette,
    min: '#d53e4f' as ColorType,
    middle: '#ffffbf' as ColorType,
    max: '#3288bd' as ColorType,
  },
  brbg: {
    metadata: {
      id: 'brbg',
      name: 'Brown-Blue-Green',
      category: 'diverging',
      colorBlindSafe: true,
    },
    colors: [
      '#543005',
      '#8c510a',
      '#bf812d',
      '#dfc27d',
      '#f6e8c3',
      '#f5f5f5',
      '#c7eae5',
      '#80cdc1',
      '#35978f',
      '#01665e',
      '#003c30',
    ] as ColorPalette,
    min: '#8c510a' as ColorType,
    middle: '#f5f5f5' as ColorType,
    max: '#01665e' as ColorType,
  },
  rdylgn: {
    metadata: {
      id: 'rdylgn',
      name: 'Red-Yellow-Green',
      category: 'diverging',
      colorBlindSafe: false,
    },
    colors: [
      '#a50026',
      '#d73027',
      '#f46d43',
      '#fdae61',
      '#fee08b',
      '#ffffbf',
      '#d9ef8b',
      '#a6d96a',
      '#66bd63',
      '#1a9850',
      '#006837',
    ] as ColorPalette,
    min: '#d73027' as ColorType,
    middle: '#ffffbf' as ColorType,
    max: '#1a9850' as ColorType,
  },
  piyg: {
    metadata: {
      id: 'piyg',
      name: 'Magenta-Yellow-Green',
      category: 'diverging',
      colorBlindSafe: true,
    },
    colors: [
      '#8e0152',
      '#c51b7d',
      '#de77ae',
      '#f1b6da',
      '#fde0ef',
      '#f7f7f7',
      '#e6f5d0',
      '#b8e186',
      '#7fbc41',
      '#4d9221',
      '#276419',
    ] as ColorPalette,
    min: '#c51b7d' as ColorType,
    middle: '#f7f7f7' as ColorType,
    max: '#4d9221' as ColorType,
  },
  rdgy: {
    metadata: {
      id: 'rdgy',
      name: 'Red-Grey',
      category: 'diverging',
      colorBlindSafe: false,
    },
    colors: [
      '#67001f',
      '#b2182b',
      '#d6604d',
      '#f4a582',
      '#fddbc7',
      '#ffffff',
      '#e0e0e0',
      '#bababa',
      '#878787',
      '#4d4d4d',
      '#1a1a1a',
    ] as ColorPalette,
    min: '#b2182b' as ColorType,
    middle: '#ffffff' as ColorType,
    max: '#4d4d4d' as ColorType,
  },
  rdylbu: {
    metadata: {
      id: 'rdylbu',
      name: 'Red-Yellow-Blue',
      category: 'diverging',
      colorBlindSafe: true,
    },
    colors: [
      '#a50026',
      '#d73027',
      '#f46d43',
      '#fdae61',
      '#fee08b',
      '#ffffbf',
      '#e0f3f8',
      '#abd9e9',
      '#74add1',
      '#4575b4',
      '#313695',
    ] as ColorPalette,
    min: '#d73027' as ColorType,
    middle: '#ffffbf' as ColorType,
    max: '#4575b4' as ColorType,
  },
}

// Helper to get palette min/middle/max colors for continuous mapping
export function getColorBrewerPaletteColors(
  paletteId: string,
): { min: ColorType; middle: ColorType; max: ColorType; name: string } | null {
  const id = paletteId.toLowerCase()
  const palette = PALETTES[id]
  if (!palette || !palette.min || !palette.middle || !palette.max) return null
  return {
    min: palette.min,
    middle: palette.middle,
    max: palette.max,
    name: palette.metadata.name,
  }
}

// Legacy export for backward compatibility - now just references PALETTES
export const COLOR_BREWER_DIVERGING_PALETTES = PALETTES
