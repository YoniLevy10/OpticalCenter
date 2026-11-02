import { readFile } from 'fs/promises'
import { join, sep } from 'path'
import { NextResponse } from 'next/server'
import { authErrorResponse, requireActor } from '@/lib/auth/request-actor'
import { createAdminClient } from '@/lib/supabase/admin'

const ID = /^ari-cert-[a-f0-9]{24}$/
const BUCKET = 'store-documents'

type IndexEntry = { path?: string; name?: string }

/** The certificate file stored for this document, not the email that carried it. */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  if (!ID.test(id)) return new NextResponse(null, { status: 404 })
  try {
    await requireActor(request)
  } catch (err) {
    return authErrorResponse(err)
  }

  const stored = await fileFromBucket(id)
  if (stored) return stored
  if (process.env.NODE_ENV === 'production') return new NextResponse(null, { status: 404 })
  return fileFromDisk(id)
}

async function fileFromBucket(id: string): Promise<NextResponse | null> {
  try {
    const supabase = createAdminClient()
    const { data: row, error } = await supabase
      .from('store_documents')
      .select('storage_path')
      .eq('client_id', id)
      .maybeSingle()
    const storagePath = row?.storage_path ? String(row.storage_path) : ''
    if (error || !storagePath || storagePath.includes('..')) return null
    const { data, error: downloadError } = await supabase.storage.from(BUCKET).download(storagePath)
    if (downloadError || !data) return null
    const { data: named } = await supabase
      .from('ingested_files')
      .select('name')
      .eq('storage_path', storagePath)
      .limit(1)
    const name = named?.[0]?.name ? String(named[0].name) : 'certificate.pdf'
    const bytes = Buffer.from(await data.arrayBuffer())
    return pdfResponse(bytes, name)
  } catch {
    return null
  }
}

async function fileFromDisk(id: string): Promise<NextResponse> {
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
    return pdfResponse(bytes, entry.name || 'certificate.pdf')
  } catch {
    return new NextResponse(null, { status: 404 })
  }
}

function pdfResponse(bytes: Uint8Array, name: string) {
  const body = new Uint8Array(bytes.byteLength)
  body.set(bytes)
  return new NextResponse(body, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(name)}`,
      'Cache-Control': 'private, max-age=3600',
    },
  })
}
