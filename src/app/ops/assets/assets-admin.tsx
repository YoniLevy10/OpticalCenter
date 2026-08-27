'use client'

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Plus, QrCode, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, Input, Select, SearchField } from '@/components/ui/input'
import {
  EmptyState,
  ErrorState,
  Notice,
  Panel,
} from '@/components/ui/primitives'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { Modal } from '@/components/ui/overlay'
import { assetWhatsAppPrefill } from '@/modules/assets/service'
import { cn } from '@/lib/utils'

type StoreOpt = { id: string; code: string; name: string }

type AssetStatus = 'ok' | 'in_service' | 'disabled'

type AssetRow = {
  id: string
  store_id: string
  code: string
  name: string
  asset_type: string
  status?: AssetStatus
  store_code?: string
  store_name?: string
}

export type AssetTicketHint = {
  id: string
  store_id: string
  asset_id?: string | null
  status: string
  title: string | null
  description: string
  created_at: string
  display_number: string | null
  number: number | null
}

const TYPES = [
  { value: 'hvac', label: 'מיזוג' },
  { value: 'electrical', label: 'חשמל' },
  { value: 'optical', label: 'ציוד אופטי' },
  { value: 'other', label: 'אחר' },
]

const STATUS_LABELS: Record<AssetStatus, string> = {
  ok: 'תקין',
  in_service: 'בטיפול',
  disabled: 'מושבת',
}

function isOpenTicket(status: string) {
  return status !== 'closed' && status !== 'cancelled' && status !== 'resolved'
}

function relatedTickets(asset: AssetRow, tickets: AssetTicketHint[]) {
  const code = asset.code.toUpperCase()
  return tickets
    .filter((t) => {
      if (t.asset_id && t.asset_id === asset.id) return true
      if (t.store_id !== asset.store_id) return false
      const hay = `${t.title ?? ''} ${t.description}`.toUpperCase()
      return hay.includes(code)
    })
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
}

function deriveStatus(
  asset: AssetRow,
  tickets: AssetTicketHint[],
): AssetStatus {
  if (asset.status === 'disabled') return 'disabled'
  const open = relatedTickets(asset, tickets).some((t) => isOpenTicket(t.status))
  if (open || asset.status === 'in_service') return 'in_service'
  return 'ok'
}

function statusTone(status: AssetStatus) {
  if (status === 'ok') return 'text-[var(--signal-resolved)]'
  if (status === 'in_service') return 'text-[var(--signal-warning)]'
  return 'text-ink-3'
}

function statusDot(status: AssetStatus) {
  if (status === 'ok') return 'bg-[var(--signal-resolved)]'
  if (status === 'in_service') return 'bg-[var(--signal-warning)]'
  return 'bg-ink-3'
}

function ticketLabel(t: AssetTicketHint) {
  return (
    t.display_number ??
    (t.number != null ? `OC-${t.number}` : t.id.slice(0, 8))
  )
}

export function AssetsAdmin({
  stores,
  tickets = [],
}: {
  stores: StoreOpt[]
  tickets?: AssetTicketHint[]
}) {
  const [assets, setAssets] = useState<AssetRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [qrAsset, setQrAsset] = useState<AssetRow | null>(null)

  const [storeId, setStoreId] = useState(stores[0]?.id ?? '')
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [assetType, setAssetType] = useState('hvac')

  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState<'' | AssetStatus>('')
  const [filterStore, setFilterStore] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const qs = filterStore ? `?store=${encodeURIComponent(filterStore)}` : ''
      const res = await fetch(`/api/assets${qs}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'טעינה נכשלה')
      setAssets(json.assets ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'טעינה נכשלה')
    } finally {
      setLoading(false)
    }
  }, [filterStore])

  useEffect(() => {
    void load()
  }, [load])

  const enriched = useMemo(() => {
    return assets.map((a) => {
      const related = relatedTickets(a, tickets)
      const status = deriveStatus(a, tickets)
      const last = related[0] ?? null
      const treated = related.filter((t) => !isOpenTicket(t.status)).length
      const open = related.filter((t) => isOpenTicket(t.status)).length
      return { asset: a, status, last, treated, open, related }
    })
  }, [assets, tickets])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return enriched.filter(({ asset, status }) => {
      if (statusFilter && status !== statusFilter) return false
      if (!needle) return true
      const hay =
        `${asset.name} ${asset.code} ${asset.store_code ?? ''} ${asset.store_name ?? ''}`.toLowerCase()
      return hay.includes(needle)
    })
  }, [enriched, q, statusFilter])

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setNotice(null)
    setError(null)
    try {
      const res = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_id: storeId,
          code,
          name,
          asset_type: assetType,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'יצירה נכשלה')
      setCode('')
      setName('')
      setNotice('הנכס נוסף')
      setCreateOpen(false)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'יצירה נכשלה')
    } finally {
      setBusy(false)
    }
  }

  async function onDelete(id: string) {
    if (!confirm('למחוק נכס זה?')) return
    setBusy(true)
    try {
      const res = await fetch(`/api/assets/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'מחיקה נכשלה')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'מחיקה נכשלה')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? <ErrorState title="שגיאה" description={error} /> : null}
      {notice ? <Notice tone="progress">{notice}</Notice> : null}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:flex-1">
          <SearchField
            value={q}
            onValueChange={setQ}
            placeholder="חיפוש לפי שם · סידורי · סניף"
            autoFocusKey="/"
            className="w-full sm:min-w-[16rem] sm:flex-1"
          />
          <Field label="סטטוס" htmlFor="asset-status-filter">
            <Select
              id="asset-status-filter"
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as '' | AssetStatus)
              }
              className="min-w-[8.5rem]"
            >
              <option value="">הכל</option>
              <option value="ok">תקין</option>
              <option value="in_service">בטיפול</option>
              <option value="disabled">מושבת</option>
            </Select>
          </Field>
          <Field label="סניף" htmlFor="filter-store">
            <Select
              id="filter-store"
              value={filterStore}
              onChange={(e) => setFilterStore(e.target.value)}
              className="min-w-[11rem]"
            >
              <option value="">כל הסניפים</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} · {s.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Button
          type="button"
          variant="primary"
          size="touch"
          className="md:h-9 md:px-3.5"
          onClick={() => setCreateOpen(true)}
          disabled={!stores.length}
        >
          <Plus className="h-4 w-4" aria-hidden />
          הוספת נכס
        </Button>
      </div>

      <p className="t-meta t-num text-ink-3">{filtered.length} נכסים</p>

      <Panel flush elevated className="overflow-hidden">
        {loading ? (
          <p className="t-body px-4 py-8 text-ink-2">טוען…</p>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="אין נכסים"
            description="הוסיפו יחידת מיזוג או ציוד אופטי לפי סניף."
            icon={Package}
          />
        ) : (
          <>
            {/* Mobile cards */}
            <div className="divide-y divide-border md:hidden">
              {filtered.map(({ asset: a, status, last, treated, open }) => (
                <article key={a.id} className="flex flex-col gap-2 px-4 py-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="t-caption t-num text-ink-3">
                        #{a.store_code ?? '—'} · {a.code}
                      </p>
                      <h3 className="t-body-strong text-ink">{a.name}</h3>
                      <p className="t-meta text-ink-2">
                        {TYPES.find((t) => t.value === a.asset_type)?.label ??
                          a.asset_type}
                        {a.store_name ? ` · ${a.store_name}` : ''}
                      </p>
                    </div>
                    <span
                      className={cn(
                        't-caption inline-flex shrink-0 items-center gap-1.5',
                        statusTone(status),
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn('h-1.5 w-1.5 rounded-full', statusDot(status))}
                      />
                      {STATUS_LABELS[status]}
                    </span>
                  </div>
                  <div className="rounded-[var(--radius-md)] bg-surface-sunken/50 px-3 py-2">
                    <p className="t-caption text-ink-3">תקלה אחרונה</p>
                    <p className="t-body mt-0.5 line-clamp-2 text-ink-2">
                      {last
                        ? `${ticketLabel(last)} · ${last.title || last.description}`
                        : 'אין היסטוריה'}
                    </p>
                    <p className="t-meta mt-1 text-ink-3">
                      בטיפול: {open} · טופלו: {treated}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      aria-label={`QR לנכס ${a.code}`}
                      onClick={() => setQrAsset(a)}
                    >
                      <QrCode className="h-3.5 w-3.5" aria-hidden />
                      QR
                    </Button>
                    <Button asChild variant="ghost" size="sm">
                      <Link
                        href={`/ops/tickets?q=${encodeURIComponent(a.code)}`}
                      >
                        תקלות
                      </Link>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={busy}
                      className="text-[var(--signal-critical)]"
                      onClick={() => void onDelete(a.id)}
                    >
                      מחיקה
                    </Button>
                  </div>
                </article>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <Table>
                <THead>
                  <TH>שם</TH>
                  <TH className="w-[100px]">סידורי</TH>
                  <TH>סניף</TH>
                  <TH className="w-[100px]">סטטוס</TH>
                  <TH>תקלה אחרונה</TH>
                  <TH className="w-[110px]">היסטוריה</TH>
                  <TH className="w-[160px]" align="end">
                    פעולות
                  </TH>
                </THead>
                <TBody>
                  {filtered.map(({ asset: a, status, last, treated, open }) => (
                    <TR key={a.id}>
                      <TD>
                        <span className="t-body-strong text-ink">{a.name}</span>
                        <span className="t-caption mt-0.5 block text-ink-3">
                          {TYPES.find((t) => t.value === a.asset_type)?.label ??
                            a.asset_type}
                        </span>
                      </TD>
                      <TD>
                        <span className="t-body-strong t-num text-ink">
                          {a.code}
                        </span>
                      </TD>
                      <TD>
                        <span className="t-body text-ink">
                          {a.store_code ?? '—'}
                          {a.store_name ? ` · ${a.store_name}` : ''}
                        </span>
                      </TD>
                      <TD>
                        <span
                          className={cn(
                            't-caption inline-flex items-center gap-1.5',
                            statusTone(status),
                          )}
                        >
                          <span
                            aria-hidden
                            className={cn(
                              'h-1.5 w-1.5 rounded-full',
                              statusDot(status),
                            )}
                          />
                          {STATUS_LABELS[status]}
                        </span>
                      </TD>
                      <TD>
                        {last ? (
                          <Link
                            href={`/ops/tickets/${last.id}`}
                            className="t-body line-clamp-1 text-ink-2 underline-offset-2 hover:underline"
                          >
                            {ticketLabel(last)} · {last.title || last.description}
                          </Link>
                        ) : (
                          <span className="t-caption text-ink-3">—</span>
                        )}
                      </TD>
                      <TD>
                        <span className="t-caption t-num text-ink-2">
                          {open}/{treated}
                        </span>
                      </TD>
                      <TD align="end">
                        <div className="flex justify-end gap-1">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            aria-label={`QR לנכס ${a.code}`}
                            onClick={() => setQrAsset(a)}
                          >
                            <QrCode className="h-3.5 w-3.5" aria-hidden />
                            QR
                          </Button>
                          <Button asChild variant="ghost" size="sm">
                            <Link
                              href={`/ops/tickets?q=${encodeURIComponent(a.code)}`}
                            >
                              תקלות
                            </Link>
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={busy}
                            className="text-[var(--signal-critical)]"
                            onClick={() => void onDelete(a.id)}
                          >
                            מחיקה
                          </Button>
                        </div>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
          </>
        )}
      </Panel>

      <Modal
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="הוספת נכס"
        description="ציוד לפי סניף — יופיע בטופס דיווח."
      >
        <form onSubmit={onCreate} className="space-y-3">
          <Field label="סניף" htmlFor="asset-store">
            <Select
              id="asset-store"
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
              required
            >
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} · {s.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="קוד / סידורי" htmlFor="asset-code">
            <Input
              id="asset-code"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="AC-04"
              dir="ltr"
            />
          </Field>
          <Field label="שם" htmlFor="asset-name">
            <Input
              id="asset-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="יחידת מיזוג"
            />
          </Field>
          <Field label="סוג" htmlFor="asset-type">
            <Select
              id="asset-type"
              value={assetType}
              onChange={(e) => setAssetType(e.target.value)}
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setCreateOpen(false)}
            >
              ביטול
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={busy || !storeId}
            >
              {busy ? 'שומר…' : 'הוספה'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(qrAsset)}
        onOpenChange={(open) => {
          if (!open) setQrAsset(null)
        }}
        title={qrAsset ? `QR · ${qrAsset.code}` : 'QR'}
        description={
          qrAsset
            ? `${qrAsset.name}${qrAsset.store_code ? ` · סניף ${qrAsset.store_code}` : ''}`
            : undefined
        }
      >
        {qrAsset?.store_code ? (
          <div className="flex flex-col items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/stores/qr?code=${encodeURIComponent(qrAsset.store_code)}&asset=${encodeURIComponent(qrAsset.code)}&format=svg`}
              alt={`QR לנכס ${qrAsset.code} בסניף ${qrAsset.store_code}`}
              className="h-44 w-44 rounded-[var(--radius-md)] border border-border bg-surface p-2"
            />
            <p
              dir="ltr"
              className="t-caption t-num rounded-[var(--radius-sm)] bg-sunken px-2 py-1 text-ink-2"
            >
              {assetWhatsAppPrefill(qrAsset.store_code, qrAsset.code)}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild variant="secondary" size="sm">
                <a
                  href={`/api/stores/qr?code=${encodeURIComponent(qrAsset.store_code)}&asset=${encodeURIComponent(qrAsset.code)}&format=svg`}
                  download={`asset-${qrAsset.store_code}-${qrAsset.code}-qr.svg`}
                >
                  הורדת SVG
                </a>
              </Button>
              <Button asChild variant="secondary" size="sm">
                <a
                  href={`/api/stores/qr?code=${encodeURIComponent(qrAsset.store_code)}&asset=${encodeURIComponent(qrAsset.code)}&format=png`}
                  download={`asset-${qrAsset.store_code}-${qrAsset.code}-qr.png`}
                >
                  הורדת PNG
                </a>
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
