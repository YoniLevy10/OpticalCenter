import { readFile } from 'fs/promises'
import { join, sep } from 'path'
import { NextResponse } from 'next/server'

const ID = /^ari-cert-[a-f0-9]{24}$/

type IndexEntry = { path?: string; name?: string }

/** The certificate PDF saved on this machine, not the email that carried it. */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  if (process.env.NODE_ENV === 'production' || !ID.test(id)) {
    return new NextResponse(null, { status: 404 })
  }
  const root = join(process.cwd(), '.local', 'certificates')
  try {
    const index = JSON.parse(await readFile(join(root, 'index.json'), 'utf8')) as Record<string, IndexEntry>
    const entry = index[id]
    const rel = entry?.path
    if (!rel || rel.includes('..') || rel.startsWith('/') || rel.startsWith('\\')) {
      return new NextResponse(null, { status: 404 })
    }
    const full = join(root, rel)
    if (!full.startsWith(root + sep)) return new NextResponse(null, { status: 404 })
    const bytes = await readFile(full)
    const name = entry.name || 'certificate.pdf'
    return new NextResponse(bytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(name)}`,
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch {
    return new NextResponse(null, { status: 404 })
  }
}
