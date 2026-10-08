#!/usr/bin/env node
// Playwright launcher with a full-suite guard.
//
// Running the whole e2e suite locally is flaky under worker contention and
// takes minutes to tell you little, so CI owns it. That rule used to live only
// in .claude/settings.json, which means it bound one coding agent and no other
// tool. Enforcing it here binds every caller — Claude Code, Codex, a human in
// a hurry — with one escape hatch: CYWEB_FULL_E2E=1.
//
// A run is "targeted" when it names something: a positional filter
// (`e2e:spec table-browser`), --grep, or --last-failed. CI runs are exempt.

import { spawn } from 'node:child_process'

const args = process.argv.slice(2)

// Playwright flags that consume the next argument, so that `--project chromium`
// is not mistaken for a spec filter. Boolean flags (--list, --headed, ...) are
// deliberately absent.
const VALUE_FLAGS = new Set([
  '-c',
  '-g',
  '-gv',
  '-j',
  '-x',
  '--config',
  '--grep',
  '--grep-invert',
  '--max-failures',
  '--output',
  '--project',
  '--repeat-each',
  '--reporter',
  '--retries',
  '--shard',
  '--timeout',
  '--trace',
  '--workers',
])

const isFlag = (a) => a.startsWith('-')
const hasPositionalFilter = args.some((a, i) => {
  if (isFlag(a)) return false
  // Skip values that belong to a preceding `--flag value` pair.
  return !VALUE_FLAGS.has(args[i - 1])
})
const hasSelector =
  hasPositionalFilter ||
  args.some((a) => /^--(grep|grep-invert|last-failed|shard)\b/.test(a))

if (!hasSelector && !process.env.CI && process.env.CYWEB_FULL_E2E !== '1') {
  console.error(
    [
      'Refusing to run the whole e2e suite locally.',
      '',
      'It is flaky under worker contention and slow; CI owns the full suite.',
      'Run the specs that cover your change instead:',
      '',
      '  npm run e2e:spec -- <spec-name>',
      '',
      'Set CYWEB_FULL_E2E=1 to override (expect several minutes and retries).',
    ].join('\n'),
  )
  process.exit(1)
}

const child = spawn('npx', ['playwright', 'test', ...args], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
})
child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal)
  else process.exit(code ?? 1)
})
