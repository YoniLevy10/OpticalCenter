'use client'

import { FormEvent, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { ErrorState, SuccessNotice } from '@/components/ui/primitives'
import {
  GroupedList,
  GroupedRow,
  GroupedSection,
} from '@/components/ui/grouped-list'
import type { WhatsAppTemplateRow } from '@/modules/whatsapp/templates-admin'

export function WhatsAppTemplatesClient() {
  const [templates, setTemplates] = useState<WhatsAppTemplateRow[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [editing, setEditing] = useState<WhatsAppTemplateRow | null>(null)

  const load = useCallback(async () => {
    setError(null)
    const res = await fetch('/api/settings/whatsapp-templates')
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'טעינה נכשלה')
    setTemplates(json.templates ?? [])
  }, [])

  useEffect(() => {
    void load().catch((err) =>
      setError(err instanceof Error ? err.message : 'טעינה נכשלה'),
    )
  }, [load])

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!editing) return
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const res = await fetch('/api/settings/whatsapp-templates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editing.id,
          meta_name: editing.meta_name,
          body: editing.body,
          category: editing.category,
          is_active: editing.is_active,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'שמירה נכשלה')
      setNotice('התבנית עודכנה')
      setEditing(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שמירה נכשלה')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="t-meta">
          תבניות Meta Utility לשליחה מחוץ לחלון 24 השעות. שם Meta חייב להתאים
          לתבנית המאושרת ב־Business Manager.
        </p>
        <Button asChild variant="secondary">
          <Link href="/ops/settings">← חזרה להגדרות</Link>
        </Button>
      </div>

      {error ? <ErrorState title="שגיאה" description={error} /> : null}
      {notice ? <SuccessNotice>{notice}</SuccessNotice> : null}

      <GroupedList>
        <GroupedSection title="קטלוג תבניות">
          {templates.map((t) => (
            <GroupedRow key={t.id} className="flex-col items-stretch gap-1">
              <button
                type="button"
                className="flex w-full flex-col items-stretch gap-1 text-start"
                onClick={() => setEditing({ ...t })}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="t-body-strong">{t.key}</span>
                  <span className="t-caption">
                    {t.is_active ? 'פעיל' : 'כבוי'} · {t.category}
                  </span>
                </div>
                <span className="t-meta" dir="ltr">
                  meta: {t.meta_name || '—'}
                </span>
                <span className="t-body text-ink-2 line-clamp-2">{t.body}</span>
              </button>
            </GroupedRow>
          ))}
        </GroupedSection>
      </GroupedList>

      {editing ? (
        <form onSubmit={save} className="panel space-y-3 rounded-[var(--radius-lg)] border border-border bg-surface p-4">
          <h2 className="t-section">עריכת {editing.key}</h2>
          <Field label="שם Meta (meta_name)" htmlFor="meta">
            <Input
              id="meta"
              dir="ltr"
              value={editing.meta_name ?? ''}
              onChange={(e) =>
                setEditing({
                  ...editing,
                  meta_name: e.target.value.trim() || null,
                })
              }
              placeholder="maintainos_followup"
            />
          </Field>
          <Field label="קטגוריה" htmlFor="cat">
            <Input
              id="cat"
              value={editing.category}
              onChange={(e) =>
                setEditing({ ...editing, category: e.target.value })
              }
            />
          </Field>
          <label className="flex flex-col gap-1.5">
            <span className="t-caption">גוף ההודעה</span>
            <textarea
              className="min-h-[120px] w-full rounded-[var(--radius-md)] border border-border bg-surface p-3 t-body"
              value={editing.body}
              onChange={(e) =>
                setEditing({ ...editing, body: e.target.value })
              }
            />
          </label>
          <label className="flex items-center gap-2 t-body">
            <input
              type="checkbox"
              checked={editing.is_active}
              onChange={(e) =>
                setEditing({ ...editing, is_active: e.target.checked })
              }
            />
            תבנית פעילה
          </label>
          <div className="flex gap-2">
            <Button type="submit" variant="primary" disabled={busy}>
              {busy ? 'שומר…' : 'שמירה'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setEditing(null)}
            >
              ביטול
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  )
}
