/**
 * Visual Regression Tests: Network Rendering Pipeline
 *
 * This is a proof-of-concept for the automated testing framework
 * proposed in GSoC 2026 issue 233 (Cytoscape Automated Testing Suite).
 *
 * Pipeline demonstrated:
 *   1. Load a real CX2 network file into Cytoscape Web
 *   2. Wait for the network to fully render on canvas
 *   3. Capture a screenshot of the rendered network
 *   4. Compare against a baseline ("gold standard") image
 *   5. Report pixel-level differences
 *
 * This miniature pipeline mirrors the full GSoC project scope which will:
 *   - Test 20+ real scientific session files from publications
 *   - Use OpenCV/ImageMagick for structural similarity comparison
 *   - Integrate AI (GPT-4/Gemini) for semantic validation
 *   - Cross-validate Desktop (CyREST) vs Web rendering
 *
 * Related: nrnb/GoogleSummerOfCode#233
 */

import { test, expect } from './fixtures'
import * as fs from 'fs'
import * as path from 'path'

// Constants

const FIXTURES_DIR = path.join(__dirname, '../fixtures/cx2/valid')
const BASELINES_DIR = path.join(__dirname, 'baselines')
const OUTPUTS_DIR = path.join(__dirname, 'outputs')

// Helpers

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

/**
 * Pixel-level image comparison using Buffer diff.
 *
 * NOTE: In the full GSoC project this will be replaced with:
 *   - pixelmatch: precise pixel diff + diff-image generation
 *   - OpenCV SSIM: structural similarity index
 *   - ImageMagick: perceptual comparison
 *   - GPT-4 Vision / Gemini: semantic validation
 */
function buffersAreSimilar(
  a: Buffer,
  b: Buffer,
  tolerancePercent: number = 5,
): { similar: boolean; diffPercent: number } {
  if (a.length !== b.length) {
    return { similar: false, diffPercent: 100 }
  }
  let diffBytes = 0
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) diffBytes++
  }
  const diffPercent = (diffBytes / a.length) * 100
  return { similar: diffPercent <= tolerancePercent, diffPercent }
}

/**
 * Dismiss the cookie consent banner.
 * Waits up to 5s for it to appear after networkidle, then dismisses it.
 */
async function dismissCookieBanner(page: any): Promise<void> {
  try {
    const acceptButton = page.getByRole('button', { name: /accept/i })
    await acceptButton.waitFor({ state: 'visible', timeout: 5000 })
    await acceptButton.click()
    await acceptButton.waitFor({ state: 'hidden', timeout: 5000 })
  } catch {
    // Banner not present — that's fine
  }
}

/**
 * Load a CX2 file into Cytoscape Web via Data > Import > Network from File...
 *
 * After upload, waits for the network name to appear in the workspace panel
 * and clicks it to open in the viewer. The app does NOT auto-select networks.
 *
 * Uses { exact: true } to avoid matching duplicate names like "file.cx2_1"
 * when the same file is loaded twice (Test 3).
 * Uses .first() to avoid strict mode violations if multiple matches exist.
 */
async function loadCx2Network(page: any, cx2FilePath: string): Promise<void> {
  // Open Data > Import > Network from File...
  await page.getByTestId('toolbar-data-menu-button').click()
  await page.getByRole('menuitem', { name: /^import$/i }).click()
  await page.waitForTimeout(500)
  await page.getByRole('menuitem', { name: /network from file/i }).click()

  // Wait for dropzone and inject file (bypasses OS file picker)
  await page.getByTestId('file-upload-dropzone').waitFor({ state: 'visible' })
  const fileInput = page.locator('[data-testid="file-upload-dropzone"] input[type="file"]')
  await fileInput.setInputFiles(cx2FilePath)

  // Wait for network to appear in workspace panel then click to select it
  const networkName = path.basename(cx2FilePath)
  await page.getByText(networkName, { exact: true }).first().waitFor({ state: 'visible', timeout: 15000 })
  await page.getByText(networkName, { exact: true }).first().click()
}

/**
 * Wait for the Cytoscape canvas to be visible AND fully rendered.
 *
 * Waits for "Applying layout..." spinner to disappear — the definitive signal
 * that rendering is complete. For cartesian layouts (no spinner), falls back
 * to a longer wait since there is no other completion signal.
 *
 * NOTE: In the full GSoC project this will be replaced with a proper
 * event hook listening for Cytoscape's layoutstop event.
 */
async function waitForCanvasRender(page: any): Promise<void> {
  // Wait for the network renderer container to appear
  await page.getByTestId('cyjs-renderer').waitFor({ state: 'visible', timeout: 60000 })

  // Detect whether the layout spinner appears
  const spinnerAppeared = await page
    .getByText('Applying layout...')
    .waitFor({ state: 'visible', timeout: 3000 })
    .then(() => true)
    .catch(() => false)

  if (spinnerAppeared) {
    // Wait for spinner to disappear — definitive signal that layout is done
    await page.getByText('Applying layout...').waitFor({ state: 'hidden', timeout: 60000 })
  }

  // Longer buffer when no spinner (cartesian layout has no completion signal)
  await page.waitForTimeout(spinnerAppeared ? 1000 : 4000)
}

// Tests

test.describe('Visual Regression: Network Rendering Pipeline', () => {
  test.setTimeout(120000)

  test.beforeEach(async ({ page }) => {
    ensureDir(BASELINES_DIR)
    ensureDir(OUTPUTS_DIR)
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000) // allow cookie banner to appear after networkidle
    await dismissCookieBanner(page)
  })

  // Test 1: Core pipeline — load → render → screenshot → compare

  test('renders with-visual-style network and matches baseline', async ({ page }) => {
    const networkFile = path.join(FIXTURES_DIR, 'with-visual-style.valid.cx2')
    const baselinePath = path.join(BASELINES_DIR, 'with-visual-style.png')
    const outputPath = path.join(OUTPUTS_DIR, 'with-visual-style-current.png')

    await loadCx2Network(page, networkFile)
    await waitForCanvasRender(page)

    const canvas = page.locator('[data-testid="cyjs-renderer"] canvas').first()
    await canvas.screenshot({ path: outputPath, type: 'png' })
    console.log(`Screenshot saved: ${outputPath}`)

    const stats = fs.statSync(outputPath)
    console.log(`Screenshot size: ${stats.size} bytes`)
    expect(stats.size).toBeGreaterThan(1000)

    // First run: save as baseline and pass
    // Subsequent runs: compare against baseline
    if (!fs.existsSync(baselinePath)) {
      fs.copyFileSync(outputPath, baselinePath)
      console.log(`Baseline created: ${baselinePath}`)
      console.log('Re-run tests to perform visual comparison.')
      return
    }

    const baseline = fs.readFileSync(baselinePath)
    const current = fs.readFileSync(outputPath)
    const { similar, diffPercent } = buffersAreSimilar(baseline, current, 5)

    console.log(`Diff: ${diffPercent.toFixed(2)}% (threshold: 5%)`)
    if (!similar) {
      console.log(`FAIL: Rendering differs from baseline by ${diffPercent.toFixed(2)}%`)
      console.log('NOTE: Full project will generate a visual diff image via pixelmatch/ImageMagick')
    }
    expect(similar).toBe(true)
  })

  // Test 2: Smoke test — canvas is non-empty after loading

  test('canvas is non-empty after loading small-network', async ({ page }) => {
    const networkFile = path.join(FIXTURES_DIR, 'with-visual-style.valid.cx2')
    const outputPath = path.join(OUTPUTS_DIR, 'small-network-smoke.png')

    await loadCx2Network(page, networkFile)
    await waitForCanvasRender(page)

    const canvas = page.locator('[data-testid="cyjs-renderer"] canvas').first()
    await expect(canvas).toBeVisible()
    await canvas.screenshot({ path: outputPath })

    // An empty canvas PNG is ~68 bytes; a real network render is much larger
    const stats = fs.statSync(outputPath)
    console.log(`Screenshot size: ${stats.size} bytes`)
    expect(stats.size).toBeGreaterThan(1000)
  })

  // Test 3: Determinism — same network renders identically across two loads

  test('rendering is deterministic across two loads', async ({ page }) => {
    // Cartesian layout has fixed node coordinates — render should be pixel-stable
    const networkFile = path.join(FIXTURES_DIR, 'with-cartesian-layout.valid.cx2')
    const output1 = path.join(OUTPUTS_DIR, 'determinism-run1.png')
    const output2 = path.join(OUTPUTS_DIR, 'determinism-run2.png')

    // First render
    await loadCx2Network(page, networkFile)
    await waitForCanvasRender(page)
    await page.locator('[data-testid="cyjs-renderer"] canvas').first().screenshot({ path: output1 })
    console.log(`Run 1 screenshot saved: ${output1}`)

    // Full page reload to ensure clean state — no leftover networks
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)
    await dismissCookieBanner(page)

    // Second render
    await loadCx2Network(page, networkFile)
    await waitForCanvasRender(page)
    await page.locator('[data-testid="cyjs-renderer"] canvas').first().screenshot({ path: output2 })
    console.log(`Run 2 screenshot saved: ${output2}`)

    // Both must have real content
    expect(fs.statSync(output1).size).toBeGreaterThan(1000)
    expect(fs.statSync(output2).size).toBeGreaterThan(1000)

    // Compare — fixed cartesian coordinates should produce identical renders
    const buf1 = fs.readFileSync(output1)
    const buf2 = fs.readFileSync(output2)
    const { similar, diffPercent } = buffersAreSimilar(buf1, buf2, 2)

    console.log(`Determinism diff: ${diffPercent.toFixed(2)}% (threshold: 2%)`)
    console.log('NOTE: Fixed cartesian coordinates should produce stable pixel output')
    expect(similar).toBe(true)
  })
})

/**
 * FUTURE WORK (full GSoC project scope):
 *
 * 1. Replace buffersAreSimilar() with:
 *    - pixelmatch: pixel-level diff with visual diff image output
 *    - OpenCV SSIM: structural similarity index (perceptual comparison)
 *    - ImageMagick: industry-standard image comparison
 *
 * 2. Add CyREST client tests:
 *    - Load same CX2 file into Cytoscape Desktop via REST API
 *    - Export rendered image from Desktop
 *    - Cross-compare Desktop vs Web rendering
 *
 * 3. Expand fixture coverage:
 *    - 20+ real scientific session files from publications
 *    - "Gold standard" figures sourced from papers
 *
 * 4. AI-powered validation:
 *    - GPT-4 Vision / Gemini for semantic comparison
 *    - "Does this network diagram convey the same biological information?"
 *
 * 5. CI/CD:
 *    - GitHub Actions workflow
 *    - Automatic baseline updates on approval
 *    - HTML report with side-by-side diff viewer
 */