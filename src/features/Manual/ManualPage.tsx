import { Box, CircularProgress, Typography } from '@mui/material'
import type { MDXContent } from 'mdx/types'
import {
  lazy,
  type LazyExoticComponent,
  type ReactElement,
  Suspense,
  useCallback,
  useEffect,
  useRef,
} from 'react'
import { useLocation } from 'react-router-dom'

import { mdxComponents } from './components/mdxComponents'
import type { ManualPage as ManualPageDef } from './pages'

/** One lazy component per page, so revisiting a page reuses its chunk. */
const contentCache = new Map<string, LazyExoticComponent<MDXContent>>()

const contentFor = (page: ManualPageDef): LazyExoticComponent<MDXContent> => {
  let content = contentCache.get(page.slug)
  if (content === undefined) {
    content = lazy(page.load)
    contentCache.set(page.slug, content)
  }
  return content
}

export interface TocEntry {
  id: string
  text: string
  level: 2 | 3
}

/** Committed only once the page's content has rendered. */
const Rendered = ({ onRendered }: { onRendered: () => void }): null => {
  useEffect(onRendered, [onRendered])
  return null
}

interface ManualPageProps {
  page: ManualPageDef
  onToc: (entries: TocEntry[]) => void
}

/**
 * Renders one manual page. Typography for content elements lives here, in one
 * `sx` block; page files carry no styling.
 */
export const ManualPage = ({ page, onToc }: ManualPageProps): ReactElement => {
  const Content = contentFor(page)
  const article = useRef<HTMLElement>(null)
  const { hash } = useLocation()

  const handleRendered = useCallback((): void => {
    const root = article.current
    if (root === null) return
    const entries: TocEntry[] = Array.from(
      root.querySelectorAll<HTMLHeadingElement>('h2[id], h3[id]'),
    ).map((h) => ({
      id: h.id,
      text: h.textContent ?? '',
      level: h.tagName === 'H2' ? 2 : 3,
    }))
    onToc(entries)
    if (hash.length > 1) {
      document
        .getElementById(decodeURIComponent(hash.slice(1)))
        ?.scrollIntoView()
    } else {
      window.scrollTo(0, 0)
    }
  }, [hash, onToc])

  return (
    <Box
      component="article"
      ref={article}
      data-testid="manual-page"
      data-slug={page.slug}
      sx={{
        minWidth: 0,
        lineHeight: 1.65,
        fontSize: '1rem',
        '& h1': { typography: 'h4', mt: 0, mb: 3 },
        '& h2': {
          typography: 'h5',
          mt: 5,
          mb: 1.5,
          pb: 0.5,
          borderBottom: 1,
          borderColor: 'divider',
        },
        '& h3': { typography: 'h6', mt: 3.5, mb: 1 },
        '& h4': { typography: 'subtitle1', fontWeight: 600, mt: 3, mb: 1 },
        '& h1, & h2, & h3, & h4': { scrollMarginTop: '72px' },
        '& p, & ul, & ol': { my: 1.5 },
        '& li': { my: 0.5 },
        '& a': { color: 'primary.main' },
        '& img': {
          maxWidth: '100%',
          height: 'auto',
          verticalAlign: 'middle',
        },
        '& p > img:only-child': {
          display: 'block',
          my: 2,
          border: 1,
          borderColor: 'divider',
          borderRadius: 1,
        },
        '& code': {
          fontFamily: 'monospace',
          fontSize: '0.875em',
          px: 0.5,
          borderRadius: 0.5,
          bgcolor: 'action.hover',
        },
        '& pre': {
          p: 2,
          overflowX: 'auto',
          borderRadius: 1,
          bgcolor: 'action.hover',
          '& code': { p: 0, bgcolor: 'transparent' },
        },
        '& table': {
          borderCollapse: 'collapse',
          my: 2,
          display: 'block',
          overflowX: 'auto',
        },
        '& th, & td': {
          border: 1,
          borderColor: 'divider',
          px: 1.5,
          py: 0.75,
          textAlign: 'left',
          verticalAlign: 'top',
        },
        '& th': { bgcolor: 'action.hover', fontWeight: 600 },
        '& blockquote': {
          m: 0,
          my: 2,
          pl: 2,
          borderLeft: 4,
          borderColor: 'divider',
          color: 'text.secondary',
        },
      }}
    >
      <Suspense
        fallback={
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress size={28} />
          </Box>
        }
      >
        <Content components={mdxComponents} />
        <Rendered onRendered={handleRendered} />
      </Suspense>
    </Box>
  )
}

export const ManualNotFound = (): ReactElement => (
  <Box data-testid="manual-not-found" sx={{ py: 4 }}>
    <Typography variant="h5" gutterBottom>
      Page not found
    </Typography>
    <Typography>
      This manual has no page at this address. Choose a page from the list.
    </Typography>
  </Box>
)
