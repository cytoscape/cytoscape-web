import { Alert, Box } from '@mui/material'
import type { ReactElement } from 'react'

import { resolveManualAsset } from '../manualSlug'
import { findScreenshotRecipe, screenshotPath } from '../screenshots/recipes'

/**
 * A screenshot captured from the app by its recipe
 * (src/features/Manual/screenshots/recipes.ts). Recapture with
 * `node scripts/capture-manual-screenshots.mjs <id>`.
 */
export const Screenshot = ({
  id,
  caption = false,
}: {
  id: string
  /** Show the recipe's alt text under the image. */
  caption?: boolean
}): ReactElement => {
  const recipe = findScreenshotRecipe(id)
  if (recipe === undefined) {
    return <Alert severity="warning">Unknown screenshot: {id}</Alert>
  }
  return (
    <Box
      component="figure"
      data-testid={`manual-screenshot-${id}`}
      sx={{ m: 0, my: 2.5, maxWidth: '100%' }}
    >
      <Box
        component="img"
        src={resolveManualAsset(screenshotPath(id), import.meta.env.BASE_URL)}
        alt={recipe.alt}
        loading="lazy"
        sx={{
          display: 'block',
          maxWidth: '100%',
          height: 'auto',
          border: 1,
          borderColor: 'divider',
          borderRadius: 1,
        }}
      />
      {caption ? (
        <Box
          component="figcaption"
          sx={{ mt: 0.75, fontSize: '0.875rem', color: 'text.secondary' }}
        >
          {recipe.alt}
        </Box>
      ) : null}
    </Box>
  )
}
