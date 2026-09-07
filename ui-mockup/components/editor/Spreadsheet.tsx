'use client'
/* oxlint-disable jsx-a11y/prefer-tag-over-role -- Interactive splitter needs the ARIA separator role and pointer handlers. */
import { useState, useRef } from 'react'
import {
  ChevronDown,
  ChevronUp,
  ArrowUp,
  ArrowDown,
  Pencil,
  Check,
} from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverTitle,
} from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import {
  addNode,
  addEdge,
  addColumn,
  renameColumn,
  sortRows,
  type Network,
  type TableKind,
  type Row,
} from '@/lib/editor'

function NodePicker({
  network,
  value,
  onChange,
  label,
}: {
  network: Network
  value: string
  onChange: (id: string) => void
  label: string
}) {
  const [open, setOpen] = useState(false),
    [query, setQuery] = useState('')
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="cell-node-picker" aria-label={label}>
        {network.nodes.find((n) => n.id === value)?.name || label}
        <ChevronDown size={12} />
      </PopoverTrigger>
      <PopoverContent>
        <PopoverTitle>{label}</PopoverTitle>
        <Input
          aria-label={`Search ${label}`}
          placeholder="Find a node…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="picker-list">
          {network.nodes
            .filter((n) => n.name.toLowerCase().includes(query.toLowerCase()))
            .map((n) => (
              <button
                key={n.id}
                className="network-option"
                onClick={() => {
                  onChange(n.id)
                  setOpen(false)
                }}
              >
                {n.name}
                {value === n.id && <Check size={13} />}
              </button>
            ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
export function Spreadsheet({
  network,
  onChange,
  collapsed,
  onCollapse,
  height,
  onHeight,
  selected,
  onSelect,
}: {
  network: Network
  onChange: (n: Network) => void
  collapsed: boolean
  onCollapse: () => void
  height: number
  onHeight: (n: number) => void
  selected: string[]
  onSelect: (ids: string[]) => void
}) {
  const [kind, setKind] = useState<TableKind>('nodes'),
    [sort, setSort] = useState<{
      key: string
      direction: 'asc' | 'desc'
    } | null>(null)
  const [renaming, setRenaming] = useState<string | null>(null),
    [newHeading, setNewHeading] = useState('')
  const [nodeDraft, setNodeDraft] = useState(''),
    [source, setSource] = useState(''),
    [target, setTarget] = useState(''),
    [propertyDraft, setPropertyDraft] = useState(''),
    [error, setError] = useState('')
  const container = useRef<HTMLElement>(null)
  const cols = network.columns[kind]
  const data: Row[] =
    kind === 'nodes'
      ? network.nodes
      : kind === 'edges'
        ? network.edges
        : network.properties
  const rows = sort ? sortRows(data, sort.key, sort.direction) : data
  const attempt = (action: () => void) => {
    try {
      action()
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not apply edit.')
    }
  }
  function edit(row: Row, key: string, value: string) {
    if (value === String(row[key] ?? '')) return
    attempt(() => {
      if (key === 'name' && !value.trim())
        throw new Error('A node name cannot be empty.')
      if (
        ['log2FC', 'pValue', 'confidence'].includes(key) &&
        (!value.trim() || !Number.isFinite(Number(value)))
      )
        throw new Error('Enter a valid number.')
      if (
        ['pValue', 'confidence'].includes(key) &&
        (Number(value) < 0 || Number(value) > 1)
      )
        throw new Error('Enter a number from 0 to 1.')
      const field = kind === 'network' ? 'properties' : kind
      onChange({
        ...network,
        [field]: data.map((r) =>
          r.id === row.id ? { ...r, [key]: value } : r,
        ),
      })
    })
  }
  function draft() {
    attempt(() => {
      if (kind === 'nodes') {
        if (!nodeDraft.trim()) return
        onChange(addNode(network, nodeDraft))
        setNodeDraft('')
      } else if (kind === 'edges') {
        onChange(addEdge(network, source, target))
        setSource('')
        setTarget('')
      } else {
        if (!propertyDraft.trim()) return
        if (network.properties.some((p) => p.property === propertyDraft.trim()))
          throw new Error('That property already exists.')
        onChange({
          ...network,
          properties: [
            ...network.properties,
            {
              id: crypto.randomUUID(),
              property: propertyDraft.trim(),
              value: '',
            },
          ],
        })
        setPropertyDraft('')
      }
    })
  }
  return (
    <section
      ref={container}
      className={`spreadsheet ${collapsed ? 'is-collapsed' : ''}`}
      style={{ height: collapsed ? 44 : `${height}%` }}
      aria-label="Spreadsheet"
    >
      {!collapsed && (
        <div
          className="table-resize"
          role="separator"
          aria-label="Resize spreadsheet"
          aria-orientation="horizontal"
          aria-valuenow={height}
          aria-valuemin={25}
          aria-valuemax={65}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
              e.preventDefault()
              onHeight(
                Math.max(
                  25,
                  Math.min(65, height + (e.key === 'ArrowUp' ? 5 : -5)),
                ),
              )
            }
          }}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId)
          }}
          onPointerMove={(e) => {
            if (
              e.currentTarget.hasPointerCapture(e.pointerId) &&
              container.current
            ) {
              const parent =
                container.current.parentElement!.getBoundingClientRect()
              onHeight(
                Math.max(
                  25,
                  Math.min(
                    65,
                    (100 * (parent.bottom - e.clientY)) / parent.height,
                  ),
                ),
              )
            }
          }}
          onPointerUp={(e) =>
            e.currentTarget.releasePointerCapture(e.pointerId)
          }
        />
      )}
      <Tabs
        value={kind}
        onValueChange={(v) => {
          setKind(v as TableKind)
          setSort(null)
          setError('')
        }}
        className="table-tabs-root"
      >
        <div className="table-bar">
          <button className="table-left-toggle" aria-label="Toggle spreadsheet visibility" aria-expanded={!collapsed} onClick={onCollapse} />
          <TabsList aria-label="Table type">
            {(['nodes', 'edges', 'network'] as TableKind[]).map((t) => (
              <TabsTrigger key={t} value={t}>
                {t[0].toUpperCase() + t.slice(1)}
              </TabsTrigger>
            ))}
          </TabsList>
          <button
            className="table-collapse-area"
            aria-label={
              collapsed ? 'Expand spreadsheet' : 'Collapse spreadsheet'
            }
            aria-expanded={!collapsed}
            onClick={onCollapse}
          >
            <span>
              {collapsed
                ? ''
                : `${data.length} ${kind === 'network' ? 'properties' : kind}`}
            </span>
            {collapsed ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        </div>
        {(['nodes', 'edges', 'network'] as TableKind[]).map((t) => (
          <TabsContent
            key={t}
            value={t}
            className="table-content"
            hidden={collapsed}
          >
            {kind === t && !collapsed && (
              <>
                <div className="table-scroll">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        {cols.map((c) => (
                          <TableHead key={c.key}>
                            {renaming === c.key ? (
                              <Input
                                ref={element => { element?.focus() }}
                                aria-label="Rename column"
                                defaultValue={c.label}
                                onKeyDown={(e) => {
                                  if (e.key === 'Escape') setRenaming(null)
                                  if (e.key === 'Enter')
                                    attempt(() => {
                                      onChange(
                                        renameColumn(
                                          network,
                                          kind,
                                          c.key,
                                          e.currentTarget.value,
                                        ),
                                      )
                                      setRenaming(null)
                                    })
                                }}
                              />
                            ) : (
                              <DropdownMenu>
                                <DropdownMenuTrigger
                                  className="column-trigger"
                                  aria-label={`${c.label} column menu`}
                                >
                                  {c.label}
                                  <span>
                                    {sort?.key === c.key ? (
                                      sort.direction === 'asc' ? (
                                        <ArrowUp size={12} />
                                      ) : (
                                        <ArrowDown size={12} />
                                      )
                                    ) : (
                                      <ChevronDown size={12} />
                                    )}
                                  </span>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                  <DropdownMenuItem
                                    onClick={() => setRenaming(c.key)}
                                  >
                                    <Pencil />
                                    Rename
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      setSort({ key: c.key, direction: 'asc' })
                                    }
                                  >
                                    <ArrowUp />
                                    Sort ascending
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      setSort({ key: c.key, direction: 'desc' })
                                    }
                                  >
                                    <ArrowDown />
                                    Sort descending
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </TableHead>
                        ))}
                        <TableHead>
                          <input
                            className="blank-heading"
                            aria-label="New column name"
                            placeholder="+"
                            value={newHeading}
                            onChange={(e) => setNewHeading(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Escape') setNewHeading('')
                              if (e.key === 'Enter')
                                attempt(() => {
                                  onChange(addColumn(network, kind, newHeading))
                                  setNewHeading('')
                                })
                            }}
                          />
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((r, i) => (
                        <TableRow
                          key={r.id}
                          data-selected={
                            kind === 'nodes' && selected.includes(r.id)
                          }
                        >
                          <TableCell>
                            <button
                              aria-label={`Select row ${i + 1}`}
                              onClick={() => {
                                if (kind === 'nodes')
                                  onSelect(
                                    selected.includes(r.id)
                                      ? selected.filter((id) => id !== r.id)
                                      : [...selected, r.id],
                                  )
                              }}
                            >
                              {i + 1}
                            </button>
                          </TableCell>
                          {cols.map((c) => (
                            <TableCell key={c.key}>
                              {kind === 'edges' &&
                              ['source', 'target'].includes(c.key) ? (
                                <NodePicker
                                  network={network}
                                  value={r[c.key]}
                                  label={`Edit ${c.key}`}
                                  onChange={(id) => edit(r, c.key, id)}
                                />
                              ) : (
                                <input
                                  key={`${r.id}-${c.key}-${r[c.key] ?? ''}`}
                                  aria-label={`${c.label} row ${i + 1}`}
                                  defaultValue={r[c.key] ?? ''}
                                  onBlur={(e) => edit(r, c.key, e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault()
                                      e.currentTarget.blur()
                                    }
                                    if (e.key === 'Escape') {
                                      e.currentTarget.value = r[c.key] ?? ''
                                      e.currentTarget.blur()
                                    }
                                  }}
                                />
                              )}
                            </TableCell>
                          ))}
                          <TableCell />
                        </TableRow>
                      ))}
                      <TableRow
                        className="draft-row"
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') {
                            setNodeDraft('')
                            setSource('')
                            setTarget('')
                            setPropertyDraft('')
                            setError('')
                          }
                          if (e.key === 'Enter' && kind === 'edges') {
                            e.preventDefault()
                            draft()
                          }
                        }}
                      >
                        <TableCell>+</TableCell>
                        {cols.map((c, i) => (
                          <TableCell key={c.key}>
                            {kind === 'nodes' && i === 0 ? (
                              <input
                                aria-label="New node name"
                                placeholder="Add a node…"
                                value={nodeDraft}
                                onChange={(e) => setNodeDraft(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') draft()
                                }}
                              />
                            ) : kind === 'edges' && c.key === 'source' ? (
                              <NodePicker
                                label="Choose source"
                                network={network}
                                value={source}
                                onChange={setSource}
                              />
                            ) : kind === 'edges' && c.key === 'target' ? (
                              <NodePicker
                                label="Choose target"
                                network={network}
                                value={target}
                                onChange={setTarget}
                              />
                            ) : kind === 'edges' && i === 2 ? (
                              <button className="commit-edge" onClick={draft}>
                                {source || target ? 'Create edge ↵' : ''}
                              </button>
                            ) : kind === 'network' && i === 0 ? (
                              <input
                                aria-label="New property name"
                                placeholder="Add a property…"
                                value={propertyDraft}
                                onChange={(e) =>
                                  setPropertyDraft(e.target.value)
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') draft()
                                }}
                              />
                            ) : null}
                          </TableCell>
                        ))}
                        <TableCell />
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
                {error && (
                  <div className="table-error" role="alert">
                    {error}
                  </div>
                )}
              </>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </section>
  )
}
