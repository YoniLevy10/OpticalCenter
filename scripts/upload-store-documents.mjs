#!/usr/bin/env node
/**
 * Upload Ari's certificate PDFs from .local/certificates into the private
 * store-documents bucket and point each document row at the file.
 *
 *   node scripts/upload-store-documents.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Need NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const root = join(process.cwd(), '.local', 'certificates')
const index = JSON.parse(readFileSync(join(root, 'index.json'), 'utf8'))
const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const entries = Object.entries(index)
let uploaded = 0
let missingDoc = 0
let linkedFiles = 0

for (const [id, entry] of entries) {
  const rel = entry?.path
  if (!rel || String(rel).includes('..')) {
    console.error('skip bad path', id)
    continue
  }
  const bytes = readFileSync(join(root, rel))
  const storagePath = `certs/${id}.pdf`
  const { error: upErr } = await supabase.storage.from('store-documents').upload(storagePath, bytes, {
    contentType: 'application/pdf',
    upsert: true,
  })
  if (upErr) {
    console.error('upload failed', id, upErr.message)
    process.exit(1)
  }
  const { data: docs, error: docErr } = await supabase
    .from('store_documents')
    .update({ storage_path: storagePath })
    .eq('client_id', id)
    .select('client_id')
  if (docErr) {
    console.error('doc update failed', id, docErr.message)
    process.exit(1)
  }
  if (!docs?.length) missingDoc += 1
  else uploaded += 1

  const name = entry.name
  if (name) {
    const { data: files, error: fileErr } = await supabase
      .from('ingested_files')
      .update({ storage_path: storagePath })
      .eq('name', name)
      .select('client_id')
    if (fileErr) {
      console.error('file update failed', name, fileErr.message)
      process.exit(1)
    }
    linkedFiles += files?.length ?? 0
  }
}

console.log(JSON.stringify({ index: entries.length, uploaded, missingDoc, linkedFiles }))
