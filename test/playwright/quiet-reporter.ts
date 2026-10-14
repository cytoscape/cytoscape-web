import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
} from '@playwright/test/reporter'

// Failures-and-summary-only reporter for the `:quiet` npm scripts. Prints
// nothing while tests run; on completion it prints each unexpected failure
// (title, location, error messages) and a one-line tally. Meant for CI logs
// and AI agents, where per-test dots and stdio are pure noise.

const stripAnsi = (text: string): string =>
  text.replace(/\u001B\[[0-9;]*m/g, '')

const location = (test: TestCase): string =>
  `${test.location.file}:${test.location.line}`

class QuietReporter implements Reporter {
  private suite: Suite | undefined

  printsToStdio(): boolean {
    return true
  }

  onBegin(_config: FullConfig, suite: Suite): void {
    this.suite = suite
  }

  onEnd(result: FullResult): void {
    const tests = this.suite?.allTests() ?? []
    const counts = { expected: 0, unexpected: 0, flaky: 0, skipped: 0 }
    const failures: TestCase[] = []

    for (const test of tests) {
      const outcome = test.outcome()
      counts[outcome] += 1
      if (outcome === 'unexpected') {
        failures.push(test)
      }
    }

    for (const test of failures) {
      const lastResult = test.results[test.results.length - 1]
      console.log(`\n✘ ${test.titlePath().filter(Boolean).join(' › ')}`)
      console.log(`  at ${location(test)}`)
      for (const error of lastResult?.errors ?? []) {
        const message = stripAnsi(error.message ?? String(error.value ?? ''))
        console.log(
          message
            .split('\n')
            .map((line) => `  ${line}`)
            .join('\n'),
        )
      }
    }

    const seconds = (result.duration / 1000).toFixed(1)
    const parts = [`${counts.expected} passed`]
    if (counts.unexpected > 0) parts.push(`${counts.unexpected} failed`)
    if (counts.flaky > 0) parts.push(`${counts.flaky} flaky`)
    if (counts.skipped > 0) parts.push(`${counts.skipped} skipped`)
    console.log(`\n${parts.join(', ')} (${seconds}s) — ${result.status}`)
  }
}

export default QuietReporter
