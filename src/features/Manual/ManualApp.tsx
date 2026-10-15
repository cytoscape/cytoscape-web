import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
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
  ListSubheader,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { type ReactElement, useCallback, useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useParams } from 'react-router-dom'

import { MANUAL_ROUTE_SEGMENT } from '@/data/db/dbScope'
import { SnackbarMessageList } from '@/features/Messages'
import { ManualNotFound, ManualPage, type TocEntry } from './ManualPage'
import {
  DEFAULT_MANUAL_SLUG,
  findManualPage,
  MANUAL_GROUPS,
  MANUAL_PAGES,
  type ManualPage as ManualPageDef,
  resolveManualPath,
} from './pages'
import { useActiveHeading } from './useActiveHeading'

const NAV_WIDTH = 260
const APP_BAR_HEIGHT = 48

const pagePath = (slug: string): string => `/${MANUAL_ROUTE_SEGMENT}/${slug}`

interface PageListProps {
  currentSlug: string
  /** The current page's sections, nested under it. */
  sections?: TocEntry[]
  activeSection?: string
  onNavigate?: () => void
}

interface SectionGroup {
  section: TocEntry
  subsections: TocEntry[]
}

/** h2 sections, each with the h3 sections under it. */
const groupSections = (entries: TocEntry[]): SectionGroup[] => {
  const groups: SectionGroup[] = []
  for (const entry of entries) {
    if (entry.level === 2) groups.push({ section: entry, subsections: [] })
    else groups[groups.length - 1]?.subsections.push(entry)
  }
  return groups
}

const SectionLink = ({
  href,
  entry,
  active,
  depth,
  onNavigate,
}: {
  href: string
  entry: TocEntry
  active: boolean
  depth: 0 | 1
  onNavigate?: () => void
}): ReactElement => (
  <Box
    component={Link}
    to={href}
    onClick={onNavigate}
    aria-current={active ? 'location' : undefined}
    data-testid={`manual-nav-section-${entry.id}`}
    sx={{
      display: 'block',
      py: depth === 0 ? 0.5 : 0.35,
      pl: depth === 0 ? 1.5 : 3,
      pr: 1,
      ml: '-1px',
      fontSize: depth === 0 ? '0.825rem' : '0.79rem',
      lineHeight: 1.4,
      textDecoration: 'none',
      borderLeft: 2,
      borderColor: active ? 'primary.main' : 'transparent',
      color: active ? 'primary.main' : 'text.secondary',
      fontWeight: active ? 600 : 400,
      '&:hover': { color: 'text.primary' },
    }}
  >
    {entry.text}
  </Box>
)

const PageList = ({
  currentSlug,
  sections,
  activeSection,
  onNavigate,
}: PageListProps): ReactElement => (
  <List dense component="nav" data-testid="manual-nav" aria-label="Manual">
    {MANUAL_GROUPS.map((group) => (
      <Box key={group} component="li" sx={{ listStyle: 'none' }}>
        <ListSubheader
          component="div"
          disableSticky
          sx={{
            bgcolor: 'transparent',
            lineHeight: 1.5,
            pt: 1.5,
            pb: 0.5,
            fontSize: '0.7rem',
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          {group}
        </ListSubheader>
        <Box component="ul" sx={{ m: 0, p: 0 }}>
          {MANUAL_PAGES.filter((page) => page.group === group).map((page) => {
            const current = page.slug === currentSlug
            return (
              <Box key={page.slug} component="li" sx={{ listStyle: 'none' }}>
                <ListItemButton
                  component={Link}
                  to={pagePath(page.slug)}
                  selected={current}
                  aria-current={current ? 'page' : undefined}
                  onClick={onNavigate}
                  data-testid={`manual-nav-${page.slug}`}
                  sx={{ borderRadius: 1, mx: 1 }}
                >
                  <ListItemText
                    primary={page.title}
                    primaryTypographyProps={{
                      fontWeight: current ? 600 : 400,
                      fontSize: '0.9rem',
                    }}
                  />
                </ListItemButton>
                {current && sections !== undefined && sections.length > 0 ? (
                  <Box
                    component="ul"
                    data-testid="manual-nav-sections"
                    sx={{
                      m: 0,
                      mb: 1,
                      ml: 3,
                      pl: 0,
                      borderLeft: 1,
                      borderColor: 'divider',
                    }}
                  >
                    {groupSections(sections).map(({ section, subsections }) => {
                      // The section in view, or the section holding the subsection
                      // in view, opens its subsections: two levels show at once
                      // only where the reader is.
                      const open =
                        section.id === activeSection ||
                        subsections.some((sub) => sub.id === activeSection)
                      return (
                        <Box
                          key={section.id}
                          component="li"
                          sx={{ listStyle: 'none' }}
                        >
                          <SectionLink
                            href={`${pagePath(page.slug)}#${section.id}`}
                            entry={section}
                            active={section.id === activeSection}
                            depth={0}
                            onNavigate={onNavigate}
                          />
                          {open && subsections.length > 0 ? (
                            <Box component="ul" sx={{ m: 0, p: 0, mb: 0.5 }}>
                              {subsections.map((sub) => (
                                <Box
                                  key={sub.id}
                                  component="li"
                                  sx={{ listStyle: 'none' }}
                                >
                                  <SectionLink
                                    href={`${pagePath(page.slug)}#${sub.id}`}
                                    entry={sub}
                                    active={sub.id === activeSection}
                                    depth={1}
                                    onNavigate={onNavigate}
                                  />
                                </Box>
                              ))}
                            </Box>
                          ) : null}
                        </Box>
                      )
                    })}
                  </Box>
                ) : null}
              </Box>
            )
          })}
        </Box>
      </Box>
    ))}
  </List>
)

/** Previous and next page, at the foot of the page. */
const PageFooter = ({ page }: { page: ManualPageDef }): ReactElement => {
  const index = MANUAL_PAGES.findIndex((p) => p.slug === page.slug)
  const previous = index > 0 ? MANUAL_PAGES[index - 1] : undefined
  const next = MANUAL_PAGES[index + 1]
  return (
    <Box
      component="nav"
      aria-label="Previous and next page"
      data-testid="manual-page-footer"
      sx={{
        display: 'flex',
        gap: 2,
        mt: 8,
        pt: 3,
        borderTop: 1,
        borderColor: 'divider',
        maxWidth: '68ch',
      }}
    >
      {previous !== undefined ? (
        <Button
          component={Link}
          to={pagePath(previous.slug)}
          startIcon={<ChevronLeftIcon />}
          sx={{ textTransform: 'none', justifyContent: 'flex-start' }}
        >
          {previous.title}
        </Button>
      ) : null}
      <Box sx={{ flex: 1 }} />
      {next !== undefined ? (
        <Button
          component={Link}
          to={pagePath(next.slug)}
          endIcon={<ChevronRightIcon />}
          sx={{ textTransform: 'none', justifyContent: 'flex-end' }}
        >
          {next.title}
        </Button>
      ) : null}
    </Box>
  )
}

/**
 * The in-app user manual, at /manual/*. A separate top-level route: it never
 * mounts AppShell, and its tab uses the sandbox database (dbScope.ts).
 */
/** Below this width a page with a pinned demo folds the page list into a menu. */
const NAV_BESIDE_DEMO_MIN_WIDTH = 1600

export default function ManualApp(): ReactElement {
  const params = useParams()
  const { hash, search } = useLocation()
  const theme = useTheme()
  const wide = useMediaQuery(theme.breakpoints.up('md'))
  const large = useMediaQuery(theme.breakpoints.up('lg'))
  const roomForNavBesideDemo = useMediaQuery(
    `(min-width: ${NAV_BESIDE_DEMO_MIN_WIDTH}px)`,
  )
  const [navOpen, setNavOpen] = useState(false)
  const [toc, setToc] = useState<TocEntry[]>([])
  const [split, setSplit] = useState(false)
  const handleToc = useCallback((entries: TocEntry[]) => setToc(entries), [])

  const activeSection = useActiveHeading(
    toc.map((t) => t.id),
    APP_BAR_HEIGHT + 24,
  )

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
      return <Navigate to={`${pagePath(slug)}${search}${hash}`} replace />
    }
  }
  // An anchor that moved to another page when this one was split.
  const movedTo =
    hash.length > 1
      ? page?.movedAnchors?.[decodeURIComponent(hash.slice(1))]
      : undefined
  if (movedTo !== undefined) {
    return <Navigate to={`${pagePath(movedTo)}${hash}`} replace />
  }

  // With a pinned demo the page list folds into a menu below 1600px: the
  // demo needs the width more than the reader needs the list in view.
  const navBeside = wide && !(split && !roomForNavBesideDemo)

  const nav = (
    <PageList
      currentSlug={page?.slug ?? ''}
      sections={toc}
      activeSection={activeSection}
      onNavigate={() => setNavOpen(false)}
    />
  )

  return (
    <Box
      data-testid="manual-app"
      data-nav={navBeside ? 'beside' : 'menu'}
      sx={{ minHeight: '100vh', bgcolor: 'background.default' }}
    >
      <AppBar position="sticky" color="default" elevation={0}>
        <Toolbar
          variant="dense"
          sx={{ gap: 1, borderBottom: 1, borderColor: 'divider' }}
        >
          {!navBeside ? (
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
            to={pagePath(DEFAULT_MANUAL_SLUG)}
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
        {navBeside ? (
          <Box
            sx={{
              width: NAV_WIDTH,
              flexShrink: 0,
              position: 'sticky',
              top: APP_BAR_HEIGHT,
              maxHeight: `calc(100vh - ${APP_BAR_HEIGHT}px)`,
              overflowY: 'auto',
              borderRight: 1,
              borderColor: 'divider',
              pb: 2,
            }}
          >
            {nav}
          </Box>
        ) : (
          <Drawer open={navOpen} onClose={() => setNavOpen(false)}>
            <Box sx={{ width: NAV_WIDTH + 20, pb: 2 }}>{nav}</Box>
          </Drawer>
        )}

        <Box
          component="main"
          sx={{
            flex: 1,
            minWidth: 0,
            px: { xs: 2, sm: 4, lg: 6 },
            py: { xs: 3, md: 5 },
            // A page with a pinned demo uses the full width for text plus
            // demo; other pages keep the text column centred.
            maxWidth: split ? 'none' : 900,
            mx: 'auto',
          }}
        >
          {page === undefined ? (
            <ManualNotFound />
          ) : (
            <>
              <ManualPage
                key={page.slug}
                page={page}
                allowSplit={large}
                onToc={handleToc}
                onSplitChange={setSplit}
              />
              <PageFooter page={page} />
            </>
          )}
        </Box>
      </Box>
      {/* Editor parts in demos report through MessageStore (filter import,
          merge errors); the editor mounts this list in WorkspaceEditor. */}
      <SnackbarMessageList />
    </Box>
  )
}
