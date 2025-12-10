import {
  SequentialCustomColors,
  DivergingCustomColors,
  VirdisCustomColors,
} from '../../../../../models/VisualStyleModel/impl/customColor'

// Expanded palettes (ColorBrewer-like)
// Note: Adapted to use existing color exports. The PR branch had SequentialCustomGraphicColors,
// DivergingCustomGraphicColors, and ViridisCustomGraphicColors, but we're using the existing
// SequentialCustomColors, DivergingCustomColors, and VirdisCustomColors for now.
export const PALETTES: Record<string, string[]> = {
  Sequential1: SequentialCustomColors[0],
  Sequential2: SequentialCustomColors[1],
  Sequential3: SequentialCustomColors[2],
  Sequential4: SequentialCustomColors[3],
  Sequential5: SequentialCustomColors[4],
  Sequential6: SequentialCustomColors[5],
  Sequential7: SequentialCustomColors[6],
  Sequential8: SequentialCustomColors[7],
  Sequential9: SequentialCustomColors[8],
  Sequential10: SequentialCustomColors[9],
  Sequential11: SequentialCustomColors[10],
  Sequential12: SequentialCustomColors[11],
  Sequential13: SequentialCustomColors[12],
  Sequential14: SequentialCustomColors[13],
  Sequential15: SequentialCustomColors[14],
  Sequential16: SequentialCustomColors[15],
  Sequential17: SequentialCustomColors[16],
  Sequential18: SequentialCustomColors[17],

  Diverging1: DivergingCustomColors[0],
  Diverging2: DivergingCustomColors[1],
  Diverging3: DivergingCustomColors[2],
  Diverging4: DivergingCustomColors[3],
  Diverging5: DivergingCustomColors[4],
  Diverging6: DivergingCustomColors[5],
  Diverging7: DivergingCustomColors[6],
  Diverging8: DivergingCustomColors[7],
  Diverging9: DivergingCustomColors[8],
  Diverging10: DivergingCustomColors[9],
  Diverging11: DivergingCustomColors[10],

  Viridis1: VirdisCustomColors[0],
  Viridis2: VirdisCustomColors[1],
  Viridis3: VirdisCustomColors[2],
  Viridis4: VirdisCustomColors[3],
}
