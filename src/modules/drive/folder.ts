export type DriveRef = { kind: 'folder' | 'file'; id: string }

const ID = /([a-zA-Z0-9_-]{10,})/

/** Pull a Drive file or folder id out of a pasted link. */
export function parseDriveLink(input: string): DriveRef | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  const folder = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/)
  if (folder?.[1]) return { kind: 'folder', id: folder[1] }
  const file = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)
  if (file?.[1]) return { kind: 'file', id: file[1] }
  const query = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/)
  if (query?.[1]) return { kind: 'file', id: query[1] }
  if (ID.test(trimmed) && !trimmed.includes('/') && !trimmed.includes(' ')) {
    return { kind: 'folder', id: trimmed }
  }
  return null
}

export function driveViewUrl(id: string): string {
  return `https://drive.google.com/file/d/${id}/view`
}

export function driveFolderUrl(id: string): string {
  return `https://drive.google.com/drive/folders/${id}`
}

export function driveCanWrite(): boolean {
  return Boolean(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim() &&
      process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.trim(),
  )
}

function assertDriveId(id: string): string {
  const trimmed = id.trim()
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    throw new Error('מזהה דרייב לא תקין')
  }
  return trimmed
}

export const DRIVE_FOLDER_MIME = 'application/vnd.google-apps.folder'

export type DriveListedFile = {
  id: string
  name: string
  mimeType: string
  modifiedTime?: string
  parents?: string[]
  trashed?: boolean
  appProperties?: Record<string, string>
}

type DriveListResponse = {
  files?: DriveListedFile[]
  error?: { message?: string }
}

export function driveConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_DRIVE_API_KEY?.trim() ||
      (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim() &&
        process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.trim()),
  )
}

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive'

let cachedToken: { token: string; exp: number } | null = null

async function serviceAccountToken(): Promise<string | null> {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim()
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.trim()?.replace(
    /\\n/g,
    '\n',
  )
  if (!email || !key) return null
  const now = Math.floor(Date.now() / 1000)
  if (cachedToken && cachedToken.exp > now + 60) return cachedToken.token
  const { createSign } = await import('node:crypto')
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString(
    'base64url',
  )
  const claim = Buffer.from(
    JSON.stringify({
      iss: email,
      scope: DRIVE_SCOPE,
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    }),
  ).toString('base64url')
  const signer = createSign('RSA-SHA256')
  signer.update(`${header}.${claim}`)
  const assertion = `${header}.${claim}.${signer.sign(key).toString('base64url')}`
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  })
  const json = (await res.json()) as { access_token?: string }
  if (!json.access_token) return null
  cachedToken = { token: json.access_token, exp: now + 3600 }
  return json.access_token
}

async function driveAuthQuery(): Promise<{ headers: Headers; keyQuery: string }> {
  const token = await serviceAccountToken()
  const headers = new Headers()
  if (token) headers.set('authorization', `Bearer ${token}`)
  const key = process.env.GOOGLE_DRIVE_API_KEY?.trim()
  const keyQuery = !token && key ? `&key=${encodeURIComponent(key)}` : ''
  if (!token && !key) {
    throw new Error(
      'סנכרון תיקייה דורש GOOGLE_DRIVE_API_KEY או חשבון שירות. קישור לקובץ בודד עדיין נשמר לבדיקה.',
    )
  }
  return { headers, keyQuery }
}

type DriveListPage = DriveListResponse & { nextPageToken?: string }

async function listDriveFolderPage(
  folderId: string,
  pageToken: string,
): Promise<DriveListPage> {
  const { headers, keyQuery } = await driveAuthQuery()
  const q = encodeURIComponent(`'${assertDriveId(folderId)}' in parents and trashed = false`)
  const page = pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,mimeType,modifiedTime,parents,trashed,appProperties),nextPageToken&pageSize=100${page}${keyQuery}`,
    { headers },
  )
  const json = (await res.json()) as DriveListPage
  if (!res.ok) {
    throw new Error(json.error?.message || 'גוגל דרייב דחה את הסנכרון')
  }
  return json
}

export async function listDriveFolder(folderId: string): Promise<DriveListedFile[]> {
  const files: DriveListedFile[] = []
  let pageToken = ''
  do {
    const page = await listDriveFolderPage(folderId, pageToken)
    files.push(...(page.files ?? []))
    pageToken = page.nextPageToken ?? ''
  } while (pageToken && files.length < 400)
  return files
}

const TREE_CAP = 400

/** Walk Ari's folder tree. `complete` is false when the cap stopped the walk. */
export async function listDriveTree(rootId: string): Promise<{
  files: DriveListedFile[]
  complete: boolean
}> {
  const files: DriveListedFile[] = []
  const seen = new Set<string>()
  let complete = true

  async function walk(folderId: string, depth: number) {
    if (depth > 6 || files.length >= TREE_CAP) {
      complete = false
      return
    }
    let pageToken = ''
    do {
      const page = await listDriveFolderPage(folderId, pageToken)
      for (const file of page.files ?? []) {
        if (seen.has(file.id)) continue
        seen.add(file.id)
        files.push(file)
        if (files.length >= TREE_CAP) {
          complete = false
          return
        }
        if (file.mimeType === DRIVE_FOLDER_MIME) await walk(file.id, depth + 1)
      }
      pageToken = page.nextPageToken ?? ''
    } while (pageToken)
  }

  await walk(assertDriveId(rootId), 0)
  return { files, complete }
}

export async function readDriveFileMeta(fileId: string): Promise<DriveListedFile | null> {
  if (!driveConfigured()) return null
  try {
    const { headers, keyQuery } = await driveAuthQuery()
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=id,name,mimeType${keyQuery}`,
      { headers },
    )
    if (!res.ok) return null
    return (await res.json()) as DriveListedFile
  } catch {
    return null
  }
}

/** Best-effort text for docs and plain files. Scans without text stay in review. */
export async function readDriveText(file: DriveListedFile): Promise<string | null> {
  if (!driveConfigured()) return null
  try {
    const { headers, keyQuery } = await driveAuthQuery()
    const googleDoc = file.mimeType.startsWith('application/vnd.google-apps.')
    const url = googleDoc
      ? `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}/export?mimeType=text/plain${keyQuery}`
      : `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}?alt=media${keyQuery}`
    const res = await fetch(url, { headers })
    if (!res.ok) return null
    const type = res.headers.get('content-type') || file.mimeType
    if (
      !googleDoc &&
      !type.includes('text') &&
      !type.includes('json') &&
      !type.includes('csv')
    ) {
      return null
    }
    const text = await res.text()
    return text.trim().slice(0, 8000) || null
  } catch {
    return null
  }
}

function writeDenied(status: number, message: string): Error {
  if (status === 401 || status === 403) {
    return new Error(
      'התיקייה משותפת לקריאה בלבד. כדי לכתוב חזרה לדרייב צריך לשתף אותה עם חשבון השירות כעורך.',
    )
  }
  return new Error(message || 'גוגל דרייב דחה את הכתיבה')
}

async function driveWriteHeaders(): Promise<Headers> {
  const token = await serviceAccountToken()
  if (!token) {
    throw new Error(
      'כתיבה לדרייב דורשת חשבון שירות. קריאה מהתיקייה עדיין אפשרית עם מפתח API.',
    )
  }
  const headers = new Headers()
  headers.set('authorization', `Bearer ${token}`)
  return headers
}

export async function createDriveFolder(
  parentId: string,
  name: string,
): Promise<DriveListedFile> {
  const headers = await driveWriteHeaders()
  headers.set('content-type', 'application/json')
  const res = await fetch(
    'https://www.googleapis.com/drive/v3/files?fields=id,name,mimeType,modifiedTime,parents',
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name,
        mimeType: DRIVE_FOLDER_MIME,
        parents: [assertDriveId(parentId)],
      }),
    },
  )
  const json = (await res.json()) as DriveListedFile & { error?: { message?: string } }
  if (!res.ok) throw writeDenied(res.status, json.error?.message ?? '')
  return json
}

export async function writeDriveTextFile(input: {
  parentId: string
  name: string
  text: string
  fileId?: string | null
  appProperties: Record<string, string>
}): Promise<DriveListedFile> {
  const headers = await driveWriteHeaders()
  const boundary = `maintainos_${Date.now()}`
  const meta = input.fileId
    ? {
        name: input.name,
        mimeType: 'text/plain',
        appProperties: input.appProperties,
      }
    : {
        name: input.name,
        mimeType: 'text/plain',
        parents: [assertDriveId(input.parentId)],
        appProperties: input.appProperties,
      }
  const body = [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify(meta),
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    '',
    input.text,
    `--${boundary}--`,
    '',
  ].join('\r\n')
  headers.set('content-type', `multipart/related; boundary=${boundary}`)
  const fileId = input.fileId ? assertDriveId(input.fileId) : ''
  const url = fileId
    ? `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart&fields=id,name,mimeType,modifiedTime,parents,appProperties`
    : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,modifiedTime,parents,appProperties'
  const res = await fetch(url, {
    method: fileId ? 'PATCH' : 'POST',
    headers,
    body,
  })
  const json = (await res.json()) as DriveListedFile & { error?: { message?: string } }
  if (!res.ok) throw writeDenied(res.status, json.error?.message ?? '')
  return json
}
