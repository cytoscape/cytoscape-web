import { Link, Typography } from '@mui/material'
import { ReactElement } from 'react'

// Where "Learn more" points. Kept as a constant so it is easy to repoint at a
// dedicated HCX documentation page when one exists.
export const HCX_DOCS_URL = 'https://cytoscape.org/cx/cx2/hcx-specification/'

/**
 * Tooltip shown when the "Run LLM Query" menu item is disabled because the
 * current network is not a hierarchy (HCX). It spells out what HCX means in
 * plain language instead of just naming the acronym, and links to docs.
 */
export const HcxDisabledTooltip = (): ReactElement => (
  <Typography variant="body2" component="span">
    LLM queries run on <strong>hierarchical networks (HCX)</strong> — networks
    whose nodes represent systems and subsystems of genes, like the MuSIC sample
    network. Load a hierarchy and select a system to enable this feature.{' '}
    <Link
      href={HCX_DOCS_URL}
      target="_blank"
      rel="noopener noreferrer"
      color="inherit"
      sx={{ textDecoration: 'underline' }}
    >
      Learn more
    </Link>
  </Typography>
)
