import { redirect } from 'next/navigation'
import { OpsAppShell } from '@/components/layout/ops-app-shell'
import { OpsPageHero } from '@/components/ops/ops-page-hero'
import { Panel } from '@/components/ui/primitives'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getServerActor } from '@/lib/auth/server-actor'
import { shouldAllowDemoEntry } from '@/lib/auth/home-path'
import { listCatalog, listStock } from '@/lib/data/ops-ledger'
import { availableQuantity } from '@/modules/inventory/stock'
import { addItemAction, moveStockAction } from '../work-actions'

export const dynamic = 'force-dynamic'

export default async function InventoryPage() {
  const actor = await getServerActor()
  if (!actor && !shouldAllowDemoEntry()) redirect('/login')
  const catalog = listCatalog()
  const stock = listStock()

  return (
    <OpsAppShell>
      <div className="mx-auto flex max-w-2xl flex-col gap-5">
        <OpsPageHero
          title="מלאי"
          status="פריט קטלוג, כמות, ויחידת ציוד — בנפרד"
        />
        <Panel elevated>
          <form action={addItemAction} className="flex flex-wrap gap-2">
            <Input name="name" placeholder="שם פריט" required />
            <Input name="sku" placeholder="מק״ט" required />
            <Button type="submit">הוספה לקטלוג</Button>
          </form>
        </Panel>
        {catalog.map((item) => (
          <Panel key={item.id} elevated>
            <p className="t-body">
              {item.name} · {item.sku}
            </p>
            <p className="t-meta text-ink-2">
              זמין במחסן: {availableQuantity(stock, item.id, 'warehouse')}
              {stock.some((row) => row.itemId === item.id && !row.verified)
                ? ' · כמות שטרם אומתה'
                : ''}
            </p>
            <form action={moveStockAction} className="mt-2 flex flex-wrap gap-2">
              <input type="hidden" name="itemId" value={item.id} />
              <select name="kind" className="h-11 rounded-md border border-border px-2" aria-label="סוג תנועה">
                <option value="in">כניסה</option>
                <option value="out">יציאה</option>
                <option value="transfer">העברה</option>
              </select>
              <Input name="from" placeholder="מאיפה" defaultValue="warehouse" />
              <Input name="to" placeholder="לאן" />
              <Input name="quantity" type="number" placeholder="כמות" required />
              <Input name="ticketId" placeholder="תקלה" />
              <Button type="submit" size="sm">תנועה</Button>
            </form>
          </Panel>
        ))}
      </div>
    </OpsAppShell>
  )
}
