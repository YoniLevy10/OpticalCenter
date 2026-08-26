'use client'

import { FormEvent, useCallback, useEffect, useState } from 'react'
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
import { assetWhatsAppPrefill } from '@/modules/assets/service'

type AssetRow = {
  id: string
  code: string
  name: string
  asset_type: string
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
  const [name, setName] = useState('')
  const [assetType, setAssetType] = useState('hvac')

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

  return (
    <Panel flush className="overflow-hidden">
      <PanelHeader title="נכסים בחנות" meta={`#${storeCode}`} />
      <div className="space-y-4 p-4">
        {error ? <ErrorState title="שגיאה" description={error} /> : null}
        {notice ? <Notice tone="progress">{notice}</Notice> : null}

        <form onSubmit={onCreate} className="grid gap-3 md:grid-cols-3">
          <Field label="קוד נכס" htmlFor="asset-code">
            <Input
              id="asset-code"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="HVAC-1"
              dir="ltr"
            />
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
          <div className="md:col-span-3">
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
                  subtitle={assetWhatsAppPrefill(storeCode, a.code)}
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
    </Panel>
  )
}
