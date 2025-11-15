import { Box, Typography } from '@mui/material'

export const SearchExamplesTooltip = (): JSX.Element => {
  return (
    <Box sx={{ p: 1 }}>
      <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
        Search Examples:
      </Typography>
      <Typography variant="body2" sx={{ mb: 0.5 }}>
        • <strong>protein</strong> - Find items containing "protein"
      </Typography>
      <Typography variant="body2" sx={{ mb: 0.5 }}>
        • <strong>"gene name"</strong> - Exact phrase match
      </Typography>
      <Typography variant="body2" sx={{ mb: 0.5 }}>
        • <strong>protein, YL</strong> - Find items with "protein" OR "YL"
      </Typography>
      <Typography variant="body2" sx={{ mb: 0.5 }}>
        • <strong>"cell cycle", protein</strong> - Find items with exact phrase "cell cycle" OR "protein"
      </Typography>
      <Typography variant="body2">
        • Use quotes for multi-word exact matches
      </Typography>
    </Box>
  )
}


