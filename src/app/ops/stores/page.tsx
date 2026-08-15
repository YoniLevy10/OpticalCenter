import { OpsShell } from '@/components/layout/ops-shell'
import { SurfaceTable } from '@/components/ui/primitives'
import { fetchStores } from '@/modules/stores/data'
import { storeWhatsAppDeepLink } from '@/modules/stores/whatsapp-link'
import { storeWhatsAppPrefill } from '@/modules/tickets/constants'

export const dynamic = 'force-dynamic'

export default async function StoresPage() {
  const { stores, fromDb } = await fetchStores()

  return (
    <OpsShell
      pathname="/ops/stores"
      title="חנויות"
      subtitle={
        fromDb
          ? 'קוד מספרי · לינק זהה ל־QR ול־NFC'
          : 'תצוגת דמו עד מיגרציות'
      }
    >
      <SurfaceTable>
        <thead>
          <tr className="border-b border-border bg-canvas/70 text-[11px] font-medium text-muted">
            <th className="px-3 py-2 text-start">קוד</th>
            <th className="px-3 py-2 text-start">שם</th>
            <th className="px-3 py-2 text-start">עיר</th>
            <th className="px-3 py-2 text-start">טקסט</th>
            <th className="px-3 py-2 text-start">QR / NFC</th>
          </tr>
        </thead>
        <tbody>
          {stores.map((s) => {
            const link = storeWhatsAppDeepLink(s.code)
            return (
              <tr
                key={s.id}
                className="border-b border-border/80"
                style={{ height: 'var(--row-h)' }}
              >
                <td className="px-3 font-semibold tabular-nums">{s.code}</td>
                <td className="px-3">{s.name}</td>
                <td className="px-3 text-muted">{s.city ?? '—'}</td>
                <td className="px-3 font-mono text-[11px] text-muted">
                  {storeWhatsAppPrefill(s.code)}
                </td>
                <td className="px-3">
                  <a
                    href={link}
                    className="text-[12px] text-accent hover:underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    WhatsApp
                  </a>
                </td>
              </tr>
            )
          })}
        </tbody>
      </SurfaceTable>
      <p className="mt-3 text-[12px] text-faint">
        מספר עסקי: `NEXT_PUBLIC_WA_BUSINESS_PHONE`
      </p>
    </OpsShell>
  )
}
