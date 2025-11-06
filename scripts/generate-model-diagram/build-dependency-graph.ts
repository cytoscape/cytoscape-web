#!/usr/bin/env ts-node
/**
 * Script to build a dependency graph from all PascalCase model files
 *
 * This script reads the model-files-list.txt and analyzes each file
 * to construct a comprehensive dependency graph showing how models
 * depend on and are composed of one another.
 *
 * Usage:
 *   npm install -D ts-node ts-morph
 *   npx ts-node --compiler-options '{"module":"commonjs"}' scripts/generate-model-diagram/build-dependency-graph.ts
 */

import { Project, ImportDeclaration, ExportedDeclarations } from 'ts-morph'
import * as fs from 'fs'
import * as path from 'path'
import { execSync } from 'child_process'

interface FileInfo {
  filePath: string
  relativePath: string
  fileName: string
  imports: string[]
  exports: string[]
  dependencies: string[] // Resolved file paths that this file depends on
}

interface DependencyGraph {
  files: Map<string, FileInfo>
  edges: Array<{ from: string; to: string }>
}

const project = new Project({
  tsConfigFilePath: './src/models/tsconfig.json',
})

const modelsDir = path.join(__dirname, '../../src/models')
const fileListPath = path.join(__dirname, 'model-files-list.txt')
const graph: DependencyGraph = {
  files: new Map(),
  edges: [],
}

/**
 * Resolve an import path to an actual file path
 */
function resolveImportPath(
  importPath: string,
  fromFile: string,
): string | null {
  // Remove file extension if present
  const cleanImport = importPath.replace(/\.ts$/, '').replace(/\.js$/, '')

  // Handle relative imports (e.g., './EdgeView', '../IdType', '../../TableModel')
  if (cleanImport.startsWith('.')) {
    const fromDir = path.dirname(fromFile)
    const resolved = path.resolve(fromDir, cleanImport)

    // Try with .ts extension first
    let resolvedPath = resolved + '.ts'
    if (fs.existsSync(resolvedPath)) {
      const relative = path.relative(modelsDir, resolvedPath)
      return relative.replace(/\\/g, '/')
    }

    // Try as directory with index.ts
    resolvedPath = path.join(resolved, 'index.ts')
    if (fs.existsSync(resolvedPath)) {
      const relative = path.relative(modelsDir, resolvedPath)
      return relative.replace(/\\/g, '/')
    }

    // Try without extension (already tried above)
    if (fs.existsSync(resolved)) {
      const relative = path.relative(modelsDir, resolved)
      return relative.replace(/\\/g, '/')
    }
  }

  // Try to find in models directory structure
  // e.g., 'TableModel' -> 'TableModel/index.ts' or find the actual file
  const possiblePaths = [
    `${cleanImport}.ts`,
    `${cleanImport}/index.ts`,
    ...findFilesByName(cleanImport),
  ]

  for (const possiblePath of possiblePaths) {
    const fullPath = path.join(modelsDir, possiblePath)
    if (fs.existsSync(fullPath)) {
      return possiblePath
    }
  }

  return null
}

/**
 * Find files by name (without extension) in the models directory
 */
function findFilesByName(name: string): string[] {
  const results: string[] = []
  const fileList = fs.readFileSync(fileListPath, 'utf-8').split('\n')

  for (const line of fileList) {
    const trimmed = line.trim()
    if (!trimmed) continue

    const fileName = path.basename(trimmed, '.ts')
    if (fileName === name) {
      results.push(trimmed)
    }
  }

  return results
}

/**
 * Get the model name from a file path
 */
function getModelName(filePath: string): string {
  const relativePath = path.relative(modelsDir, filePath)
  const parts = relativePath.split(path.sep)
  const fileName = parts[parts.length - 1].replace('.ts', '')

  // If it's an index file, use the directory name
  if (fileName === 'index') {
    return parts[parts.length - 2] || 'index'
  }

  return fileName
}

/**
 * Analyze a single file and extract its dependencies
 */
function analyzeFile(filePath: string): FileInfo | null {
  const fullPath = path.join(modelsDir, filePath)

  if (!fs.existsSync(fullPath)) {
    console.warn(`File not found: ${fullPath}`)
    return null
  }

  const sourceFile = project.getSourceFile(fullPath)
  if (!sourceFile) {
    console.warn(`Could not parse: ${fullPath}`)
    return null
  }

  const relativePath = filePath
  const fileName = path.basename(filePath, '.ts')
  const imports: string[] = []
  const exports: string[] = []
  const dependencies: string[] = []

  // Extract imports
  sourceFile.getImportDeclarations().forEach((imp: ImportDeclaration) => {
    const moduleSpecifier = imp.getModuleSpecifierValue()

    // Only track imports from within the models directory
    // Skip node_modules and external packages
    if (
      moduleSpecifier.startsWith('.') ||
      moduleSpecifier.startsWith('../') ||
      moduleSpecifier.startsWith('../../')
    ) {
      // Skip imports to impl directories
      if (moduleSpecifier.includes('/impl/')) {
        return
      }

      imports.push(moduleSpecifier)

      // Try to resolve to an actual file
      const resolved = resolveImportPath(moduleSpecifier, fullPath)
      if (resolved) {
        // Check if the resolved file is in our list
        const fileList = fs.readFileSync(fileListPath, 'utf-8').split('\n')
        const normalizedResolved = resolved.replace(/\\/g, '/')

        // Try exact match first
        for (const line of fileList) {
          const trimmed = line.trim()
          if (trimmed === normalizedResolved) {
            dependencies.push(trimmed)
            return
          }
        }

        // Try matching by filename (in case path resolution differs slightly)
        const resolvedFileName = path.basename(normalizedResolved)
        for (const line of fileList) {
          const trimmed = line.trim()
          if (trimmed && path.basename(trimmed) === resolvedFileName) {
            // Only add if it's not already in dependencies
            if (!dependencies.includes(trimmed)) {
              dependencies.push(trimmed)
            }
            break
          }
        }
      }
    }
  })

  // Extract exports
  sourceFile
    .getExportedDeclarations()
    .forEach((declarations: ExportedDeclarations[], name: string) => {
      exports.push(name)
    })

  return {
    filePath: fullPath,
    relativePath,
    fileName,
    imports,
    exports,
    dependencies,
  }
}

/**
 * Build the dependency graph from all files in the list
 */
function buildDependencyGraph(): void {
  console.log('Reading file list...')
  const fileList = fs.readFileSync(fileListPath, 'utf-8').split('\n')

  console.log(`Found ${fileList.length} files in list`)

  // Analyze each file
  for (const line of fileList) {
    const filePath = line.trim()
    if (!filePath) continue

    console.log(`Analyzing: ${filePath}`)
    const fileInfo = analyzeFile(filePath)

    if (fileInfo) {
      const key = fileInfo.relativePath
      graph.files.set(key, fileInfo)

      // Add edges for dependencies
      for (const dep of fileInfo.dependencies) {
        graph.edges.push({ from: key, to: dep })
      }
    }
  }

  console.log(`\nAnalyzed ${graph.files.size} files`)
  console.log(`Found ${graph.edges.length} dependencies`)
}

/**
 * Generate a Mermaid diagram from the dependency graph
 */
function generateMermaidDiagram(): string {
  // Configure Mermaid for improved readability: larger fonts, clearer borders,
  // and the ELK renderer to reduce horizontal stretching.
  const mermaidInit = {
    theme: 'base',
    themeVariables: {
      fontFamily: 'Helvetica, Arial, sans-serif',
      fontSize: '22px',
      primaryColor: '#FFFFFF',
      primaryTextColor: '#111827',
      primaryBorderColor: '#1D4ED8',
      lineColor: '#1D4ED8',
      clusterBkg: '#F8FAFC',
      clusterBorder: '#94A3B8',
    },
    flowchart: {
      curve: 'basis',
      defaultRenderer: 'elk',
      htmlLabels: true,
      nodeSpacing: 140,
      rankSpacing: 220,
      padding: 32,
      useMaxWidth: false,
    },
  }

  let mermaid = `%%{init: ${JSON.stringify(mermaidInit)} }%%\n`
  mermaid += 'graph TB\n\n'

  // Group files by top-level directory for better organization
  const byDirectory = new Map<string, string[]>()

  for (const [filePath] of graph.files.entries()) {
    const parts = filePath.split('/')
    const topDir = parts.length > 1 ? parts[0] : '.'
    if (!byDirectory.has(topDir)) {
      byDirectory.set(topDir, [])
    }
    byDirectory.get(topDir)!.push(filePath)
  }

  // Create subgraphs for each top-level directory
  const sortedDirs = Array.from(byDirectory.entries()).sort((a, b) => {
    if (a[0] === '.') return 1
    if (b[0] === '.') return -1
    return a[0].localeCompare(b[0])
  })

  for (const [dir, files] of sortedDirs) {
    if (dir === '.') {
      // Root level files
      for (const filePath of files) {
        const fileInfo = graph.files.get(filePath)!
        const nodeId = fileInfo.fileName.replace(/[^a-zA-Z0-9]/g, '_')
        mermaid += `    ${nodeId}["${fileInfo.fileName}"]\n`
      }
    } else {
      // Directory subgraph
      const subgraphId = dir.replace(/[^a-zA-Z0-9]/g, '_')
      mermaid += `    subgraph ${subgraphId}["${dir}"]\n`
      mermaid += `        direction TB\n`

      // Sort files within directory
      const sortedFiles = files.sort()
      for (const filePath of sortedFiles) {
        const fileInfo = graph.files.get(filePath)!
        const nodeId = fileInfo.fileName.replace(/[^a-zA-Z0-9]/g, '_')
        mermaid += `        ${nodeId}["${fileInfo.fileName}"]\n`
      }

      mermaid += `    end\n`
    }
  }

  mermaid += '\n'

  // Add edges (only show dependencies between different directories to reduce clutter)
  // Or show all edges - let's show all for completeness
  for (const edge of graph.edges) {
    const fromInfo = graph.files.get(edge.from)
    const toInfo = graph.files.get(edge.to)

    if (fromInfo && toInfo) {
      const fromId = fromInfo.fileName.replace(/[^a-zA-Z0-9]/g, '_')
      const toId = toInfo.fileName.replace(/[^a-zA-Z0-9]/g, '_')
      mermaid += `    ${fromId} --> ${toId}\n`
    }
  }

  return mermaid
}

/**
 * Generate a JSON representation of the dependency graph
 */
function generateJsonGraph(): string {
  const jsonData = {
    files: Array.from(graph.files.entries()).map(([path, info]) => ({
      path,
      fileName: info.fileName,
      imports: info.imports,
      exports: info.exports,
      dependencies: info.dependencies,
    })),
    edges: graph.edges,
  }

  return JSON.stringify(jsonData, null, 2)
}

/**
 * Generate a high-resolution PNG from the Mermaid diagram
 */
function generatePng(mermaidPath: string, pngPath: string): void {
  try {
    const cli = 'npx @mermaid-js/mermaid-cli'

    // Generate a PNG that balances legibility with file size.
    // Slight scaling keeps text crisp without requiring extreme zooming.
    const pngCommand = `${cli} -i "${mermaidPath}" -o "${pngPath}" -w 2800 -H 14000 -s 1.5 -b white`
    execSync(pngCommand, { stdio: 'inherit' })
    console.log(`✓ PNG generated successfully`)

    // Also emit an SVG so the relationships stay sharp at any zoom level.
    const svgPath = pngPath.replace(/\.png$/, '.svg')
    const svgCommand = `${cli} -i "${mermaidPath}" -o "${svgPath}" -b transparent`
    execSync(svgCommand, { stdio: 'inherit' })
    console.log(`✓ SVG generated successfully`)
  } catch (error) {
    console.error(`✗ Failed to generate PNG: ${error}`)
    console.log(
      `  Make sure @mermaid-js/mermaid-cli is installed: npm install -D @mermaid-js/mermaid-cli`,
    )
  }
}

/**
 * Generate a text representation of the dependency graph
 */
function generateTextGraph(): string {
  let text = 'Dependency Graph\n'
  text += '='.repeat(80) + '\n\n'

  // Sort files by path
  const sortedFiles = Array.from(graph.files.entries()).sort((a, b) =>
    a[0].localeCompare(b[0]),
  )

  for (const [filePath, fileInfo] of sortedFiles) {
    text += `${filePath}\n`
    text += `  File: ${fileInfo.fileName}\n`
    text += `  Exports: ${fileInfo.exports.length > 0 ? fileInfo.exports.join(', ') : 'none'}\n`

    if (fileInfo.dependencies.length > 0) {
      text += `  Dependencies:\n`
      for (const dep of fileInfo.dependencies) {
        text += `    -> ${dep}\n`
      }
    } else {
      text += `  Dependencies: none\n`
    }

    text += '\n'
  }

  return text
}

/**
 * Main function
 */
function main(): void {
  console.log('Building dependency graph from model files...\n')

  buildDependencyGraph()

  // Generate outputs
  const mermaid = generateMermaidDiagram()
  const json = generateJsonGraph()
  const text = generateTextGraph()

  // Write outputs
  const outputDir = path.join(__dirname)
  const mermaidPath = path.join(outputDir, 'models-dependency-graph.mmd')
  const jsonPath = path.join(outputDir, 'models-dependency-graph.json')
  const textPath = path.join(outputDir, 'models-dependency-graph.txt')

  fs.writeFileSync(mermaidPath, mermaid)
  fs.writeFileSync(jsonPath, json)
  fs.writeFileSync(textPath, text)

  // Generate PNG with high resolution
  const pngPath = path.join(outputDir, 'models-dependency-graph.png')
  console.log(`\nGenerating high-resolution PNG...`)
  generatePng(mermaidPath, pngPath)

  console.log(`\nGenerated files:`)
  console.log(`  - ${mermaidPath}`)
  console.log(`  - ${jsonPath}`)
  console.log(`  - ${textPath}`)
  if (fs.existsSync(pngPath)) {
    console.log(`  - ${pngPath}`)
  }

  // Print summary
  console.log(`\nSummary:`)
  console.log(`  Total files: ${graph.files.size}`)
  console.log(`  Total dependencies: ${graph.edges.length}`)

  // Find files with most dependencies
  const dependencyCounts = new Map<string, number>()
  for (const edge of graph.edges) {
    dependencyCounts.set(edge.from, (dependencyCounts.get(edge.from) || 0) + 1)
  }

  const topDependents = Array.from(dependencyCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  if (topDependents.length > 0) {
    console.log(`\nTop files by number of dependencies:`)
    for (const [filePath, count] of topDependents) {
      console.log(`  ${filePath}: ${count} dependencies`)
    }
  }
}

if (require.main === module) {
  main()
}
