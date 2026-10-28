import rows from './branch-catalog.json'

export type BranchCatalogRow = {
  id: string
  fileId: string
  storeCode: string
  storeName: string
  kind: string
  expiry: string | null
  sourceUrl: string
  serial: string | null
  name: string
  summary: string
  status: 'ingested' | 'needs_review'
  reason: string | null
}

export const BRANCH_CATALOG = rows as BranchCatalogRow[]
