'use client'

import { FormEvent, useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import {
  EmptyState,
  ErrorState,
  Notice,
  Panel,
  PanelHeader,
} from '@/components/ui/primitives'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import type { MemberRole, Membership } from '@/lib/auth/types'

type UserRow = {
  id: string
  email: string | null
  full_name: string | null
  memberships: Membership[]
}

const ROLE_OPTIONS: { value: MemberRole; label: string }[] = [
  { value: 'internal_technician', label: 'טכנאי פנימי' },
  { value: 'external_provider', label: 'ספק חיצוני' },
  { value: 'store_manager', label: 'מנהל חנות' },
  { value: 'regional_manager', label: 'מנהל אזור' },
  { value: 'country_manager', label: 'מנהל מדינה' },
  { value: 'global_maintenance', label: 'תחזוקה גלובלית' },
  { value: 'global_admin', label: 'מנהל מערכת' },
]

const ROLE_LABEL: Record<string, string> = Object.fromEntries(
  ROLE_OPTIONS.map((r) => [r.value, r.label]),
)

function primaryRole(user: UserRow): string {
  const role = user.memberships[0]?.role
  return role ? (ROLE_LABEL[role] ?? role) : '—'
}

export function UsersAdmin() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<MemberRole>('internal_technician')

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
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: name.trim(),
          email: email.trim(),
          role,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'יצירה נכשלה')
      setName('')
      setEmail('')
      setRole('internal_technician')
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

  return (
    <div className="space-y-4">
      {error ? (
        <ErrorState title="שגיאה" description={error} />
      ) : null}
      {notice ? <Notice tone="progress">{notice}</Notice> : null}

      <Panel flush className="overflow-hidden">
        <PanelHeader title="הוספת טכנאי" meta="פרופיל + הרשאה" />
        <form onSubmit={onCreate} className="space-y-3 p-4">
          <div className="grid gap-3 md:grid-cols-3">
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
              <select
                id="user-role"
                className="t-control h-9 w-full rounded-[var(--radius-md)] border border-border bg-surface px-2.5 text-ink"
                value={role}
                onChange={(e) => setRole(e.target.value as MemberRole)}
              >
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
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
          <div className="overflow-x-auto">
            <Table>
              <THead>
                <TH>שם</TH>
                <TH>אימייל</TH>
                <TH>תפקיד</TH>
              </THead>
              <TBody>
                {users.map((u) => (
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
                        value={u.memberships[0]?.role ?? 'internal_technician'}
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
                      <span className="sr-only">{primaryRole(u)}</span>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
        )}
      </Panel>
    </div>
  )
}
