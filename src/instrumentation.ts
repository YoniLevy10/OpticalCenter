export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { existsSync } = await import('node:fs')
    const { join } = await import('node:path')
    if (existsSync(join(process.cwd(), '.local', 'desk-cleared'))) {
      ;(globalThis as { __maintainosDeskCleared?: boolean }).__maintainosDeskCleared = true
    }
    await import('../sentry.server.config')
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config')
  }
}
