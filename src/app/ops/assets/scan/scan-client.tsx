'use client'

import { FormEvent, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Package, Plus } from 'lucide-react'
import { BarcodeScannerModal } from '@/components/assets/barcode-scanner'
import { Button } from '@/components/ui/button'
import { Field, Input, Select } from '@/components/ui/input'
import {
  EmptyState,
  ErrorState,
  Notice,
  Panel,
} from '@/components/ui/primitives'
import { Modal } from '@/components/ui/overlay'
import {
  appendScanHistory,
  findAssetByCode,
  loadScanHistory,
  type ScanHistoryEntry,
} from '@/modules/assets/barcode'

type StoreOpt = { id: string; code: string; name: string }

type AssetRow = {
  id: string
  store_id: string
  code: string
  name: string
  asset_type: string
  barcode?: string | null
  store_code?: string
  store_name?: string
}

type LastResult =
  | { kind: 'found'; asset: AssetRow }
  | { kind: 'missing'; query: string }
  | null

export function AssetScanClient() {
  const [assets, setAssets] = useState<AssetRow[]>([])
  const [stores, setStores] = useState<StoreOpt[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [history, setHistory] = useState<ScanHistoryEntry[]>([])
  const [last, setLast] = useState<LastResult>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const [storeId, setStoreId] = useState('')
  const [code, setCode] = useState('')
  const [barcode, setBarcode] = useState('')
  const [name, setName] = useState('')
  const [assetType, setAssetType] = useState('hvac')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [assetsRes, storesRes] = await Promise.all([
        fetch('/api/assets'),
        fetch('/api/stores'),
      ])
      const assetsJson = await assetsRes.json()
      if (!assetsRes.ok) throw new Error(assetsJson.error || 'טעינת הציוד נכשלה')
      setAssets(assetsJson.assets ?? [])

      if (storesRes.ok) {
        const storesJson = await storesRes.json()
        const list: StoreOpt[] = (storesJson.stores ?? []).map(
          (s: { id: string; code: string; name: string }) => ({
            id: s.id,
            code: s.code,
            name: s.name,
          }),
        )
        setStores(list)
        setStoreId((prev) => prev || list[0]?.id || '')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'טעינה נכשלה')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
    setHistory(loadScanHistory())
  }, [load])

  const onScan = useCallback(
    (raw: string) => {
      if (!raw.trim()) return
      const match = findAssetByCode(assets, raw)
      const nextHistory = appendScanHistory({
        query: raw,
        at: Date.now(),
        success: Boolean(match),
        foundId: match?.id,
        foundName: match?.name,
      })
      setHistory(nextHistory)

      if (match) {
        setLast({ kind: 'found', asset: match as AssetRow })
        setNotice(`נמצא · ${match.code} — ${match.name}`)
        return
      }

      setLast({ kind: 'missing', query: raw })
      setBarcode(raw)
      setCode(raw.slice(0, 32))
      setNotice(`לא נמצא · ${raw}`)
    },
    [assets],
  )

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
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
      setCreateOpen(false)
      setName('')
      setNotice('הנכס נוסף')
      await load()
      if (json.asset) {
        setLast({ kind: 'found', asset: json.asset })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'יצירה נכשלה')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4">
      {error ? <ErrorState title="שגיאה" description={error} /> : null}
      {notice ? <Notice tone="progress">{notice}</Notice> : null}

      <Panel className="overflow-hidden p-4">
        <h2 className="t-body-strong text-ink">מצלמה רציפה</h2>
        <p className="t-meta mt-1 text-ink-3">
          סרקו ברקוד מוצר או תווית optical:asset. סריקות כפולות מסוננות.
        </p>
        <div className="mt-4">
          {loading ? (
            <p className="t-body text-ink-2">טוען ציוד…</p>
          ) : (
            <BarcodeScannerModal
              open
              continuous
              onOpenChange={() => undefined}
              onScan={onScan}
              title="סריקה"
            />
          )}
        </div>
      </Panel>

      {last?.kind === 'found' ? (
        <Panel className="p-4">
          <p className="t-caption text-ink-3">תוצאה</p>
          <h3 className="t-title mt-1 text-ink">{last.asset.name}</h3>
          <p className="t-body t-num mt-1 text-ink-2" dir="ltr">
            {last.asset.code}
            {last.asset.barcode ? ` · ${last.asset.barcode}` : ''}
          </p>
          <p className="t-meta mt-1 text-ink-3">
            {last.asset.store_code
              ? `סניף ${last.asset.store_code}${last.asset.store_name ? ` · ${last.asset.store_name}` : ''}`
              : 'סניף לא ידוע'}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button asChild variant="primary" size="sm">
              <Link href={`/ops/tickets?q=${encodeURIComponent(last.asset.code)}`}>
                תקלות לנכס
              </Link>
            </Button>
            <Button asChild variant="secondary" size="sm">
              <Link href="/ops/assets">רשימת ציוד</Link>
            </Button>
          </div>
        </Panel>
      ) : null}

      {last?.kind === 'missing' ? (
        <Panel className="p-4">
          <EmptyState
            title="הציוד לא נמצא"
            description={`אין התאמה ל־${last.query}`}
            icon={Package}
            action={
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => setCreateOpen(true)}
                disabled={!stores.length}
              >
                <Plus className="h-4 w-4" aria-hidden />
                הוספת נכס
              </Button>
            }
          />
        </Panel>
      ) : null}

      {history.length > 0 ? (
        <Panel className="p-4">
          <h3 className="t-caption text-ink-3">היסטוריית סריקה</h3>
          <ul className="mt-2 divide-y divide-border">
            {history.slice(0, 12).map((item) => (
              <li
                key={`${item.query}-${item.at}`}
                className="flex items-center justify-between gap-3 py-2"
              >
                <button
                  type="button"
                  className="min-w-0 text-start"
                  onClick={() => onScan(item.query)}
                >
                  <span className="t-body-strong t-num block truncate text-ink" dir="ltr">
                    {item.query}
                  </span>
                  <span className="t-caption text-ink-3">
                    {item.success
                      ? item.foundName ?? 'נמצא'
                      : 'לא נמצא'}
                  </span>
                </button>
                <span className="t-meta shrink-0 text-ink-3">
                  {new Date(item.at).toLocaleTimeString('he-IL', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      <Modal
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="הוספת ציוד מסריקה"
        description="הברקוד שנסרק כבר מולא."
      >
        <form onSubmit={onCreate} className="space-y-3">
          <Field label="סניף" htmlFor="scan-store">
            <Select
              id="scan-store"
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
          <Field label="קוד פנימי" htmlFor="scan-code">
            <Input
              id="scan-code"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              dir="ltr"
            />
          </Field>
          <Field label="ברקוד מוצר" htmlFor="scan-barcode">
            <Input
              id="scan-barcode"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              dir="ltr"
            />
          </Field>
          <Field label="שם" htmlFor="scan-name">
            <Input
              id="scan-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="שם הנכס"
            />
          </Field>
          <Field label="סוג" htmlFor="scan-type">
            <Select
              id="scan-type"
              value={assetType}
              onChange={(e) => setAssetType(e.target.value)}
            >
              <option value="hvac">מיזוג</option>
              <option value="electrical">חשמל</option>
              <option value="optical">ציוד אופטי</option>
              <option value="other">אחר</option>
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
    </div>
  )
}
