import MenuIcon from '@mui/icons-material/Menu'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import {
  AppBar,
  Box,
  Button,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { type ReactElement, useCallback, useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useParams } from 'react-router-dom'

import { ManualNotFound, ManualPage, type TocEntry } from './ManualPage'
import {
  DEFAULT_MANUAL_SLUG,
  findManualPage,
  MANUAL_PAGES,
  resolveManualPath,
} from './pages'

const NAV_WIDTH = 260
const TOC_WIDTH = 220

const PageList = ({
  currentSlug,
  onNavigate,
}: {
  currentSlug: string
  onNavigate?: () => void
}): ReactElement => (
  <List dense component="nav" data-testid="manual-nav">
    {MANUAL_PAGES.map((page) => (
      <ListItemButton
        key={page.slug}
        component={Link}
        to={`../${page.slug}`}
        relative="path"
        selected={page.slug === currentSlug}
        onClick={onNavigate}
        data-testid={`manual-nav-${page.slug}`}
      >
        <ListItemText primary={page.title} />
      </ListItemButton>
    ))}
  </List>
)

const OnThisPage = ({ entries }: { entries: TocEntry[] }): ReactElement => (
  <Box
    component="nav"
    data-testid="manual-toc"
    sx={{
      position: 'sticky',
      top: 80,
      fontSize: '0.85rem',
      '& a': {
        display: 'block',
        py: 0.4,
        color: 'text.secondary',
        textDecoration: 'none',
        '&:hover': { color: 'text.primary' },
      },
    }}
  >
    {entries.length > 0 ? (
      <Typography variant="overline" color="text.secondary">
        On this page
      </Typography>
    ) : null}
    {entries.map((entry) => (
      <Box
        key={entry.id}
        component="a"
        href={`#${entry.id}`}
        sx={{ pl: entry.level === 3 ? 1.5 : 0 }}
      >
        {entry.text}
      </Box>
    ))}
  </Box>
)

/**
 * The in-app user manual, at /manual/*. A separate top-level route: it never
 * mounts AppShell, and its tab uses the sandbox database (dbScope.ts).
 */
export default function ManualApp(): ReactElement {
  const params = useParams()
  const { hash } = useLocation()
  const theme = useTheme()
  const wide = useMediaQuery(theme.breakpoints.up('md'))
  const showToc = useMediaQuery(theme.breakpoints.up('lg'))
  const [navOpen, setNavOpen] = useState(false)
  const [toc, setToc] = useState<TocEntry[]>([])
  const handleToc = useCallback((entries: TocEntry[]) => setToc(entries), [])

  const path = params['*'] ?? ''
  const page = findManualPage(path)

  useEffect(() => {
    document.title =
      page === undefined
        ? 'Cytoscape Web Manual'
        : `${page.title} — Cytoscape Web Manual`
  }, [page])

  // Bare /manual, and old Read the Docs paths, land on a current page.
  if (page === undefined) {
    const slug = resolveManualPath(path)
    if (slug !== undefined) {
      return <Navigate to={`/manual/${slug}${hash}`} replace />
    }
  }

  const nav = (
    <PageList
      currentSlug={page?.slug ?? ''}
      onNavigate={() => setNavOpen(false)}
    />
  )

  return (
    <Box
      data-testid="manual-app"
      sx={{ minHeight: '100vh', bgcolor: 'background.default' }}
    >
      <AppBar position="sticky" color="default" elevation={0}>
        <Toolbar
          variant="dense"
          sx={{ gap: 1, borderBottom: 1, borderColor: 'divider' }}
        >
          {!wide ? (
            <IconButton
              edge="start"
              aria-label="Open the page list"
              onClick={() => setNavOpen(true)}
              data-testid="manual-nav-toggle"
            >
              <MenuIcon />
            </IconButton>
          ) : null}
          <Typography
            variant="subtitle1"
            component={Link}
            to={`/manual/${DEFAULT_MANUAL_SLUG}`}
            sx={{
              fontWeight: 600,
              color: 'inherit',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            Cytoscape Web Manual
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: { xs: 'none', sm: 'inline' } }}
          >
            v{REACT_APP_VERSION}
          </Typography>
          <Box sx={{ flex: 1 }} />
          {/* A full page load: the editor must open with its own database. */}
          <Button
            size="small"
            href={import.meta.env.BASE_URL}
            endIcon={<OpenInNewIcon fontSize="small" />}
            sx={{ whiteSpace: 'nowrap', flexShrink: 0 }}
            data-testid="manual-open-app"
          >
            {wide ? 'Open Cytoscape Web' : 'Open app'}
          </Button>
        </Toolbar>
      </AppBar>

      <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
        {wide ? (
          <Box
            sx={{
              width: NAV_WIDTH,
              flexShrink: 0,
              position: 'sticky',
              top: 48,
              maxHeight: 'calc(100vh - 48px)',
              overflowY: 'auto',
              borderRight: 1,
              borderColor: 'divider',
              py: 1,
            }}
          >
            {nav}
          </Box>
        ) : (
          <Drawer open={navOpen} onClose={() => setNavOpen(false)}>
            <Box sx={{ width: NAV_WIDTH, py: 1 }}>{nav}</Box>
          </Drawer>
        )}

        <Box
          component="main"
          sx={{
            flex: 1,
            minWidth: 0,
            px: { xs: 2, sm: 4 },
            py: 4,
            maxWidth: 900,
            mx: 'auto',
          }}
        >
          {page === undefined ? (
            <ManualNotFound />
          ) : (
            <ManualPage key={page.slug} page={page} onToc={handleToc} />
          )}
        </Box>

        {showToc && page !== undefined ? (
          <Box sx={{ width: TOC_WIDTH, flexShrink: 0, py: 4, pr: 2 }}>
            <OnThisPage entries={toc} />
          </Box>
        ) : null}
      </Box>
    </Box>
  )
}
