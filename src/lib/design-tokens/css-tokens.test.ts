import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  buildDesignTokensDocument,
  classifyToken,
  parseCssRootTokens,
} from '../../../scripts/lib/css-tokens.mjs'

describe('css-tokens export (Penpot upgrade)', () => {
  const css = readFileSync(resolve(process.cwd(), 'src/app/globals.css'), 'utf8')

  it('parses :root custom properties from globals.css', () => {
    const tokens = parseCssRootTokens(css)
    expect(tokens.canvas).toBe('#eef4f6')
    expect(tokens.tenant).toBe('#0d7a72')
    expect(tokens['signal-critical']).toBe('#c01e1e')
    expect(tokens['radius-md']).toBe('8px')
    expect(tokens.background).toBeUndefined()
    expect(tokens.foreground).toBeUndefined()
  })

  it('classifies color vs dimension tokens', () => {
    expect(classifyToken('tenant', '#0d7a72')).toBe('color')
    expect(classifyToken('radius-lg', '12px')).toBe('dimension')
    expect(classifyToken('dur-2', '280ms')).toBe('duration')
    expect(classifyToken('shadow-1', '0 1px 2px rgba(26, 26, 46, 0.05)')).toBe(
      'shadow',
    )
  })

  it('builds Penpot-oriented document with hex colors', () => {
    const tokens = parseCssRootTokens(css)
    const doc = buildDesignTokensDocument(tokens, { source: 'test' })
    expect(doc.name).toBe('MaintainOS')
    expect(doc.penpot.mcp.package).toBe('@penpot/mcp')
    expect(doc.penpot.colors.some((c) => c.name === '--tenant')).toBe(true)
    expect(doc.tokens.tenant.$type).toBe('color')
    expect(doc.tokens.tenant.$value).toBe('#0d7a72')
  })
})
