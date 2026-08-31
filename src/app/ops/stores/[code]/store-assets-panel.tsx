'use client'

import { FormEvent, useCallback, useEffect, useState } from 'react'
import { ScanBarcode } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, Input, Select } from '@/components/ui/input'
import {
  EmptyState,
  ErrorState,
  Notice,
  Panel,
  PanelHeader,
} from '@/components/ui/primitives'
import { AdminRow, AdminRowList } from '@/components/ui/admin-row'
import { BarcodeScannerModal } from '@/components/assets/barcode-scanner'
import { findAssetByCode } from '@/modules/assets/barcode'
import { assetWhatsAppPrefill } from '@/modules/assets/service'

type AssetRow = {
  id: string
  code: string
  name: string
  asset_type: string
  barcode?: string | null
}

export function StoreAssetsPanel({
  storeId,
  storeCode,
}: {
  storeId: string
  storeCode: string
}) {
  const [assets, setAssets] = useState<AssetRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [barcode, setBarcode] = useState('')
  const [name, setName] = useState('')
  const [assetType, setAssetType] = useState('hvac')
  const [scanOpen, setScanOpen] = useState(false)
  const [scanTarget, setScanTarget] = useState<'lookup' | 'create'>('lookup')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/assets?store=${encodeURIComponent(storeId)}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'טעינה נכשלה')
      setAssets(json.assets ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'טעינה נכשלה')
    } finally {
      setLoading(false)
    }
  }, [storeId])

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
          barcode: barcode.trim() || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'יצירה נכשלה')
      setCode('')
      setBarcode('')
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
    if (!confirm('למחוק נכס זה?')) return
    setBusy(true)
    try {
      const res = await fetch(`/api/assets/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'מחיקה נכשלה')
      }
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'מחיקה נכשלה')
    } finally {
      setBusy(false)
    }
  }

  function onScan(raw: string) {
    if (!raw.trim()) return

    if (scanTarget === 'create') {
      setBarcode(raw)
      if (!code.trim()) setCode(raw.slice(0, 32))
      setNotice(`ברקוד נסרק · ${raw}`)
      return
    }

    const match = findAssetByCode(assets, raw)
    if (match) {
      setNotice(`נמצא · ${match.code} — ${match.name}`)
      return
    }

    setBarcode(raw)
    setCode(raw.slice(0, 32))
    setNotice(`לא נמצא — הברקוד מולא בטופס הוספה`)
  }

  return (
    <Panel flush className="overflow-hidden">
      <PanelHeader title="נכסים בחנות" meta={`#${storeCode}`} />
      <div className="space-y-4 p-4">
        {error ? <ErrorState title="שגיאה" description={error} /> : null}
        {notice ? <Notice tone="progress">{notice}</Notice> : null}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              setScanTarget('lookup')
              setScanOpen(true)
            }}
          >
            <ScanBarcode className="h-4 w-4" aria-hidden />
            סריקת ברקוד
          </Button>
        </div>

        <form onSubmit={onCreate} className="grid gap-3 md:grid-cols-2">
          <Field label="קוד פנימי" htmlFor="asset-code">
            <Input
              id="asset-code"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="HVAC-1"
              dir="ltr"
            />
          </Field>
          <Field label="ברקוד מוצר" htmlFor="asset-barcode">
            <div className="flex gap-2">
              <Input
                id="asset-barcode"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="EAN / Code128"
                dir="ltr"
                className="flex-1"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="shrink-0"
                aria-label="סריקת ברקוד"
                onClick={() => {
                  setScanTarget('create')
                  setScanOpen(true)
                }}
              >
                <ScanBarcode className="h-4 w-4" aria-hidden />
              </Button>
            </div>
          </Field>
          <Field label="שם" htmlFor="asset-name">
            <Input
              id="asset-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="מזגן קדמי"
            />
          </Field>
          <Field label="סוג" htmlFor="asset-type">
            <Select
              id="asset-type"
              value={assetType}
              onChange={(e) => setAssetType(e.target.value)}
            >
              <option value="hvac">מיזוג</option>
              <option value="electrical">חשמל</option>
              <option value="optical">ציוד אופטי</option>
              <option value="other">אחר</option>
            </Select>
          </Field>
          <div className="md:col-span-2">
            <Button type="submit" variant="secondary" size="sm" disabled={busy}>
              {busy ? 'שומר…' : 'הוספת נכס'}
            </Button>
          </div>
        </form>

        {loading ? (
          <p className="t-body text-ink-2">טוען…</p>
        ) : assets.length === 0 ? (
          <EmptyState title="אין נכסים" description="הוסיפו ציוד לחנות — יופיע בטופס דיווח." />
        ) : (
          <>
            <AdminRowList className="md:hidden">
              {assets.map((a) => (
                <AdminRow
                  key={a.id}
                  title={`${a.code} · ${a.name}`}
                  subtitle={
                    a.barcode
                      ? `${a.barcode} · ${assetWhatsAppPrefill(storeCode, a.code)}`
                      : assetWhatsAppPrefill(storeCode, a.code)
                  }
                  trailing={
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={busy}
                      onClick={() => void onDelete(a.id)}
                    >
                      מחיקה
                    </Button>
                  }
                />
              ))}
            </AdminRowList>
            <ul className="hidden divide-y divide-border md:block">
              {assets.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 py-2">
                  <div>
                    <span className="t-body-strong t-num text-ink">{a.code}</span>
                    <span className="t-body ms-2 text-ink-2">{a.name}</span>
                    {a.barcode ? (
                      <p className="t-caption t-num text-ink-3" dir="ltr">
                        barcode {a.barcode}
                      </p>
                    ) : null}
                    <p className="t-caption t-num text-ink-3" dir="ltr">
                      {assetWhatsAppPrefill(storeCode, a.code)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    onClick={() => void onDelete(a.id)}
                  >
                    מחיקה
                  </Button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <BarcodeScannerModal
        open={scanOpen}
        onOpenChange={setScanOpen}
        onScan={onScan}
        title={
          scanTarget === 'create' ? 'סריקת ברקוד לנכס חדש' : 'סריקת ברקוד בחנות'
        }
        description={
          scanTarget === 'create'
            ? 'הברקוד ייכנס לשדה ברקוד המוצר.'
            : 'חיפוש נכס קיים בחנות לפי ברקוד / קוד.'
        }
      />
    </Panel>
  )
}
