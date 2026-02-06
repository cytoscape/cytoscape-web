export type CommandNamespace = 'view' | 'network' | 'node' | 'help'

export interface ParsedCommand {
  namespace: CommandNamespace
  command: string
  subcommand?: string
  args: Record<string, string>
  raw: string
}

const normalize = (str: string): string => str.trim()

export const parseCommand = (input: string): ParsedCommand | { error: string } => {
  const raw = input
  const trimmed = normalize(input)
  if (trimmed === '') {
    return { error: 'Empty command' }
  }

  const parts = trimmed.split(/\s+/)
  const namespace = parts[0]?.toLowerCase()
  if (namespace === 'help') {
    return { namespace: 'help', command: 'help', args: {}, raw }
  }

  if (!['view', 'network', 'node'].includes(namespace)) {
    return { error: `Unknown namespace "${namespace}"` }
  }

  const command = (parts[1] ?? '').toLowerCase()
  if (!command) {
    return { error: `Missing command for namespace "${namespace}"` }
  }

  const args: Record<string, string> = {}
  let subcommand: string | undefined
  // Remaining tokens are param=value or free-form subcommand tokens (e.g., fit content)
  const remaining = parts.slice(2)
  if (namespace === 'view') {
    // join remaining back for simple patterns like "fit content"
    const suffix = remaining.join(' ').trim()
    if (command === 'fit') {
      args.target = suffix || 'content'
    } else {
      args.target = suffix
    }
  } else {
    // For node list/set properties (free-form variant)
    if (namespace === 'node' && remaining.length > 0) {
      const tail = remaining.join(' ').toLowerCase().trim()
      if (command === 'list' && tail === 'properties') {
        subcommand = 'properties'
      }
      if (command === 'set' && tail.startsWith('properties')) {
        subcommand = 'properties'
        // allow trailing tokens to still parse key/value pairs if provided
      }
    }
    // Parse key=value pairs, preserving quoted values with spaces
    if (remaining.length > 0) {
      const restJoined = remaining.join(' ')
      const regex = /([A-Za-z0-9_-]+)=(".*?"|'.*?'|[^ ]+)/g
      let matched = false
      let match: RegExpExecArray | null
      // eslint-disable-next-line no-cond-assign
      while ((match = regex.exec(restJoined)) !== null) {
        matched = true
        const key = match[1].toLowerCase()
        const value = match[2].replace(/^['"]|['"]$/g, '')
        args[key] = value
      }

      // Fallback to simple token parsing if regex found nothing
      if (!matched) {
        remaining.forEach((token) => {
          const [k, ...rest] = token.split('=')
          if (rest.length === 0) {
            return
          }
          args[k.toLowerCase()] = rest.join('=')
        })
      }
    }
  }

  return {
    namespace: namespace as CommandNamespace,
    command,
    args,
    raw,
    ...(subcommand ? { subcommand } : {}),
  }
}
