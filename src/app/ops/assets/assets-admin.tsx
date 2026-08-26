'use client'

import { FormEvent, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Field, Input, Select } from '@/components/ui/input'
import { Modal } from '@/components/ui/overlay'
import { RowList } from '@/components/ui/operational-row'
import {
  EmptyState,
  ErrorState,
  Notice,
  Panel,
  PanelHeader,
} from '@/components/ui/primitives'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { assetWhatsAppPrefill } from '@/modules/assets/service'

type StoreOpt = { id: string; code: string; name: string }
type AssetRow = {
  id: string
  store_id: string
  code: string
  name: string
  asset_type: string
  store_code?: string
  store_name?: string
}

const TYPES = [
  { value: 'hvac', label: 'מיזוג' },
  { value: 'electrical', label: 'חשמל' },
  { value: 'optical', label: 'ציוד אופטי' },
  { value: 'other', label: 'אחר' },
]

export function AssetsAdmin({ stores }: { stores: StoreOpt[] }) {
  const [assets, setAssets] = useState<AssetRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [storeId, setStoreId] = useState(stores[0]?.id ?? '')
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [assetType, setAssetType] = useState('hvac')
  const [filterStore, setFilterStore] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<AssetRow | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const q = filterStore ? `?store=${encodeURIComponent(filterStore)}` : ''
      const res = await fetch(`/api/assets${q}`)
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
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'יצירה נכשלה')
    } finally {
      setBusy(false)
    }
  }

  async function onDelete(id: string) {
    setBusy(true)
    try {
      const res = await fetch(`/api/assets/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'מחיקה נכשלה')
      setDeleteTarget(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'מחיקה נכשלה')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      {error ? <ErrorState title="שגיאה" description={error} /> : null}
      {notice ? <Notice tone="progress">{notice}</Notice> : null}

      <Panel flush className="overflow-hidden">
        <PanelHeader title="הוספת נכס" meta="לפי חנות" />
        <form onSubmit={onCreate} className="grid gap-3 p-4 md:grid-cols-4">
          <Field label="חנות" htmlFor="asset-store">
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
          <Field label="קוד" htmlFor="asset-code">
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
          <div className="md:col-span-4">
            <Button type="submit" variant="primary" disabled={busy || !storeId}>
              {busy ? 'שומר…' : 'הוספה'}
            </Button>
          </div>
        </form>
      </Panel>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Field label="סינון חנות" htmlFor="filter-store">
          <Select
            id="filter-store"
            value={filterStore}
            onChange={(e) => setFilterStore(e.target.value)}
            className="min-w-[12rem]"
          >
            <option value="">כל החנויות</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.code} · {s.name}
              </option>
            ))}
          </Select>
        </Field>
        <p className="t-meta t-num text-ink-3">{assets.length} נכסים</p>
      </div>

      <Panel flush className="overflow-hidden">
        <PanelHeader title="נכסים" />
        {loading ? (
          <p className="t-body px-4 py-8 text-ink-2">טוען…</p>
        ) : assets.length === 0 ? (
          <EmptyState
            title="אין נכסים"
            description="הוסיפו יחידת מיזוג או ציוד אופטי לפי חנות."
          />
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <Table>
                <THead>
                  <TH>חנות</TH>
                  <TH>קוד</TH>
                  <TH>שם</TH>
                  <TH>סוג</TH>
                  <TH>טקסט QR</TH>
                  <TH align="end">פעולות</TH>
                </THead>
                <TBody>
                  {assets.map((a) => (
                    <TR key={a.id}>
                      <TD>
                        <span className="t-body text-ink">
                          {a.store_code ?? '—'} · {a.store_name ?? ''}
                        </span>
                      </TD>
                      <TD>
                        <span className="t-body-strong t-num text-ink">{a.code}</span>
                      </TD>
                      <TD>
                        <span className="t-body text-ink">{a.name}</span>
                      </TD>
                      <TD>
                        <span className="t-caption text-ink-2">
                          {TYPES.find((t) => t.value === a.asset_type)?.label ??
                            a.asset_type}
                        </span>
                      </TD>
                      <TD>
                        <span
                          dir="ltr"
                          className="t-caption t-num rounded-[var(--radius-sm)] bg-sunken px-1.5 py-0.5 text-ink-2"
                        >
                          {a.store_code
                            ? assetWhatsAppPrefill(a.store_code, a.code)
                            : '—'}
                        </span>
                      </TD>
                      <TD align="end">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/ops/tickets?q=${encodeURIComponent(a.code)}`}
                            className="t-caption text-ink-2 underline-offset-2 hover:underline"
                          >
                            תקלות
                          </Link>
                          <button
                            type="button"
                            className="t-caption min-h-[var(--tap)] text-[var(--signal-critical)]"
                            disabled={busy}
                            onClick={() => setDeleteTarget(a)}
                          >
                            מחיקה
                          </button>
                        </div>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>

            <div className="md:hidden">
              <RowList>
                {assets.map((a) => (
                  <div
                    key={a.id}
                    className="flex min-h-[var(--tap)] flex-col gap-2 px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="t-body-strong text-ink">
                          {a.name}
                          <span className="t-num ms-2 text-ink-3">{a.code}</span>
                        </p>
                        <p className="t-meta text-ink-2">
                          {a.store_code ?? '—'} ·{' '}
                          {TYPES.find((t) => t.value === a.asset_type)?.label ??
                            a.asset_type}
                        </p>
                      </div>
                      <Link
                        href={`/ops/tickets?q=${encodeURIComponent(a.code)}`}
                        className="t-caption shrink-0 text-ink-2 underline-offset-2 hover:underline"
                      >
                        תקלות
                      </Link>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="self-start text-[var(--signal-critical)]"
                      disabled={busy}
                      onClick={() => setDeleteTarget(a)}
                    >
                      מחיקה
                    </Button>
                  </div>
                ))}
              </RowList>
            </div>
          </>
        )}
      </Panel>

      <Modal
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="מחיקת נכס"
        description={
          deleteTarget
            ? `למחוק את ${deleteTarget.name} (${deleteTarget.code})?`
            : undefined
        }
      >
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="primary"
            disabled={busy || !deleteTarget}
            onClick={() => deleteTarget && void onDelete(deleteTarget.id)}
          >
            {busy ? 'מוחק…' : 'מחיקה'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={() => setDeleteTarget(null)}
          >
            ביטול
          </Button>
        </div>
      </Modal>
    </div>
  )
}
