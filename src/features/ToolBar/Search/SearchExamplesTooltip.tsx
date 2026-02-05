import { Box, Typography } from '@mui/material'

export const SearchExamplesTooltip = (): JSX.Element => {
  return (
    <Box sx={{ p: 1 }}>
      <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
        Search Examples:
      </Typography>
      <Typography variant="body2" sx={{ mb: 0.5 }}>
        • <strong>protein</strong> - Search for "protein"
      </Typography>
      <Typography variant="body2" sx={{ mb: 0.5 }}>
        • <strong>YL protein</strong> - Spaces create separate tokens: "YL" and
        "protein"
      </Typography>
      <Typography variant="body2" sx={{ mb: 0.5 }}>
        • <strong>protein, YL</strong> - Commas create separate tokens:
        "protein" and "YL"
      </Typography>
      <Typography variant="body2" sx={{ mb: 0.5 }}>
        • <strong>"gene name"</strong> - Quotes prevent tokenization (treats
        phrase as single token)
      </Typography>
      <Typography variant="body2" sx={{ mb: 0.5 }}>
        • <strong>"cell cycle", protein</strong> - Multiple tokens with a
        multi-word phrase
      </Typography>
    </Box>
  )
}
