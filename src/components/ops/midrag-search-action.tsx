'use client'

import { useMemo, useState } from 'react'
import { ExternalLink, Phone, Search, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { BottomSheet } from '@/components/ui/overlay'
import { useToast } from '@/components/ui/toast'
import {
  buildMidragResultsUrl,
  midragCityMatchForCity,
} from '@/modules/vendors/external-search'
import {
  filterSectorsByQuery,
  midragSectorForTicketCategory,
  midragSectorsForSelect,
  type MidragSector,
} from '@/modules/vendors/midrag/catalog'
import { cn } from '@/lib/utils'

/**
 * Midrag professional search — full profession catalog (149) + city,
 * then open Midrag in a new tab. Also save contact to ranked book.
 */
export function MidragSearchAction({
  category,
  city,
  compact = false,
  className,
  open: openProp,
  onOpenChange,
  hideTrigger = false,
  onSaved,
}: {
  category: string
  city?: string | null
  compact?: boolean
  className?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
  hideTrigger?: boolean
  /** Called after a professional is saved to the contact book. */
  onSaved?: () => void
}) {
  const toast = useToast()
  const allSectors = useMemo(() => midragSectorsForSelect(), [])
  const defaultSector = useMemo(
    () => midragSectorForTicketCategory(category) ?? allSectors[0] ?? null,
    [category, allSectors],
  )

  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const open = openProp ?? uncontrolledOpen
  const setOpen = onOpenChange ?? setUncontrolledOpen
  const [sectorQuery, setSectorQuery] = useState('')
  const [selected, setSelected] = useState<MidragSector | null>(defaultSector)
  const [draftCity, setDraftCity] = useState(() => (city ?? '').trim())
  const [saveName, setSaveName] = useState('')
  const [savePhone, setSavePhone] = useState('')
  const [saving, setSaving] = useState(false)

  const filtered = useMemo(
    () => filterSectorsByQuery(sectorQuery, allSectors),
    [sectorQuery, allSectors],
  )

  const cityMatch = midragCityMatchForCity(draftCity)
  const midragUrl = buildMidragResultsUrl({
    serviceId: selected?.serviceId,
    sectorId: selected?.sectorId,
    city: draftCity.trim() || null,
  })

  function openSheet() {
    setSelected(midragSectorForTicketCategory(category) ?? allSectors[0] ?? null)
    setDraftCity((city ?? '').trim())
    setSectorQuery('')
    setSaveName('')
    setSavePhone('')
    setOpen(true)
  }

  async function saveProfessional() {
    if (!saveName.trim()) {
      toast.push({ title: 'הזינו שם איש מקצוע', tone: 'critical' })
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/professionals', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          full_name: saveName.trim(),
          phone: savePhone.trim() || null,
          trade: selected?.label ?? null,
          midrag_sector_id: selected?.sectorId ?? null,
          midrag_service_id: selected?.serviceId ?? null,
          source: 'midrag',
          notes: draftCity.trim()
            ? `נשמר מחיפוש מידרג · ${draftCity.trim()}`
            : 'נשמר מחיפוש מידרג',
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'שמירה נכשלה')
      toast.push({ title: 'איש מקצוע נשמר בספר', tone: 'success' })
      setSaveName('')
      setSavePhone('')
      onSaved?.()
    } catch (e) {
      toast.push({
        title: e instanceof Error ? e.message : 'שמירה נכשלה',
        tone: 'critical',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={cn(className)}>
      {hideTrigger ? null : (
        <Button
          type="button"
          variant={compact ? 'ghost' : 'secondary'}
          size={compact ? 'sm' : 'touch'}
          className={cn(compact ? 'min-h-[var(--tap)] w-full' : 'w-full')}
          onClick={openSheet}
        >
          <Search className="h-3.5 w-3.5" aria-hidden />
          חיפוש במידרג
        </Button>
      )}

      <BottomSheet
        open={open}
        onOpenChange={(next) => {
          if (next) openSheet()
          else setOpen(false)
        }}
        title="חיפוש איש מקצוע במידרג"
        detent="full"
      >
        <div className="flex flex-col gap-4 pb-4">
          <p className="t-meta text-ink-2">
            כל מקצועות מידרג · בחרו תחום ועיר · שמרו אנשי קשר לדירוג מהיר בחזרה.
          </p>

          <label className="flex flex-col gap-1.5">
            <span className="t-caption text-ink-2">סינון מקצוע</span>
            <Input
              value={sectorQuery}
              onChange={(e) => setSectorQuery(e.target.value)}
              placeholder="חשמל, מזגן, מנעולן…"
              autoComplete="off"
            />
          </label>

          <div className="max-h-48 overflow-y-auto rounded-[var(--radius-lg)] border border-border bg-surface">
            <ul className="divide-y divide-border">
              {filtered.slice(0, 80).map((s) => {
                const active = selected?.sectorId === s.sectorId
                return (
                  <li key={s.sectorId}>
                    <button
                      type="button"
                      className={cn(
                        't-body flex min-h-[var(--tap)] w-full items-center px-3 text-start transition-colors',
                        active
                          ? 'bg-[var(--tenant-soft)] text-[var(--tenant)]'
                          : 'text-ink hover:bg-surface-sunken',
                      )}
                      onClick={() => setSelected(s)}
                    >
                      {s.label}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="t-caption text-ink-2">עיר</span>
            <Input
              value={draftCity}
              onChange={(e) => setDraftCity(e.target.value)}
              placeholder="למשל חיפה, אשדוד, נתניה"
              autoComplete="address-level2"
            />
            {cityMatch ? (
              <span className="t-caption text-ink-3">
                ממופה למידרג: {cityMatch.midragLabel}
              </span>
            ) : null}
          </label>

          <Button asChild variant="primary" size="touch" className="w-full">
            <a href={midragUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" aria-hidden />
              פתח במידרג
              {selected ? ` · ${selected.label}` : ''}
            </a>
          </Button>

          <div className="rounded-[var(--radius-lg)] border border-border bg-surface-sunken/60 p-3 space-y-3">
            <p className="t-body-strong text-ink flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-[var(--tenant)]" aria-hidden />
              שמירה לספר אנשי מקצוע
            </p>
            <p className="t-caption text-ink-2">
              מידרג לא משתף מספרים אוטומטית לאתר חיצוני. אחרי שמצאתם שם וטלפון
              במידרג — העתיקו לכאן ושמרו. בפעם הבאה: חיוג מהיר מהספר.
            </p>
            <Input
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="שם מלא"
              autoComplete="name"
            />
            <Input
              value={savePhone}
              onChange={(e) => setSavePhone(e.target.value)}
              placeholder="טלפון"
              inputMode="tel"
              autoComplete="tel"
              dir="ltr"
            />
            <Button
              type="button"
              variant="secondary"
              size="touch"
              className="w-full"
              disabled={saving}
              onClick={() => void saveProfessional()}
            >
              <Phone className="h-3.5 w-3.5" aria-hidden />
              {saving ? 'שומר…' : 'שמור לדירוג מהיר'}
            </Button>
          </div>
        </div>
      </BottomSheet>
    </div>
  )
}
