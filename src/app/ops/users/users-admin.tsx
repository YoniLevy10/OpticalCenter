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
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { AdminRow, AdminRowList } from '@/components/ui/admin-row'
import { TechFieldLinkCopy } from '@/components/ops/tech-link-copy'
import type { MemberRole, Membership } from '@/lib/auth/types'

type StoreOpt = { id: string; code: string; name: string }

type UserRow = {
  id: string
  email: string | null
  full_name: string | null
  memberships: Membership[]
}

const ROLE_OPTIONS: { value: MemberRole; label: string }[] = [
  { value: 'internal_technician', label: 'טכנאי פנימי' },
  { value: 'external_provider', label: 'ספק חיצוני' },
  { value: 'store_employee', label: 'עובד חנות' },
  { value: 'store_manager', label: 'מנהל חנות' },
  { value: 'regional_manager', label: 'מנהל אזור' },
  { value: 'country_manager', label: 'מנהל מדינה' },
  { value: 'global_maintenance', label: 'תחזוקה גלובלית' },
  { value: 'global_admin', label: 'מנהל מערכת' },
]

const IL_COUNTRY = '22222222-2222-2222-2222-222222222222'
const FR_COUNTRY = '33333333-3333-3333-3333-333333333333'

export function UsersAdmin({ stores }: { stores: StoreOpt[] }) {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<MemberRole>('internal_technician')
  const [countryId, setCountryId] = useState<string>(IL_COUNTRY)
  const [storeId, setStoreId] = useState<string>('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/users')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'טעינה נכשלה')
      setUsers(json.users ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'טעינה נכשלה')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setNotice(null)
    setError(null)
    try {
      if (role === 'store_employee' && !storeId) {
        throw new Error('עובד חנות חייב להיות משויך לחנות')
      }
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: name.trim(),
          email: email.trim(),
          role,
          country_id: countryId || null,
          store_id: storeId || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'יצירה נכשלה')
      setName('')
      setEmail('')
      setRole('internal_technician')
      setStoreId('')
      setNotice('המשתמש נוסף')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'יצירה נכשלה')
    } finally {
      setBusy(false)
    }
  }

  async function onRoleChange(user: UserRow, nextRole: MemberRole) {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          membership_id: user.memberships[0]?.id,
          role: nextRole,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'עדכון נכשל')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'עדכון נכשל')
    } finally {
      setBusy(false)
    }
  }

  async function onScopeChange(
    user: UserRow,
    patch: { country_id?: string | null; store_id?: string | null },
  ) {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          membership_id: user.memberships[0]?.id,
          ...patch,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'עדכון נכשל')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'עדכון נכשל')
    } finally {
      setBusy(false)
    }
  }

  function scopeLabel(m?: Membership) {
    if (!m) return '—'
    const parts: string[] = []
    if (m.country_id === IL_COUNTRY) parts.push('IL')
    else if (m.country_id === FR_COUNTRY) parts.push('FR')
    else if (m.country_id) parts.push('מדינה')
    if (m.store_id) {
      const s = stores.find((x) => x.id === m.store_id)
      parts.push(s ? `#${s.code}` : 'חנות')
    }
    return parts.join(' · ') || 'גלובלי'
  }

  return (
    <div className="space-y-4">
      {error ? <ErrorState title="שגיאה" description={error} /> : null}
      {notice ? <Notice tone="progress">{notice}</Notice> : null}

      <Panel flush className="overflow-hidden">
        <PanelHeader title="הוספת משתמש" meta="פרופיל + היקף" />
        <form onSubmit={onCreate} className="space-y-3 p-4">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <Field label="שם" htmlFor="user-name">
              <Input
                id="user-name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="שם מלא"
              />
            </Field>
            <Field label="אימייל" htmlFor="user-email">
              <Input
                id="user-email"
                type="email"
                dir="ltr"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tech@optical-center.co.il"
              />
            </Field>
            <Field label="תפקיד" htmlFor="user-role">
              <Select
                id="user-role"
                value={role}
                onChange={(e) => setRole(e.target.value as MemberRole)}
              >
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="מדינה" htmlFor="user-country">
              <Select
                id="user-country"
                value={countryId}
                onChange={(e) => setCountryId(e.target.value)}
              >
                <option value={IL_COUNTRY}>ישראל</option>
                <option value={FR_COUNTRY}>צרפת</option>
                <option value="">ללא (גלובלי)</option>
              </Select>
            </Field>
            <Field label="חנות (אופציונלי)" htmlFor="user-store">
              <Select
                id="user-store"
                value={storeId}
                onChange={(e) => setStoreId(e.target.value)}
              >
                <option value="">כל החנויות בהיקף</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} · {s.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Button
            type="submit"
            variant="primary"
            disabled={busy || !name.trim() || !email.trim()}
          >
            {busy ? 'שומר…' : 'הוספה'}
          </Button>
        </form>
      </Panel>

      <Panel flush className="overflow-hidden">
        <PanelHeader title="משתמשים" meta={`${users.length}`} />
        {loading ? (
          <p className="t-body px-4 py-8 text-ink-2">טוען…</p>
        ) : users.length === 0 ? (
          <EmptyState
            title="אין משתמשים"
            description="הוסיפו טכנאי או מנהל באמצעות הטופס למעלה."
          />
        ) : (
          <>
            <AdminRowList>
              {users.map((u) => {
                const m = u.memberships[0]
                return (
                  <AdminRow
                    key={u.id}
                    title={u.full_name || '—'}
                    subtitle={u.email || '—'}
                    footer={
                      <span className="t-caption text-ink-3">
                        {ROLE_OPTIONS.find((o) => o.value === m?.role)?.label ??
                          m?.role}{' '}
                        · {scopeLabel(m)}
                      </span>
                    }
                  />
                )
              })}
            </AdminRowList>
            <div className="hidden overflow-x-auto md:block">
            <Table>
              <THead>
                <TH>שם</TH>
                <TH>אימייל</TH>
                <TH>תפקיד</TH>
                <TH>היקף</TH>
                <TH>חנות</TH>
                <TH>קישור שטח</TH>
              </THead>
              <TBody>
                {users.map((u) => {
                  const m = u.memberships[0]
                  return (
                    <TR key={u.id}>
                      <TD>
                        <span className="t-body-strong text-ink">
                          {u.full_name || '—'}
                        </span>
                      </TD>
                      <TD>
                        <span dir="ltr" className="t-meta t-num text-ink-2">
                          {u.email || '—'}
                        </span>
                      </TD>
                      <TD>
                        <select
                          className="t-control h-8 rounded-[var(--radius-md)] border border-border bg-surface px-2 text-ink"
                          value={m?.role ?? 'internal_technician'}
                          disabled={busy}
                          aria-label={`תפקיד של ${u.full_name || u.email || u.id}`}
                          onChange={(e) =>
                            void onRoleChange(u, e.target.value as MemberRole)
                          }
                        >
                          {ROLE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </TD>
                      <TD>
                        <span className="t-caption text-ink-2">{scopeLabel(m)}</span>
                      </TD>
                      <TD>
                        <select
                          className="t-control h-8 max-w-[10rem] rounded-[var(--radius-md)] border border-border bg-surface px-2 text-ink"
                          value={m?.store_id ?? ''}
                          disabled={busy}
                          aria-label={`חנות של ${u.full_name || u.id}`}
                          onChange={(e) =>
                            void onScopeChange(u, {
                              store_id: e.target.value || null,
                            })
                          }
                        >
                          <option value="">—</option>
                          {stores.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.code}
                            </option>
                          ))}
                        </select>
                      </TD>
                      <TD>
                        <TechFieldLinkCopy userId={u.id} role={m?.role ?? ''} />
                      </TD>
                    </TR>
                  )
                })}
              </TBody>
            </Table>
            </div>
          </>
        )}
      </Panel>
    </div>
  )
}
