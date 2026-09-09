'use client'
import { useEffect, useState, useRef, type CSSProperties } from 'react'
import hotkeys from 'hotkeys-js'
import {
  ChevronsUpDown,
  Sun,
  Moon,
  PanelRight,
  PanelBottom,
  ArrowLeft,
  ChevronRight,
  X,
  Check,
  Search,
  Undo2,
  Redo2,
} from 'lucide-react'
import {
  Sidebar,
  SidebarProvider,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar'
import {
  Menubar,
  MenubarMenu,
  MenubarTrigger,
  MenubarContent,
  MenubarItem,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubTrigger,
  MenubarSubContent,
} from '@/components/ui/menubar'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverTitle,
} from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import {
  NetworkPicker,
  StyleInspector,
  Range,
} from '@/components/editor/StyleInspector'
import { Spreadsheet } from '@/components/editor/Spreadsheet'
import { Graph } from '@/components/editor/Graph'
import {
  makeFixtures,
  type Network,
  type Style,
  type TableKind,
} from '@/lib/editor'

export default function Page() {
  return (
    <SidebarProvider style={{ '--sidebar-width': '340px' } as CSSProperties}>
      <Workspace />
    </SidebarProvider>
  )
}

function Workspace() {
  const { toggleSidebar, open, openMobile, isMobile } = useSidebar()
  const styleOpen = isMobile ? openMobile : open
  const [isMac, setIsMac] = useState(false)
  useEffect(() => {
    const frame = requestAnimationFrame(() =>
      setIsMac(/Mac|iPhone|iPad/.test(navigator.platform)),
    )
    return () => cancelAnimationFrame(frame)
  }, [])
  const shortcut = (key: string, shift = false) =>
    isMac ? `${shift ? '⇧' : ''}⌘${key}` : `Ctrl+${shift ? 'Shift+' : ''}${key}`
  const [networks, setNetworks] = useState(makeFixtures),
    [current, setCurrent] = useState('egfr'),
    [dark, setDark] = useState(false),
    [mode, setMode] = useState('workspace')
  const [tableKind, setTableKind] = useState<TableKind>('nodes')
  const [revealRow, setRevealRow] = useState<{
    id: string
    request: number
  } | null>(null)
  const [selected, setSelected] = useState<string[]>([]),
    [collapsed, setCollapsed] = useState(false),
    [height, setHeight] = useState(40),
    [inspector, setInspector] = useState(false),
    [drilled, setDrilled] = useState(false)
  const [confidence, setConfidence] = useState(0),
    [physical, setPhysical] = useState(true),
    [predicted, setPredicted] = useState(true),
    [search, setSearch] = useState(''),
    [notice, setNotice] = useState('')
  const [undo, setUndo] = useState<Record<string, Network[]>>({})
  const [redo, setRedo] = useState<Record<string, Network[]>>({})
  const lastSplit = useRef(40)
  const networkHidden = !collapsed && height === 100
  function resizeSpreadsheet(value: number) {
    if (value > 0 && value < 100) lastSplit.current = value
    setHeight(value)
    setCollapsed(value === 0)
  }
  function toggleSpreadsheet() {
    if (collapsed) {
      setHeight(lastSplit.current)
      setCollapsed(false)
    } else setCollapsed(true)
  }
  function toggleNetwork() {
    resizeSpreadsheet(networkHidden ? lastSplit.current : 100)
  }
  const network = networks[current]
  const mappingGesture = useRef<Network | null>(null)
  const change = (next: Network, transient = false) => {
    if (transient) {
      mappingGesture.current ??= networks[next.id]
      setNetworks((prev) => ({ ...prev, [next.id]: next }))
      return
    }
    const before =
      mappingGesture.current?.id === next.id
        ? mappingGesture.current
        : networks[next.id]
    mappingGesture.current = null
    setUndo((prev) => ({
      ...prev,
      [next.id]: [...(prev[next.id] ?? []), before].slice(-100),
    }))
    setRedo((prev) => ({ ...prev, [next.id]: [] }))
    setNetworks((prev) => ({ ...prev, [next.id]: next }))
  }
  const changeStyle = (style: Partial<Style>, transient = false) =>
    change({ ...network, style: { ...network.style, ...style } }, transient)
  function history(direction: 'undo' | 'redo') {
    const from = direction === 'undo' ? undo : redo
    const previous = from[current]?.at(-1)
    if (!previous) return
    const setFrom = direction === 'undo' ? setUndo : setRedo
    const setTo = direction === 'undo' ? setRedo : setUndo
    setFrom((prev) => ({ ...prev, [current]: prev[current].slice(0, -1) }))
    setTo((prev) => ({
      ...prev,
      [current]: [...(prev[current] ?? []), network],
    }))
    setNetworks((prev) => ({ ...prev, [current]: previous }))
  }
  function choose(id: string) {
    setTableKind('nodes')
    setCurrent(id)
    setSelected([])
    setDrilled(false)
    setConfidence(0)
    setPhysical(true)
    setPredicted(true)
  }
  function openSubsystem() {
    setCurrent('mapk')
    setDrilled(true)
    setSelected([])
    setInspector(true)
    setCollapsed(true)
  }
  function back() {
    setCurrent('hierarchy')
    setDrilled(false)
    setSelected(['hierarchy-2'])
  }
  function scene(next: string) {
    setMode(next)
    setHeight(lastSplit.current)
    if (next === 'mappings') {
      setNetworks((prev) => ({
        ...prev,
        egfr: {
          ...prev.egfr,
          style: {
            ...prev.egfr.style,
            mappings: {
              ...prev.egfr.style.mappings,
              fill: prev.egfr.style.mappings?.fill ?? {
                enabled: true,
                kind: 'discrete',
                attribute: 'type',
                domain: [-0.42, 2.41],
                range: ['#d4d4d4', '#404040'],
                entries: [
                  {
                    id: 'dark',
                    value: '#404040',
                    categories: ['receptor', 'kinase'],
                  },
                  { id: 'light', value: '#bdbdbd', categories: ['adaptor'] },
                ],
              },
              lineWidth: prev.egfr.style.mappings?.lineWidth ?? {
                enabled: true,
                kind: 'continuous',
                attribute: 'confidence',
                domain: [0.65, 0.95],
                range: [1, 5],
                entries: [],
              },
            },
          },
        },
      }))
    }
    setSelected(next === 'styles' ? ['egfr-0', 'egfr-1', 'egfr-2'] : [])
    setDark(next === 'styles')
    setCollapsed(next !== 'workspace')
    setInspector(next === 'hiview')
    setCurrent(next === 'hiview' ? 'mapk' : 'egfr')
    setDrilled(next === 'hiview')
    setConfidence(0)
    setPhysical(true)
    setPredicted(true)
  }
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('scene')
    const frame = requestAnimationFrame(() => {
      if (requested && ['styles', 'hiview', 'mappings'].includes(requested))
        scene(requested)
    })
    return () => cancelAnimationFrame(frame)
  }, [])
  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(''), 4500)
    return () => clearTimeout(timer)
  }, [notice])
  useEffect(() => {
    const bindings: [string, () => void][] = [
      ['command+z,ctrl+z', () => history('undo')],
      ['command+shift+z,ctrl+shift+z,ctrl+y', () => history('redo')],
      ['command+b,ctrl+b', toggleSidebar],
      ['command+j,ctrl+j', toggleSpreadsheet],
      ['command+shift+b,ctrl+shift+b', () => setInspector((v) => !v)],
    ]
    const handlers = bindings.map(([keys, action]) => {
      const handler = (event: KeyboardEvent) => {
        if (event.isComposing) return
        event.preventDefault()
        if (!event.repeat) action()
      }
      hotkeys(keys, handler)
      return { keys, handler }
    })
    return () =>
      handlers.forEach(({ keys, handler }) => hotkeys.unbind(keys, handler))
  })
  function exportData() {
    const blob = new Blob([JSON.stringify(network, null, 2)], {
        type: 'application/json',
      }),
      url = URL.createObjectURL(blob),
      a = document.createElement('a')
    a.href = url
    a.download = `${network.id}-mockup.json`
    a.click()
    URL.revokeObjectURL(url)
  }
  const apiRef = useRef({ scene, networks, current })
  useEffect(() => {
    apiRef.current = { scene, networks, current }
  })
  useEffect(() => {
    const context = (
      document as Document & {
        modelContext?: {
          registerTool: (
            tool: unknown,
            options: { signal: AbortSignal },
          ) => void
        }
      }
    ).modelContext
    if (!context) return
    const controller = new AbortController()
    try {
      context.registerTool(
        {
          name: 'show_design_scene',
          description:
            'Show one of the Cytoscape design scenes; edits remain in memory.',
          inputSchema: {
            type: 'object',
            properties: {
              scene: {
                type: 'string',
                enum: ['workspace', 'styles', 'hiview', 'mappings'],
              },
            },
            required: ['scene'],
            additionalProperties: false,
          },
          execute: async (input: unknown) => {
            const value = (input as { scene?: string })?.scene
            if (
              !value ||
              !['workspace', 'styles', 'hiview', 'mappings'].includes(value)
            )
              throw new Error('Unknown scene')
            apiRef.current.scene(value)
            await new Promise((resolve) =>
              requestAnimationFrame(() => requestAnimationFrame(resolve)),
            )
            return { scene: value }
          },
        },
        { signal: controller.signal },
      )
    } catch {
      /* Optional browser capability; the visible controls remain available. */
    }
    return () => controller.abort()
  }, [])
  return (
    <>
      <Sidebar className="editor-sidebar" collapsible="offcanvas">
        <SidebarHeader>
          <NetworkPicker
            networks={networks}
            current={current}
            onChoose={choose}
          />
        </SidebarHeader>
        <SidebarContent>
          <StyleInspector
            key={`${current}-${mode}`}
            network={network}
            selected={selected}
            onStyle={changeStyle}
            onClearSelection={() => setSelected([])}
            mode={mode}
          />
        </SidebarContent>
        <SidebarFooter>
          <DropdownMenu>
            <DropdownMenuTrigger className="account">
              <span className="avatar">MF</span>
              <span>
                <strong>Max Franz</strong>
                <small>Personal workspace</small>
              </span>
              <ChevronsUpDown size={14} />
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top">
              <DropdownMenuItem onClick={() => setDark(!dark)}>
                {dark ? <Sun /> : <Moon />}
                {dark ? 'Light' : 'Dark'} appearance
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                Account settings · prototype
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
      </Sidebar>
      <main className="main-workspace">
        <header className="main-header">
          <SidebarTrigger />
          <span className="tool-divider" />
          <Menubar className="app-menubar">
            <MenubarMenu>
              <MenubarTrigger>File</MenubarTrigger>
              <MenubarContent className="main-menu-content">
                <MenubarItem disabled>Import network… (prototype)</MenubarItem>
                <MenubarItem disabled>Import table… (prototype)</MenubarItem>
                <MenubarSeparator />
                <MenubarItem onClick={exportData}>
                  Export fixture as JSON
                </MenubarItem>
              </MenubarContent>
            </MenubarMenu>
            <MenubarMenu>
              <MenubarTrigger>Edit</MenubarTrigger>
              <MenubarContent className="main-menu-content">
                <MenubarItem
                  disabled={!undo[current]?.length}
                  onClick={() => history('undo')}
                >
                  <Undo2 />
                  Undo
                  <MenubarShortcut>{shortcut('Z')}</MenubarShortcut>
                </MenubarItem>
                <MenubarItem
                  disabled={!redo[current]?.length}
                  onClick={() => history('redo')}
                >
                  <Redo2 />
                  Redo
                  <MenubarShortcut>{shortcut('Z', true)}</MenubarShortcut>
                </MenubarItem>
                <MenubarSeparator />
                <MenubarItem
                  onClick={() => setSelected(network.nodes.map((n) => n.id))}
                >
                  Select all nodes
                </MenubarItem>
                <MenubarItem onClick={() => setSelected([])}>
                  Clear selection
                </MenubarItem>
              </MenubarContent>
            </MenubarMenu>
            <MenubarMenu>
              <MenubarTrigger>View</MenubarTrigger>
              <MenubarContent className="main-menu-content">
                <MenubarItem onClick={toggleSidebar}>
                  {styleOpen ? 'Hide' : 'Show'} style sidebar
                  <MenubarShortcut>{shortcut('B')}</MenubarShortcut>
                </MenubarItem>
                <MenubarItem onClick={toggleSpreadsheet}>
                  {collapsed ? 'Show' : 'Hide'} spreadsheet
                  <MenubarShortcut>{shortcut('J')}</MenubarShortcut>
                </MenubarItem>
                <MenubarItem onClick={toggleNetwork}>
                  {networkHidden ? 'Show' : 'Hide'} network
                </MenubarItem>
                <MenubarItem onClick={() => setInspector(!inspector)}>
                  {inspector ? 'Hide' : 'Show'} inspector
                  <MenubarShortcut>{shortcut('B', true)}</MenubarShortcut>
                </MenubarItem>
                <MenubarItem onClick={() => setDark(!dark)}>
                  {dark ? 'Light' : 'Dark'} appearance
                </MenubarItem>
              </MenubarContent>
            </MenubarMenu>
            <MenubarMenu>
              <MenubarTrigger>Layout</MenubarTrigger>
              <MenubarContent className="main-menu-content">
                <MenubarItem
                  onClick={() =>
                    change({
                      ...network,
                      nodes: network.nodes.map((n, i) => ({
                        ...n,
                        x: String(
                          490 +
                            270 *
                              Math.cos(
                                (i / network.nodes.length) * Math.PI * 2,
                              ),
                        ),
                        y: String(
                          240 +
                            165 *
                              Math.sin(
                                (i / network.nodes.length) * Math.PI * 2,
                              ),
                        ),
                      })),
                    })
                  }
                >
                  Circle
                </MenubarItem>
                <MenubarItem
                  onClick={() => {
                    const original = makeFixtures()[current]
                    change({
                      ...network,
                      nodes: network.nodes.map((n, i) => ({
                        ...n,
                        x: original.nodes[i]?.x ?? n.x,
                        y: original.nodes[i]?.y ?? n.y,
                      })),
                    })
                  }}
                >
                  Restore layout
                </MenubarItem>
              </MenubarContent>
            </MenubarMenu>
            <MenubarMenu>
              <MenubarTrigger>Apps</MenubarTrigger>
              <MenubarContent className="main-menu-content">
                <MenubarItem disabled>
                  No apps connected in this prototype
                </MenubarItem>
              </MenubarContent>
            </MenubarMenu>
            <MenubarMenu>
              <MenubarTrigger>Help</MenubarTrigger>
              <MenubarContent className="main-menu-content">
                <MenubarSub>
                  <MenubarSubTrigger>Guides</MenubarSubTrigger>
                  <MenubarSubContent className="main-menu-content">
                    <MenubarItem
                      onClick={() =>
                        setNotice(
                          'Choose a network from the workspace selector. Click a node to reveal its spreadsheet row.',
                        )
                      }
                    >
                      Exploring networks
                    </MenubarItem>
                    <MenubarSub>
                      <MenubarSubTrigger>Styling & mappings</MenubarSubTrigger>
                      <MenubarSubContent className="main-menu-content">
                        <MenubarItem
                          onClick={() =>
                            setNotice(
                              'Edit a value or drag its slider to set the default appearance. The graph updates immediately.',
                            )
                          }
                        >
                          Default appearance
                        </MenubarItem>
                        <MenubarSub>
                          <MenubarSubTrigger>
                            Attribute mappings
                          </MenubarSubTrigger>
                          <MenubarSubContent className="main-menu-content">
                            <MenubarItem
                              onClick={() =>
                                setNotice(
                                  'Enable the mapping button, choose Continuous, then set the data domain and output range.',
                                )
                              }
                            >
                              Continuous mappings
                            </MenubarItem>
                            <MenubarItem
                              onClick={() =>
                                setNotice(
                                  'Choose Discrete to assign attribute categories to style values. Add entries and use Select values to group categories.',
                                )
                              }
                            >
                              Discrete mappings
                            </MenubarItem>
                          </MenubarSubContent>
                        </MenubarSub>
                      </MenubarSubContent>
                    </MenubarSub>
                    <MenubarItem
                      onClick={() =>
                        setNotice(
                          'Edit spreadsheet cells directly. Use column menus to rename or sort, and the blank row to add data.',
                        )
                      }
                    >
                      Editing tables
                    </MenubarItem>
                  </MenubarSubContent>
                </MenubarSub>
                <MenubarSub>
                  <MenubarSubTrigger>Workspace tips</MenubarSubTrigger>
                  <MenubarSubContent className="main-menu-content">
                    <MenubarItem
                      onClick={() =>
                        setNotice(
                          'Use the panel icons to toggle Style, Spreadsheet, and Inspector. Drag the spreadsheet edge to snap between layouts.',
                        )
                      }
                    >
                      Arranging panels
                    </MenubarItem>
                    <MenubarItem
                      onClick={() =>
                        setNotice(
                          'In HiView, open a subsystem to drill down. Use Back or the breadcrumbs to return.',
                        )
                      }
                    >
                      Navigating HiView
                    </MenubarItem>
                  </MenubarSubContent>
                </MenubarSub>
                <MenubarSeparator />
                <MenubarItem
                  onClick={() =>
                    setNotice(
                      'Click a node to select. Shift-click adds nodes. Enter commits table drafts. Escape cancels.',
                    )
                  }
                >
                  Keyboard & editing tips
                </MenubarItem>
                <MenubarItem
                  onClick={() =>
                    setNotice(
                      'Fixture data only. Changes stay in memory and reset on page reload.',
                    )
                  }
                >
                  About this prototype
                </MenubarItem>
              </MenubarContent>
            </MenubarMenu>
          </Menubar>
          <span className="header-spacer" />
          <Popover>
            <PopoverTrigger className="icon-button" aria-label="Search nodes">
              <Search size={16} />
            </PopoverTrigger>
            <PopoverContent align="end">
              <PopoverTitle>Find a node</PopoverTitle>
              <Input
                placeholder="Gene or protein…"
                aria-label="Search nodes"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="picker-list">
                {network.nodes
                  .filter((n) =>
                    n.name.toLowerCase().includes(search.toLowerCase()),
                  )
                  .map((n) => (
                    <button
                      className="network-option"
                      key={n.id}
                      onClick={() => setSelected([n.id])}
                    >
                      {n.name}
                      {selected.includes(n.id) && <Check size={13} />}
                    </button>
                  ))}
              </div>
            </PopoverContent>
          </Popover>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Toggle spreadsheet"
            aria-pressed={!collapsed}
            onClick={toggleSpreadsheet}
          >
            <PanelBottom />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Toggle inspector"
            aria-pressed={inspector}
            onClick={() => setInspector(!inspector)}
          >
            <PanelRight />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger className="prototype-switch">
              UI study
              <ChevronRight size={12} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => scene('workspace')}>
                01 · Main workspace
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => scene('styles')}>
                02 · Style editing
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => scene('mappings')}>
                04 · Inline mappings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => scene('hiview')}>
                03 · HiView subsystem
              </DropdownMenuItem>
              <MenubarSeparator />
              <DropdownMenuItem
                render={
                  <a
                    aria-label="View 01-workspace concept"
                    href="/concepts/01-workspace.png"
                    target="_blank"
                    rel="noreferrer"
                  />
                }
              >
                View generated workspace concept
              </DropdownMenuItem>
              <DropdownMenuItem
                render={
                  <a
                    aria-label="View 02-style-editor concept"
                    href="/concepts/02-style-editor.png"
                    target="_blank"
                    rel="noreferrer"
                  />
                }
              >
                View generated style concept
              </DropdownMenuItem>
              <DropdownMenuItem
                render={
                  <a
                    aria-label="View 03-hiview concept"
                    href="/concepts/03-hiview.png"
                    target="_blank"
                    rel="noreferrer"
                  />
                }
              >
                View generated HiView concept
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        {drilled && (
          <nav className="breadcrumbs" aria-label="Hierarchy path">
            <Button variant="ghost" size="sm" onClick={back}>
              <ArrowLeft />
              Back
            </Button>
            <span className="tool-divider" />
            <button onClick={back}>Human cell hierarchy</button>
            <ChevronRight size={13} />
            <span>Signal transduction</span>
            <ChevronRight size={13} />
            <strong>MAPK cascade</strong>
          </nav>
        )}
        <div className="editor-body">
          <div className="central-workspace">
            <div
              className="network-pane"
              aria-hidden={networkHidden}
              inert={networkHidden}
            >
              <Graph
                network={network}
                selected={selected}
                onSelect={setSelected}
                onNodeClick={(id) => {
                  setTableKind('nodes')
                  if (collapsed) toggleSpreadsheet()
                  setRevealRow((previous) => ({
                    id,
                    request: (previous?.request ?? 0) + 1,
                  }))
                }}
                onOpen={openSubsystem}
                confidence={confidence / 100}
                physical={physical}
                predicted={predicted}
              />
            </div>
            <Spreadsheet
              key={current}
              network={network}
              onChange={change}
              collapsed={collapsed}
              onCollapse={toggleSpreadsheet}
              height={height}
              onHeight={resizeSpreadsheet}
              revealRow={revealRow}
              kind={tableKind}
              onKindChange={setTableKind}
              selected={selected}
              onSelect={setSelected}
            />
          </div>
          <div
            className="inspector-panel"
            data-open={inspector}
            aria-hidden={!inspector}
            inert={!inspector}
          >
            <aside className="right-inspector">
              <div className="inspector-title">
                <strong>{drilled ? 'Subsystem' : 'Inspector'}</strong>
                <Button
                  size="icon-xs"
                  variant="ghost"
                  aria-label="Close inspector"
                  onClick={() => setInspector(false)}
                >
                  <X />
                </Button>
              </div>
              <div className="inspector-summary">
                <small>
                  {drilled ? 'SIGNAL TRANSDUCTION' : 'CURRENT NETWORK'}
                </small>
                <h2>{network.name}</h2>
                <span className="subsystem-badge">
                  {network.nodes.length} nodes · {network.edges.length} edges
                </span>
              </div>
              <details open>
                <summary>Filters</summary>
                <Range
                  label="Min. confidence"
                  value={confidence}
                  onChange={setConfidence}
                  unit="%"
                />
                <label className="check-row" htmlFor="physical-filter">
                  <Checkbox
                    id="physical-filter"
                    checked={physical}
                    onCheckedChange={(v) => setPhysical(Boolean(v))}
                  />
                  Physical interactions
                </label>
                <label className="check-row" htmlFor="predicted-filter">
                  <Checkbox
                    id="predicted-filter"
                    checked={predicted}
                    onCheckedChange={(v) => setPredicted(Boolean(v))}
                  />
                  Predicted interactions
                </label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setConfidence(0)
                    setPhysical(true)
                    setPredicted(true)
                  }}
                >
                  Reset filters
                </Button>
              </details>
              <details open>
                <summary>Properties</summary>
                <dl>
                  <dt>Organism</dt>
                  <dd>Homo sapiens</dd>
                  <dt>Source</dt>
                  <dd>
                    {drilled ? 'Human cell hierarchy' : 'Example workspace'}
                  </dd>
                  <dt>Selection</dt>
                  <dd>
                    {
                      network.nodes.filter((n) => selected.includes(n.id))
                        .length
                    }{' '}
                    nodes ·{' '}
                    {
                      network.edges.filter((e) => selected.includes(e.id))
                        .length
                    }{' '}
                    edges
                  </dd>
                </dl>
              </details>
              <div className="inspector-footnote">Illustrative data</div>
            </aside>
          </div>
        </div>
        {notice && (
          <output className="notice">
            {notice}
            <button aria-label="Dismiss message" onClick={() => setNotice('')}>
              <X size={14} />
            </button>
          </output>
        )}
      </main>
    </>
  )
}
