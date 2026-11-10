import { Box, CircularProgress, Typography } from '@mui/material'
import type { SxProps, Theme } from '@mui/material/styles'
import type { MDXContent } from 'mdx/types'
import {
  lazy,
  type LazyExoticComponent,
  type ReactElement,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useLocation } from 'react-router-dom'

import { type DemoSlot, DemoSlotContext } from './components/DemoSlot'
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

/**
 * Readable-measure typography. The values follow the research on screen
 * reading:
 *
 * - a measure of about 68 characters (50–75 is the readable range; WCAG
 *   1.4.8 caps it at 80);
 * - 17px body text with 1.7 line height (WCAG 1.4.12 asks that 1.5 work);
 * - paragraph spacing larger than line spacing, so paragraphs read as units;
 * - more space above a heading than below, so it binds to its section;
 * - bold at weight 600, because the manual bolds every UI label and
 *   heavier bold at that density stops standing out.
 */
const READABLE_TYPOGRAPHY: SxProps<Theme> = {
  fontSize: '1.0625rem',
  lineHeight: 1.7,
  color: 'text.primary',
  // Tables, demos and step widgets take the page width; text keeps the
  // measure.
  '& > *:not(table):not([data-testid="manual-live-demo"]):not([data-testid="manual-steps"])':
    {
      maxWidth: '68ch',
    },
  '& h1': {
    fontSize: '2.125rem',
    lineHeight: 1.2,
    fontWeight: 700,
    letterSpacing: '-0.01em',
    mt: 0,
    mb: 2.5,
  },
  '& h2': {
    fontSize: '1.5rem',
    lineHeight: 1.3,
    fontWeight: 650,
    letterSpacing: '-0.005em',
    mt: 6,
    mb: 1.5,
  },
  '& h3': {
    fontSize: '1.1875rem',
    lineHeight: 1.35,
    fontWeight: 650,
    mt: 4,
    mb: 1,
  },
  '& h4': { fontSize: '1.0625rem', fontWeight: 650, mt: 3, mb: 0.75 },
  '& p': { mt: 0, mb: 2 },
  '& ul, & ol': { mt: 0, mb: 2, pl: 3.5 },
  '& li': { mb: 0.75 },
  '& li > p': { mb: 0.75 },
  '& strong': { fontWeight: 600 },
  '& h1 + p': { fontSize: '1.1875rem', color: 'text.secondary' },
  '& tbody tr:nth-of-type(even)': { bgcolor: 'action.hover' },
  '& table': { fontSize: '0.9375rem' },
}

/** Code, tables, images, quotes. */
const COMMON_CONTENT: SxProps<Theme> = {
  minWidth: 0,
  '& h1, & h2, & h3, & h4': { scrollMarginTop: '72px' },
  '& a': { color: 'primary.main' },
  '& img': { maxWidth: '100%', height: 'auto', verticalAlign: 'middle' },
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
}

/** Below the app bar (48px) with a small gap. */
const PINNED_TOP = 56

interface ManualPageProps {
  page: ManualPageDef
  /** False below the `lg` breakpoint: the demo then stays in the text. */
  allowSplit: boolean
  onToc: (entries: TocEntry[]) => void
  /** Reports whether the page shows a pinned demo column. */
  onSplitChange?: (split: boolean) => void
}

/**
 * Renders one manual page. Typography for content elements lives here; page
 * files carry no styling. In the `split` layout the page's demo renders in a
 * pinned right-hand column through DemoSlotContext.
 */
export const ManualPage = ({
  page,
  allowSplit,
  onToc,
  onSplitChange,
}: ManualPageProps): ReactElement => {
  const Content = contentFor(page)
  const article = useRef<HTMLElement>(null)
  const { hash } = useLocation()

  const split = allowSplit
  const [expanded, setExpanded] = useState(false)
  const [demoCount, setDemoCount] = useState(0)
  const [column, setColumn] = useState<HTMLElement | null>(null)
  const register = useCallback(() => {
    setDemoCount((n) => n + 1)
    return () => setDemoCount((n) => n - 1)
  }, [])
  const slot: DemoSlot = useMemo(
    () => ({
      target: split ? column : null,
      register,
      expanded,
      setExpanded,
    }),
    [split, column, register, expanded],
  )
  const showColumn = split && demoCount > 0
  useEffect(() => {
    onSplitChange?.(showColumn)
  }, [showColumn, onSplitChange])

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
    <DemoSlotContext.Provider value={slot}>
      <Box
        sx={
          showColumn
            ? {
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 68ch) minmax(0, 1fr)',
                columnGap: 5,
                alignItems: 'start',
              }
            : undefined
        }
      >
        <Box
          component="article"
          ref={article}
          data-testid="manual-page"
          data-slug={page.slug}
          data-split={showColumn ? 'true' : 'false'}
          sx={[COMMON_CONTENT, READABLE_TYPOGRAPHY]}
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
        {split ? (
          <Box
            ref={setColumn}
            data-testid="manual-demo-column"
            data-expanded={expanded ? 'true' : 'false'}
            sx={
              expanded
                ? {
                    // Enlarged over the text. The same element, restyled, so
                    // the demo keeps its state.
                    display: showColumn ? 'block' : 'none',
                    position: 'fixed',
                    top: PINNED_TOP,
                    right: 16,
                    bottom: 16,
                    width: 'min(1200px, calc(100vw - 32px))',
                    zIndex: 1200,
                    boxShadow: 8,
                    borderRadius: 1,
                  }
                : {
                    display: showColumn ? 'block' : 'none',
                    position: 'sticky',
                    top: PINNED_TOP,
                    height: `calc(100vh - ${PINNED_TOP + 16}px)`,
                    minWidth: 0,
                  }
            }
          />
        ) : null}
      </Box>
    </DemoSlotContext.Provider>
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
