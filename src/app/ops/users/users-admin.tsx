'use client'

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, Input, Select, SearchField } from '@/components/ui/input'
import {
  EmptyState,
  ErrorState,
  Notice,
  Panel,
  PanelHeader,
  SuccessNotice,
} from '@/components/ui/primitives'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { AdminRow, AdminRowList } from '@/components/ui/admin-row'
import { Modal } from '@/components/ui/overlay'
import { TechFieldLinkCopy } from '@/components/ops/tech-link-copy'
import type { MemberRole, Membership } from '@/lib/auth/types'

type StoreOpt = { id: string; code: string; name: string }

type UserRow = {
  id: string
  email: string | null
  full_name: string | null
  memberships: Membership[]
  last_login_at?: string | null
  active?: boolean
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

const ROLE_HELP: Record<string, string> = {
  internal_technician: 'מטפל בתקלות בשטח',
  store_manager: 'רואה ומדווח על תקלות בסניף',
  regional_manager: 'מנהל כמה סניפים באזור',
  global_admin: 'גישה מלאה להגדרות ומשתמשים',
  global_maintenance: 'ניהול תחזוקה בכל הרשת',
}

const IL_COUNTRY = '22222222-2222-2222-2222-222222222222'
const FR_COUNTRY = '33333333-3333-3333-3333-333333333333'

function formatLastLogin(iso?: string | null) {
  if (!iso) return 'טרם התחבר'
  try {
    return new Date(iso).toLocaleString('he-IL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '—'
  }
}

export function UsersAdmin({ stores }: { stores: StoreOpt[] }) {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [confirmRole, setConfirmRole] = useState<{
    user: UserRow
    nextRole: MemberRole
  } | null>(null)
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>(
    'all',
  )
  const [q, setQ] = useState('')

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

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return users.filter((u) => {
      const m = u.memberships[0]
      if (roleFilter && m?.role !== roleFilter) return false
      const active = u.active !== false
      if (statusFilter === 'active' && !active) return false
      if (statusFilter === 'inactive' && active) return false
      if (!needle) return true
      const hay = `${u.full_name ?? ''} ${u.email ?? ''}`.toLowerCase()
      return hay.includes(needle)
    })
  }, [users, roleFilter, statusFilter, q])

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setNotice(null)
    setError(null)
    try {
      if (role === 'store_employee' && !storeId) {
        throw new Error('עובד חנות חייב להיות משויך לסניף')
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
      setCreateOpen(false)
      setNotice('המשתמש נוסף בהצלחה')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'יצירה נכשלה')
    } finally {
      setBusy(false)
    }
  }

  async function applyRoleChange(user: UserRow, nextRole: MemberRole) {
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
      setNotice('התפקיד עודכן')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'עדכון נכשל')
    } finally {
      setBusy(false)
      setConfirmRole(null)
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
    if (m.country_id === IL_COUNTRY) parts.push('ישראל')
    else if (m.country_id === FR_COUNTRY) parts.push('צרפת')
    else if (m.country_id) parts.push('מדינה')
    if (m.store_id) {
      const s = stores.find((x) => x.id === m.store_id)
      parts.push(s ? s.name : 'סניף')
    }
    return parts.join(' · ') || 'כל הרשת'
  }

  function branchLabel(m?: Membership) {
    if (!m?.store_id) return '—'
    const s = stores.find((x) => x.id === m.store_id)
    return s ? `${s.name} (#${s.code})` : '—'
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? <ErrorState title="שגיאה" description={error} /> : null}
      {notice ? <SuccessNotice>{notice}</SuccessNotice> : null}

      <div className="flex flex-wrap items-center gap-2">
        <SearchField
          value={q}
          onValueChange={setQ}
          placeholder="חיפוש לפי שם או אימייל…"
          className="min-w-0 flex-1"
        />
        <Select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          aria-label="סינון לפי תפקיד"
          className="w-40"
        >
          <option value="">כל התפקידים</option>
          {ROLE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
        <Select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')
          }
          aria-label="סינון לפי סטטוס"
          className="w-32"
        >
          <option value="all">כל הסטטוסים</option>
          <option value="active">פעיל</option>
          <option value="inactive">לא פעיל</option>
        </Select>
        <Button type="button" variant="primary" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" aria-hidden />
          משתמש חדש
        </Button>
      </div>

      <Panel flush className="overflow-hidden">
        <PanelHeader title="משתמשים" meta={`${filtered.length}`} />
        {loading ? (
          <p className="t-body px-4 py-8 text-ink-2">טוען…</p>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="אין משתמשים להצגה"
            description="נסו לשנות את הסינון או להוסיף משתמש חדש."
            action={
              <Button variant="secondary" size="sm" onClick={() => setCreateOpen(true)}>
                משתמש חדש
              </Button>
            }
          />
        ) : (
          <>
            <AdminRowList>
              {filtered.map((u) => {
                const m = u.memberships[0]
                const active = u.active !== false
                return (
                  <AdminRow
                    key={u.id}
                    title={u.full_name || '—'}
                    subtitle={u.email || '—'}
                    footer={
                      <span className="t-caption text-ink-3">
                        {ROLE_OPTIONS.find((o) => o.value === m?.role)?.label ??
                          m?.role}{' '}
                        · {branchLabel(m)} ·{' '}
                        {active ? 'פעיל' : 'לא פעיל'} ·{' '}
                        {formatLastLogin(u.last_login_at)}
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
                  <TH>תפקיד</TH>
                  <TH>סניף</TH>
                  <TH>סטטוס</TH>
                  <TH>התחברות אחרונה</TH>
                  <TH>קישור שטח</TH>
                </THead>
                <TBody>
                  {filtered.map((u) => {
                    const m = u.memberships[0]
                    const active = u.active !== false
                    return (
                      <TR key={u.id}>
                        <TD>
                          <span className="t-body-strong block text-ink">
                            {u.full_name || '—'}
                          </span>
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
                            title={
                              ROLE_HELP[m?.role ?? ''] ??
                              'בחרו תפקיד בשפה עסקית'
                            }
                            onChange={(e) =>
                              setConfirmRole({
                                user: u,
                                nextRole: e.target.value as MemberRole,
                              })
                            }
                          >
                            {ROLE_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                          <p className="t-caption mt-1 text-ink-3">
                            {ROLE_HELP[m?.role ?? ''] ?? scopeLabel(m)}
                          </p>
                        </TD>
                        <TD>
                          <select
                            className="t-control h-8 max-w-[10rem] rounded-[var(--radius-md)] border border-border bg-surface px-2 text-ink"
                            value={m?.store_id ?? ''}
                            disabled={busy}
                            aria-label={`סניף של ${u.full_name || u.id}`}
                            onChange={(e) =>
                              void onScopeChange(u, {
                                store_id: e.target.value || null,
                              })
                            }
                          >
                            <option value="">—</option>
                            {stores.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.code} · {s.name}
                              </option>
                            ))}
                          </select>
                        </TD>
                        <TD>
                          <span
                            className={
                              active
                                ? 't-caption text-[var(--signal-resolved)]'
                                : 't-caption text-ink-3'
                            }
                          >
                            {active ? 'פעיל' : 'לא פעיל'}
                          </span>
                        </TD>
                        <TD>
                          <span className="t-meta text-ink-2">
                            {formatLastLogin(u.last_login_at)}
                          </span>
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

      <Modal
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="משתמש חדש"
        description="טופס קצר — שם, תפקיד וסניף."
      >
        <form onSubmit={onCreate} className="space-y-3">
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
            {ROLE_HELP[role] ? (
              <p className="t-caption mt-1 text-ink-3">{ROLE_HELP[role]}</p>
            ) : null}
          </Field>
          <Field label="מדינה" htmlFor="user-country">
            <Select
              id="user-country"
              value={countryId}
              onChange={(e) => setCountryId(e.target.value)}
            >
              <option value={IL_COUNTRY}>ישראל</option>
              <option value={FR_COUNTRY}>צרפת</option>
              <option value="">ללא (כל הרשת)</option>
            </Select>
          </Field>
          <Field label="סניף (אופציונלי)" htmlFor="user-store">
            <Select
              id="user-store"
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
            >
              <option value="">כל הסניפים בהיקף</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} · {s.name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setCreateOpen(false)}
            >
              ביטול
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={busy || !name.trim() || !email.trim()}
            >
              {busy ? 'שומר…' : 'יצירה'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(confirmRole)}
        onOpenChange={(open) => {
          if (!open) setConfirmRole(null)
        }}
        title="אישור שינוי תפקיד"
        description="פעולה רגישה — משנה את הרשאות המשתמש."
      >
        {confirmRole ? (
          <div className="space-y-4">
            <Notice tone="warning">
              לשנות את התפקיד של{' '}
              <strong>{confirmRole.user.full_name || confirmRole.user.email}</strong>{' '}
              ל־
              <strong>
                {ROLE_OPTIONS.find((o) => o.value === confirmRole.nextRole)?.label}
              </strong>
              ?
            </Notice>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setConfirmRole(null)}
              >
                ביטול
              </Button>
              <Button
                type="button"
                variant="primary"
                disabled={busy}
                onClick={() =>
                  void applyRoleChange(confirmRole.user, confirmRole.nextRole)
                }
              >
                אישור שינוי
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
