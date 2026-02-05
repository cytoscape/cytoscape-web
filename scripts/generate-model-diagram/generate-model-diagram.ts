#!/usr/bin/env ts-node
/**
 * Script to generate a Mermaid diagram of model relationships
 *
 * Usage:
 *   npm install -D ts-node ts-morph
 *   npx ts-node scripts/generate-model-diagram.ts
 */

import { Project, SyntaxKind } from 'ts-morph'
import * as fs from 'fs'
import * as path from 'path'

interface ModelInfo {
  name: string
  filePath: string
  imports: string[]
  exports: string[]
}

const project = new Project({
  tsConfigFilePath: './src/models/tsconfig.json',
})

const modelsDir = path.join(__dirname, '../src/models')
const models: Map<string, ModelInfo> = new Map()

function getModelName(filePath: string): string {
  const relativePath = path.relative(modelsDir, filePath)
  const parts = relativePath.split(path.sep)
  // Remove 'index.ts' and get directory name
  if (parts[parts.length - 1] === 'index.ts') {
    return parts[parts.length - 2] || 'index'
  }
  return parts[parts.length - 1].replace('.ts', '')
}

function analyzeModels(): void {
  const sourceFiles = project.getSourceFiles()

  for (const sourceFile of sourceFiles) {
    const filePath = sourceFile.getFilePath()

    // Skip impl files and test files
    if (filePath.includes('/impl/') || filePath.includes('.test.')) {
      continue
    }

    // Only analyze model files
    if (!filePath.includes('/src/models/')) {
      continue
    }

    const modelName = getModelName(filePath)
    const imports: string[] = []
    const exports: string[] = []

    // Get imports from other models
    sourceFile.getImportDeclarations().forEach((imp) => {
      const moduleSpecifier = imp.getModuleSpecifierValue()
      if (
        moduleSpecifier.includes('../models/') ||
        moduleSpecifier.includes('../../models/')
      ) {
        const imported = moduleSpecifier.split('/').pop() || moduleSpecifier
        imports.push(imported)
      }
    })

    // Get exports
    sourceFile.getExportedDeclarations().forEach((declarations, name) => {
      exports.push(name)
    })

    if (!models.has(modelName)) {
      models.set(modelName, {
        name: modelName,
        filePath: path.relative(modelsDir, filePath),
        imports: [],
        exports: [],
      })
    }

    const model = models.get(modelName)!
    model.imports.push(...imports)
    model.exports.push(...exports)
  }
}

function generateMermaidDiagram(): string {
  let mermaid = 'graph TB\n'

  // Generate nodes
  for (const [name, model] of models.entries()) {
    const nodeId = name.replace(/\s+/g, '')
    mermaid += `    ${nodeId}[${name}]\n`
  }

  mermaid += '\n'

  // Generate edges based on imports
  for (const [name, model] of models.entries()) {
    const fromId = name.replace(/\s+/g, '')

    for (const importName of model.imports) {
      const toId = importName.replace(/\s+/g, '')
      if (models.has(importName)) {
        mermaid += `    ${fromId} --> ${toId}\n`
      }
    }
  }

  return mermaid
}

function main(): void {
  console.log('Analyzing model relationships...')
  analyzeModels()

  console.log(`Found ${models.size} models`)

  const diagram = generateMermaidDiagram()

  const outputPath = path.join(__dirname, '../docs/models-auto-generated.mmd')
  fs.writeFileSync(outputPath, diagram)

  console.log(`Generated diagram: ${outputPath}`)
  console.log('\nDiagram preview:')
  console.log(diagram)
}

if (require.main === module) {
  main()
}
