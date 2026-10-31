import { readFile } from 'fs/promises'
import { join } from 'path'
import { NextResponse } from 'next/server'

const ID = /^ari-cert-[a-f0-9]{24}$/

/** First page of a certificate, rendered locally for the folder view. */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  if (process.env.NODE_ENV === 'production' || !ID.test(id)) {
    return new NextResponse(null, { status: 404 })
  }
  try {
    const bytes = await readFile(join(process.cwd(), '.local', 'doc-previews', `${id}.png`))
    return new NextResponse(bytes, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch {
    return new NextResponse(null, { status: 404 })
  }
}
