#!/usr/bin/env node
/**
 * Export MaintainOS design tokens from globals.css for Penpot (and other design tools).
 *
 * Usage:
 *   npm run tokens:export
 *   node scripts/export-design-tokens.mjs [--out path]
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  parseCssRootTokens,
  buildDesignTokensDocument,
} from './lib/css-tokens.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

function parseArgs(argv) {
  let out = resolve(root, 'design-tokens/maintainos.tokens.json')
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--out' && argv[i + 1]) {
      out = resolve(root, argv[++i])
    }
  }
  return { out }
}

function main() {
  const { out } = parseArgs(process.argv.slice(2))
  const cssPath = resolve(root, 'src/app/globals.css')
  const css = readFileSync(cssPath, 'utf8')
  const tokens = parseCssRootTokens(css)
  const doc = buildDesignTokensDocument(tokens, {
    source: 'src/app/globals.css',
  })

  mkdirSync(dirname(out), { recursive: true })
  writeFileSync(out, `${JSON.stringify(doc, null, 2)}\n`, 'utf8')

  const colorCount = doc.penpot.colors.length
  const tokenCount = Object.keys(doc.tokens).length
  console.log(
    `Exported ${tokenCount} tokens (${colorCount} Penpot colors) → ${out}`,
  )
}

main()
