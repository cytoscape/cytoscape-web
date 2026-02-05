#!/usr/bin/env ts-node
/**
 * Script to generate a CSV file containing all filenames in a folder
 *
 * Usage:
 *   npx ts-node --project scripts/batch-renaming/tsconfig.json scripts/batch-renaming/generate-filenames-csv.ts [folder-path] [output-file]
 *
 * Examples:
 *   npx ts-node --project scripts/batch-renaming/tsconfig.json scripts/batch-renaming/generate-filenames-csv.ts src/features
 *   npx ts-node --project scripts/batch-renaming/tsconfig.json scripts/batch-renaming/generate-filenames-csv.ts src/features output.csv
 *   npx ts-node --project scripts/batch-renaming/tsconfig.json scripts/batch-renaming/generate-filenames-csv.ts src/features file-list.csv --no-recursive
 */

import * as fs from 'fs'
import * as path from 'path'

interface FileInfo {
  filename: string
  relativePath: string
}

function getAllFiles(
  dirPath: string,
  basePath: string,
  recursive: boolean = true,
): FileInfo[] {
  const files: FileInfo[] = []
  const items = fs.readdirSync(dirPath, { withFileTypes: true })

  for (const item of items) {
    const fullPath = path.join(dirPath, item.name)
    const relativePath = path.relative(basePath, fullPath)

    if (item.isDirectory()) {
      if (recursive) {
        files.push(...getAllFiles(fullPath, basePath, recursive))
      } else {
        files.push({
          filename: item.name,
          relativePath,
        })
      }
    } else {
      files.push({
        filename: item.name,
        relativePath,
      })
    }
  }

  return files
}

function escapeCsvField(field: string): string {
  // If field contains comma, newline, or quote, wrap in quotes and escape quotes
  if (field.includes(',') || field.includes('\n') || field.includes('"')) {
    return `"${field.replace(/"/g, '""')}"`
  }
  return field
}

function generateCsv(files: FileInfo[]): string {
  // CSV header
  const headers = ['Filename', 'Relative Path', 'New Name', 'Complete']

  // Build CSV rows
  const rows = files.map((file) => [
    escapeCsvField(file.filename),
    escapeCsvField(file.relativePath),
    '', // Empty New Name column
    '', // Empty Complete column
  ])

  // Combine header and rows
  const csvLines = [headers.join(',')]
  csvLines.push(...rows.map((row) => row.join(',')))

  return csvLines.join('\n')
}

function main(): void {
  const args = process.argv.slice(2)

  // Parse arguments
  let folderPath = args[0] || '.'
  let outputFile = args[1] || 'filenames.csv'
  let recursive = true

  // Check for --recursive or --no-recursive flags
  const recursiveIndex = args.indexOf('--recursive')
  const noRecursiveIndex = args.indexOf('--no-recursive')

  if (noRecursiveIndex !== -1) {
    recursive = false
    args.splice(noRecursiveIndex, 1)
    // Re-parse folder and output
    folderPath = args[0] || '.'
    outputFile = args[1] || 'filenames.csv'
  } else if (recursiveIndex !== -1) {
    recursive = true
    args.splice(recursiveIndex, 1)
    // Re-parse folder and output
    folderPath = args[0] || '.'
    outputFile = args[1] || 'filenames.csv'
  }

  // Resolve absolute paths
  folderPath = path.resolve(folderPath)
  outputFile = path.resolve(outputFile)

  // Validate folder exists
  if (!fs.existsSync(folderPath)) {
    console.error(`Error: Folder does not exist: ${folderPath}`)
    process.exit(1)
  }

  if (!fs.statSync(folderPath).isDirectory()) {
    console.error(`Error: Path is not a directory: ${folderPath}`)
    process.exit(1)
  }

  console.log(`Scanning folder: ${folderPath}`)
  console.log(`Recursive: ${recursive}`)

  // Get all files
  const files = getAllFiles(folderPath, folderPath, recursive)
  console.log(`Found ${files.length} items`)

  // Generate CSV
  const csv = generateCsv(files)

  // Write to file
  fs.writeFileSync(outputFile, csv, 'utf-8')
  console.log(`CSV file generated: ${outputFile}`)
}

main()
