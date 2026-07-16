import { Box, Typography } from '@mui/material'

export const SearchExamplesTooltip = (): JSX.Element => {
  return (
    <Box sx={{ p: 1 }}>
      <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
        Search Examples:
      </Typography>
      <Typography variant="body2" sx={{ mb: 0.5 }}>
        • <strong>protein</strong> - Search for &quot;protein&quot;
      </Typography>
      <Typography variant="body2" sx={{ mb: 0.5 }}>
        • <strong>YL protein</strong> - Spaces create separate tokens:
        &quot;YL&quot; and &quot;protein&quot;
      </Typography>
      <Typography variant="body2" sx={{ mb: 0.5 }}>
        • <strong>protein, YL</strong> - Commas create separate tokens:
        &quot;protein&quot; and &quot;YL&quot;
      </Typography>
      <Typography variant="body2" sx={{ mb: 0.5 }}>
        • <strong>&quot;gene name&quot;</strong> - Quotes prevent tokenization
        (treats phrase as single token)
      </Typography>
      <Typography variant="body2" sx={{ mb: 0.5 }}>
        • <strong>&quot;cell cycle&quot;, protein</strong> - Multiple tokens
        with a multi-word phrase
      </Typography>
    </Box>
  )
}
