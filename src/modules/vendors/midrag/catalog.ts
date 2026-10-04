/**
 * Midrag catalog helpers — full ListSectors (149).
 * Data snapshotted from midrag.co.il (ported from Bino).
 */
import sectorsJson from './catalog-sectors.json'
import pinnedJson from './pinned-sector-ids.json'

export type MidragSector = {
  sectorId: number
  label: string
  /** Default Midrag Results serviceId from SectorPortal (null if unmapped) */
  serviceId: number | null
}

export const MIDRAG_SECTORS: MidragSector[] = sectorsJson as MidragSector[]
export const MIDRAG_PINNED_SECTOR_IDS: number[] = pinnedJson as number[]

const sectorById = new Map(MIDRAG_SECTORS.map((s) => [s.sectorId, s]))

/** Sectors ordered for UI: building/ops trades pinned first, then A–Z Hebrew. */
export function midragSectorsForSelect(): MidragSector[] {
  const pinned = new Set(MIDRAG_PINNED_SECTOR_IDS)
  const head = MIDRAG_PINNED_SECTOR_IDS.map((id) => sectorById.get(id)).filter(
    (s): s is MidragSector => Boolean(s),
  )
  const rest = MIDRAG_SECTORS.filter((s) => !pinned.has(s.sectorId)).sort(
    (a, b) => a.label.localeCompare(b.label, 'he'),
  )
  return [...head, ...rest]
}

export function midragSectorById(sectorId: number): MidragSector | null {
  return sectorById.get(sectorId) ?? null
}

export function filterSectorsByQuery(
  query: string,
  sectors: MidragSector[] = midragSectorsForSelect(),
): MidragSector[] {
  const q = query.trim().toLowerCase()
  if (!q) return sectors
  return sectors.filter((s) => s.label.toLowerCase().includes(q))
}

/** Map OC ticket category → Midrag sectorId when known. */
export const TICKET_CATEGORY_TO_SECTOR_ID: Record<string, number> = {
  hvac: 18,
  electrical: 5,
  plumbing: 4,
  it: 7,
  security: 146,
  cleaning: 25,
}

export function midragSectorForTicketCategory(
  category: string | null | undefined,
): MidragSector | null {
  const id = TICKET_CATEGORY_TO_SECTOR_ID[(category ?? '').trim().toLowerCase()]
  return id != null ? midragSectorById(id) : null
}
