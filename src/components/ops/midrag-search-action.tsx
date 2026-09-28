'use client'

import { useMemo, useState } from 'react'
import { ExternalLink, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { BottomSheet } from '@/components/ui/overlay'
import {
  TICKET_CATEGORIES,
  TICKET_CATEGORY_LABELS_HE,
  type TicketCategory,
} from '@/modules/tickets/constants'
import {
  buildMidragCityPickerUrl,
  buildMidragGoogleBackupUrl,
  buildMidragSearchUrl,
  externalSearchCaption,
  midragCityMatchForCity,
  midragServiceMatchForCategory,
} from '@/modules/vendors/external-search'
import { cn } from '@/lib/utils'

function normalizeCategory(raw: string | null | undefined): TicketCategory {
  const key = (raw ?? 'other').trim().toLowerCase()
  return (TICKET_CATEGORIES as readonly string[]).includes(key)
    ? (key as TicketCategory)
    : 'other'
}

/**
 * In-app Midrag professional search — pick trade + city, then open Midrag
 * results in a new tab (no iframe; Midrag blocks embedding).
 */
export function MidragSearchAction({
  category,
  city,
  compact = false,
  className,
  open: openProp,
  onOpenChange,
  hideTrigger = false,
}: {
  category: string
  city?: string | null
  /** Smaller control for queue row actions */
  compact?: boolean
  className?: string
  /** Controlled sheet (e.g. swipe action opens search) */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  hideTrigger?: boolean
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const open = openProp ?? uncontrolledOpen
  const setOpen = onOpenChange ?? setUncontrolledOpen
  const [draftCategory, setDraftCategory] = useState(() =>
    normalizeCategory(category),
  )
  const [draftCity, setDraftCity] = useState(() => (city ?? '').trim())

  const searchInput = useMemo(
    () => ({
      category: draftCategory,
      city: draftCity.trim() || null,
    }),
    [draftCategory, draftCity],
  )

  const midragUrl = buildMidragSearchUrl(searchInput)
  const midragCityUrl = buildMidragCityPickerUrl(searchInput)
  const googleBackupUrl = buildMidragGoogleBackupUrl(searchInput)
  const caption = externalSearchCaption(searchInput)
  const cityMatch = midragCityMatchForCity(searchInput.city)
  const serviceMatch = midragServiceMatchForCategory(searchInput.category)

  function openSheet() {
    setDraftCategory(normalizeCategory(category))
    setDraftCity((city ?? '').trim())
    setOpen(true)
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
          if (next) {
            setDraftCategory(normalizeCategory(category))
            setDraftCity((city ?? '').trim())
          }
          setOpen(next)
        }}
        title="חיפוש איש מקצוע במידרג"
        detent="half"
      >
        <div className="flex flex-col gap-4">
          <p className="t-meta text-ink-2">
            בוחרים מקצוע ועיר לפי הסניף של התקלה — התוצאות נפתחות במידרג
            בעיר המדויקת, בחלון חדש.
          </p>

          <label className="flex flex-col gap-1.5">
            <span className="t-caption text-ink-2">סוג תקלה / מקצוע</span>
            <select
              className="t-control min-h-[var(--tap)] rounded-[var(--radius-md)] border border-border bg-surface px-3 text-ink"
              value={draftCategory}
              onChange={(e) =>
                setDraftCategory(normalizeCategory(e.target.value))
              }
            >
              {TICKET_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {TICKET_CATEGORY_LABELS_HE[c]}
                </option>
              ))}
            </select>
            {serviceMatch ? (
              <span className="t-caption text-ink-3">
                ממופה למידרג: {serviceMatch.midragLabel}
              </span>
            ) : (
              <span className="t-caption text-amber-700">
                אין מקצוע ממופה — ייפתח בוחר תחום במידרג
              </span>
            )}
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="t-caption text-ink-2">עיר הסניף</span>
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
            ) : draftCity.trim() ? (
              <span className="t-caption text-amber-700">
                העיר לא ממופה — ייפתח בוחר עיר במידרג
              </span>
            ) : null}
          </label>

          <p className="t-caption text-ink-3">{caption}</p>

          <Button asChild variant="primary" size="touch" className="w-full">
            <a href={midragUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" aria-hidden />
              פתח תוצאות במידרג
              {serviceMatch ? ` · ${serviceMatch.midragLabel}` : ''}
              {cityMatch ? ` · ${cityMatch.midragLabel}` : ''}
            </a>
          </Button>

          <div className="flex flex-col gap-2 sm:flex-row">
            {midragCityUrl ? (
              <Button asChild variant="secondary" size="touch" className="flex-1">
                <a
                  href={midragCityUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  בחירת עיר במידרג
                </a>
              </Button>
            ) : null}
            <Button asChild variant="ghost" size="touch" className="flex-1">
              <a
                href={googleBackupUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                גיבוי · Google
              </a>
            </Button>
          </div>
        </div>
      </BottomSheet>
    </div>
  )
}
