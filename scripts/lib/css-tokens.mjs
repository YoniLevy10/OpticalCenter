/**
 * Parse MaintainOS CSS custom properties from a `:root { ... }` block.
 * Used for Penpot / design-tool handoff (open-source Figma alternative).
 */

/**
 * @param {string} css
 * @returns {Record<string, string>}
 */
export function parseCssRootTokens(css) {
  const rootMatch = css.match(/:root\s*\{([\s\S]*?)\n\}/)
  if (!rootMatch) {
    throw new Error('No :root block found in CSS')
  }

  /** @type {Record<string, string>} */
  const tokens = {}
  const body = rootMatch[1]
  const re = /--([a-z0-9-]+)\s*:\s*([^;]+);/gi
  let m
  while ((m = re.exec(body)) !== null) {
    const name = m[1]
    const value = m[2].trim()
    // Skip Tailwind/shadcn aliases that only point at other tokens for theme bridge
    if (name === 'background' || name === 'foreground') continue
    tokens[name] = value
  }
  return tokens
}

/**
 * @param {string} name
 * @returns {'color'|'dimension'|'shadow'|'duration'|'cubicBezier'|'number'|'string'}
 */
export function classifyToken(name, value) {
  if (name.startsWith('dur-')) return 'duration'
  if (name === 'ease' || name === 'ease-spring') return 'cubicBezier'
  if (
    name.startsWith('shadow-') ||
    value.includes('rgba(') && value.includes('px')
  ) {
    return 'shadow'
  }
  if (
    /^(canvas|surface|border|ink|signal|tenant)/.test(name) ||
    /^#[0-9a-f]{3,8}$/i.test(value)
  ) {
    return 'color'
  }
  if (
    name.startsWith('radius-') ||
    name.endsWith('-h') ||
    name.endsWith('-w') ||
    name === 'tap' ||
    name.startsWith('safe-') ||
    name.startsWith('hq-') ||
    name === 'row-h' ||
    name === 'nav-w' ||
    name === 'topbar-h' ||
    name === 'bottomnav-h'
  ) {
    return 'dimension'
  }
  return 'string'
}

/**
 * DTCG-ish token document + Penpot-oriented color library slice.
 * @param {Record<string, string>} tokens
 * @param {{ source?: string }} [meta]
 */
export function buildDesignTokensDocument(tokens, meta = {}) {
  /** @type {Record<string, { $type: string, $value: string, $description?: string }>} */
  const dtcg = {}
  /** @type {{ name: string, color: string }[]} */
  const penpotColors = []

  for (const [name, value] of Object.entries(tokens)) {
    const type = classifyToken(name, value)
    dtcg[name] = {
      $type: type,
      $value: value,
    }
    if (type === 'color' && /^#[0-9a-f]{3,8}$/i.test(value)) {
      penpotColors.push({ name: `--${name}`, color: value.toUpperCase() })
    }
  }

  return {
    $schema: 'https://design-tokens.github.io/community-group/format/',
    name: 'MaintainOS',
    description:
      'Operational Quiet + Bamakor Pulse — export for Penpot / open-source design tools',
    source: meta.source ?? 'src/app/globals.css',
    generatedAt: new Date().toISOString(),
    tokens: dtcg,
    penpot: {
      libraryHint:
        'Create a Penpot color library named MaintainOS and paste hex colors from penpot.colors',
      colors: penpotColors,
      mcp: {
        package: '@penpot/mcp',
        endpoint: 'http://localhost:4401/mcp',
        docs: 'https://github.com/penpot/penpot/tree/develop/mcp',
      },
    },
  }
}
