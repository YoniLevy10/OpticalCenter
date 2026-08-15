import { OpsShell } from '@/components/layout/ops-shell'
import { fetchStores } from '@/modules/stores/data'
import { storeWhatsAppDeepLink } from '@/modules/stores/whatsapp-link'
import { storeWhatsAppPrefill } from '@/modules/tickets/constants'

export const dynamic = 'force-dynamic'

export default async function StoresPage() {
  const { stores, fromDb } = await fetchStores()

  return (
    <OpsShell
      title="חנויות"
      subtitle={
        fromDb
          ? 'קודים מספריים לפי מדינה · לינק זהה ל־QR ול־NFC'
          : 'תצוגת דמו עד להרצת מיגרציות'
      }
    >
      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-100 bg-zinc-50 text-xs text-zinc-500">
            <tr>
              <th className="px-3 py-2 text-right font-medium">קוד</th>
              <th className="px-3 py-2 text-right font-medium">שם</th>
              <th className="px-3 py-2 text-right font-medium">עיר</th>
              <th className="px-3 py-2 text-right font-medium">טקסט WhatsApp</th>
              <th className="px-3 py-2 text-right font-medium">לינק QR/NFC</th>
            </tr>
          </thead>
          <tbody>
            {stores.map((s) => {
              const link = storeWhatsAppDeepLink(s.code)
              return (
                <tr key={s.id} className="border-b border-zinc-50">
                  <td className="px-3 py-2 font-semibold tabular-nums">{s.code}</td>
                  <td className="px-3 py-2">{s.name}</td>
                  <td className="px-3 py-2 text-zinc-600">{s.city ?? '—'}</td>
                  <td className="px-3 py-2 font-mono text-xs text-zinc-600">
                    {storeWhatsAppPrefill(s.code)}
                  </td>
                  <td className="px-3 py-2">
                    <a
                      href={link}
                      className="text-xs text-sky-700 hover:underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      פתיחת WhatsApp
                    </a>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-zinc-500">
        הגדרת מספר WhatsApp עסקי לישראל: משתנה סביבה{' '}
        <code className="rounded bg-zinc-100 px-1">NEXT_PUBLIC_WA_BUSINESS_PHONE</code> או שדה
        במדינה ב־DB.
      </p>
    </OpsShell>
  )
}
