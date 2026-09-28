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
import {
  PRODUCT_ROLE_HELP_HE,
  PRODUCT_ROLE_OPTIONS,
  roleLabelHe,
} from '@/lib/auth/roles'

type StoreOpt = { id: string; code: string; name: string }

type UserRow = {
  id: string
  email: string | null
  full_name: string | null
  phone?: string | null
  memberships: Membership[]
  last_login_at?: string | null
  active?: boolean
}

const ROLE_OPTIONS = PRODUCT_ROLE_OPTIONS

const ROLE_HELP: Record<string, string> = PRODUCT_ROLE_HELP_HE

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
  const [editUser, setEditUser] = useState<UserRow | null>(null)
  const [editPhone, setEditPhone] = useState('')
  const [editRole, setEditRole] = useState<MemberRole>('internal_technician')
  const [editStoreId, setEditStoreId] = useState('')
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
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
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
      const hay =
        `${u.full_name ?? ''} ${u.email ?? ''} ${u.phone ?? ''}`.toLowerCase()
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
      if (role === 'internal_technician' && !phone.trim()) {
        throw new Error('לטכנאי חובה להזין מספר טלפון להודעות שיוך')
      }
      if (!password.trim() || password.trim().length < 6) {
        throw new Error('יש להגדיר סיסמה (לפחות 6 תווים) להתחברות')
      }
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: name.trim(),
          email: email.trim(),
          password: password.trim(),
          role,
          phone: phone.trim() || null,
          country_id: countryId || null,
          store_id: storeId || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'יצירה נכשלה')
      setName('')
      setEmail('')
      setPhone('')
      setPassword('')
      setRole('internal_technician')
      setStoreId('')
      setCreateOpen(false)
      setNotice(
        role === 'internal_technician' && phone.trim()
          ? 'המשתמש נוסף — הודעות שיוך יישלחו למספר שהוגדר'
          : 'המשתמש נוסף — יכול להתחבר עם המייל והסיסמה שסופקו',
      )
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
      setEditUser(null)
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

  function openEdit(u: UserRow) {
    setEditUser(u)
    setEditPhone(u.phone ?? '')
    setEditRole((u.memberships[0]?.role as MemberRole) || 'internal_technician')
    setEditStoreId(u.memberships[0]?.store_id ?? '')
    setError(null)
  }

  async function saveEditCard() {
    if (!editUser) return
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const phoneChanged =
        (editPhone.trim() || '') !== (editUser.phone ?? '').trim()
      if (phoneChanged) {
        const res = await fetch(`/api/users/${editUser.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: editPhone.trim() || null }),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'עדכון טלפון נכשל')
      }
      const m = editUser.memberships[0]
      const storeChanged = m && (editStoreId || null) !== (m.store_id || null)
      if (storeChanged) {
        const res = await fetch(`/api/users/${editUser.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            membership_id: m?.id,
            store_id: editStoreId || null,
          }),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'עדכון סניף נכשל')
      }
      const roleChanged = m && editRole !== m.role
      if (roleChanged) {
        setConfirmRole({ user: editUser, nextRole: editRole })
        setBusy(false)
        return
      }
      setNotice('הכרטיס עודכן')
      setEditUser(null)
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
          placeholder="חיפוש לפי שם, אימייל או טלפון…"
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
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => openEdit(u)}
                    className="block w-full text-start transition-colors hover:bg-surface-sunken/40"
                  >
                    <AdminRow
                      title={u.full_name || '—'}
                      subtitle={u.email || '—'}
                      footer={
                        <span className="t-caption text-ink-3">
                          {ROLE_OPTIONS.find((o) => o.value === m?.role)?.label ??
                            m?.role}{' '}
                          · {branchLabel(m)} ·{' '}
                          {active ? 'פעיל' : 'לא פעיל'} ·{' '}
                          {(u.phone || 'ללא טלפון') +
                            ' · ' +
                            formatLastLogin(u.last_login_at)}
                        </span>
                      }
                      trailing={
                        <span className="t-caption text-[var(--tenant)]">
                          עריכה
                        </span>
                      }
                    />
                  </button>
                )
              })}
            </AdminRowList>
            <div className="hidden overflow-x-auto md:block">
              <Table>
                <THead>
                  <TH>שם</TH>
                  <TH>תפקיד</TH>
                  <TH>טלפון</TH>
                  <TH>סניף</TH>
                  <TH>סטטוס</TH>
                  <TH>התחברות אחרונה</TH>
                  <TH>קישור שטח</TH>
                  <TH align="end"> </TH>
                </THead>
                <TBody>
                  {filtered.map((u) => {
                    const m = u.memberships[0]
                    const active = u.active !== false
                    return (
                      <TR
                        key={u.id}
                        className="cursor-pointer transition-colors hover:bg-surface-sunken/40"
                        onClick={() => openEdit(u)}
                      >
                        <TD>
                          <span className="t-body-strong block text-ink">
                            {u.full_name || '—'}
                          </span>
                          <span dir="ltr" className="t-meta t-num text-ink-2">
                            {u.email || '—'}
                          </span>
                        </TD>
                        <TD>
                          <span className="t-body text-ink">
                            {ROLE_OPTIONS.find((o) => o.value === m?.role)
                              ?.label ??
                              (m?.role ? roleLabelHe(m.role) : '—')}
                          </span>
                          <p className="t-caption mt-1 text-ink-3">
                            {ROLE_HELP[m?.role ?? ''] ?? scopeLabel(m)}
                          </p>
                        </TD>
                        <TD>
                          <span dir="ltr" className="t-num t-body text-ink">
                            {u.phone || '—'}
                          </span>
                        </TD>
                        <TD>
                          <span className="t-body text-ink">{branchLabel(m)}</span>
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
                        <TD onClick={(e) => e.stopPropagation()}>
                          <TechFieldLinkCopy userId={u.id} role={m?.role ?? ''} />
                        </TD>
                        <TD
                          align="end"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            aria-label={`עריכת ${u.full_name || u.email || 'משתמש'}`}
                            onClick={() => openEdit(u)}
                          >
                            עריכה
                          </Button>
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
        onOpenChange={(open) => {
          setCreateOpen(open)
          if (open) setError(null)
        }}
        title="משתמש חדש"
        description="מייל + סיסמה להתחברות, ותפקיד אחד."
      >
        <form onSubmit={onCreate} className="space-y-3">
          {error ? (
            <ErrorState title="לא ניתן ליצור משתמש" description={error} />
          ) : null}
          <Field label="שם" htmlFor="user-name">
            <Input
              id="user-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="שם מלא"
            />
          </Field>
          <Field label="אימייל (Gmail או מייל ארגוני)" htmlFor="user-email">
            <Input
              id="user-email"
              type="email"
              dir="ltr"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@gmail.com"
            />
          </Field>
          <Field
            label="טלפון נייד"
            htmlFor="user-phone"
            hint={
              role === 'internal_technician'
                ? 'חובה לטכנאי — לכאן יישלחו הודעות שיוך תקלה (WhatsApp למספר).'
                : 'אופציונלי. לטכנאים משמש לשליחת הודעת שיוך.'
            }
          >
            <Input
              id="user-phone"
              dir="ltr"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="05… או 9725…"
              required={role === 'internal_technician'}
            />
          </Field>
          <Field
            label="סיסמה ראשונית"
            htmlFor="user-password"
            hint="המשתמש יתחבר עם המייל והסיסמה האלה (או Google אם המייל מאושר)."
          >
            <Input
              id="user-password"
              type="password"
              dir="ltr"
              required
              minLength={6}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="לפחות 6 תווים"
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
              disabled={
                busy ||
                !name.trim() ||
                !email.trim() ||
                password.trim().length < 6 ||
                (role === 'internal_technician' && !phone.trim())
              }
            >
              {busy ? 'שומר…' : 'יצירה'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(editUser)}
        onOpenChange={(open) => {
          if (!open) setEditUser(null)
        }}
        title={editUser?.full_name || 'כרטיס משתמש'}
        description={editUser?.email || undefined}
      >
        {editUser ? (
          <div className="space-y-3">
            <Field label="טלפון להודעות שיוך" htmlFor="edit-phone">
              <Input
                id="edit-phone"
                dir="ltr"
                inputMode="tel"
                className="t-num"
                placeholder="05… / 9725…"
                value={editPhone}
                disabled={busy}
                onChange={(e) => setEditPhone(e.target.value)}
              />
            </Field>
            <Field label="תפקיד" htmlFor="edit-role">
              <Select
                id="edit-role"
                value={editRole}
                disabled={busy}
                onChange={(e) => setEditRole(e.target.value as MemberRole)}
              >
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
              {ROLE_HELP[editRole] ? (
                <p className="t-caption mt-1 text-ink-3">{ROLE_HELP[editRole]}</p>
              ) : null}
            </Field>
            <Field label="סניף" htmlFor="edit-store">
              <Select
                id="edit-store"
                value={editStoreId}
                disabled={busy}
                onChange={(e) => setEditStoreId(e.target.value)}
              >
                <option value="">כל הסניפים בהיקף</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} · {s.name}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="rounded-[var(--radius-md)] border border-border bg-surface-sunken/40 px-3 py-2">
              <p className="t-caption text-ink-3">התחברות אחרונה</p>
              <p className="t-body text-ink">
                {formatLastLogin(editUser.last_login_at)}
              </p>
            </div>
            <TechFieldLinkCopy
              userId={editUser.id}
              role={editUser.memberships[0]?.role ?? ''}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setEditUser(null)}
              >
                ביטול
              </Button>
              <Button
                type="button"
                variant="primary"
                disabled={busy}
                onClick={() => void saveEditCard()}
              >
                {busy ? 'שומר…' : 'שמירה'}
              </Button>
            </div>
          </div>
        ) : null}
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
