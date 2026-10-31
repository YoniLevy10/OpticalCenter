import { redirect } from 'next/navigation'
import { OpsAppShell } from '@/components/layout/ops-app-shell'
import { OpsPageHero } from '@/components/ops/ops-page-hero'
import { Panel, EmptyState, Notice } from '@/components/ui/primitives'
import { getServerActor } from '@/lib/auth/server-actor'
import { shouldAllowDemoEntry } from '@/lib/auth/home-path'
import { listProfessionals } from '@/modules/professionals/service'
import { midragSectorsForSelect } from '@/modules/vendors/midrag/catalog'
import { ProfessionalsBook } from './professionals-book'
import { ProfessionalsMidrag } from './professionals-midrag'
import { UserRound } from 'lucide-react'
import { PhoneFold } from '@/components/layout/phone-fold'

export const dynamic = 'force-dynamic'

export default async function ProfessionalsPage() {
  const actor = await getServerActor()
  if (!actor && !shouldAllowDemoEntry()) redirect('/login')

  const sectors = midragSectorsForSelect()
  let professionals: Awaited<
    ReturnType<typeof listProfessionals>
  >['professionals'] = []
  try {
    const result = await listProfessionals({ limit: 100 })
    professionals = result.professionals
  } catch {
    professionals = []
  }

  return (
    <OpsAppShell>
      <div className="flex flex-col gap-5 stagger">
        <OpsPageHero
          largeTitle
          title="אנשי מקצוע"
          status={
            professionals.length === 0
              ? 'שמרו אנשי קשר ממידרג — יופיעו כאן מדורגים'
              : `${professionals.length} שמורים · מדורגים לפי שימוש`
          }
        />

        <Notice tone="progress">
          <strong className="text-ink">מידרג — {sectors.length} מקצועות.</strong>{' '}
          פותחים אתר חיצוני לחיפוש. מספר טלפון לא נשלף אוטומטית — מעתיקים
          שם+טלפון ושומרים כאן לחיוג מהיר בפעם הבאה.
        </Notice>

        <PhoneFold title="חיפוש במידרג" summary={`${sectors.length} מקצועות`}>
        <Panel elevated className="space-y-3">
          <p className="t-body-strong text-ink">חיפוש במידרג</p>
          <ProfessionalsMidrag />
        </Panel>
        </PhoneFold>

        <Panel flush elevated className="overflow-hidden">
          {professionals.length === 0 ? (
            <EmptyState
              title="עדיין אין אנשי מקצוע שמורים"
              description="חיפוש במידרג ← העתיקו שם וטלפון ← שמרו לדירוג מהיר."
              icon={UserRound}
              className="py-14"
            />
          ) : (
            <ProfessionalsBook professionals={professionals} />
          )}
        </Panel>

      </div>
    </OpsAppShell>
  )
}
