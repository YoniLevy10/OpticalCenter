import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'תנאי שימוש · Terms of Service — MaintainOS',
  description:
    'תנאי שימוש ב־MaintainOS ובבוט WhatsApp לדיווח תקלות Optical Center',
  robots: { index: true, follow: true },
}

const UPDATED = '7 בספטמבר 2026'

export default function TermsOfServicePage() {
  return (
    <main className="min-h-dvh bg-canvas px-4 py-10 text-ink" dir="rtl">
      <article className="mx-auto max-w-2xl space-y-8">
        <header className="space-y-2 border-b border-border pb-6">
          <p className="t-caption text-ink-2">MaintainOS · Optical Center</p>
          <h1 className="t-title text-ink">תנאי שימוש</h1>
          <p className="t-body text-ink-2">Terms of Service</p>
          <p className="t-caption text-ink-3">עודכן לאחרונה: {UPDATED}</p>
        </header>

        <section className="space-y-3" lang="he">
          <h2 className="t-body-strong">1. השירות</h2>
          <p className="t-body text-ink-2 leading-relaxed">
            MaintainOS מספקת ערוץ דיווח תקלות תחזוקה (כולל בוט WhatsApp) וממשק
            ניהול לצוות Optical Center. השימוש מיועד לעובדים ולגורמים מורשים
            של הרשת בלבד.
          </p>
        </section>

        <section className="space-y-3" lang="he">
          <h2 className="t-body-strong">2. שימוש מקובל</h2>
          <p className="t-body text-ink-2 leading-relaxed">
            יש להשתמש בבוט ובמערכת לדיווח וטיפול בתקלות תחזוקה בלבד. אין לשלוח
            תוכן בלתי חוקי, פוגעני או שאינו קשור לתפעול. המערכת רשאית לחסום
            שימוש לרעה.
          </p>
        </section>

        <section className="space-y-3" lang="he">
          <h2 className="t-body-strong">3. זמינות</h2>
          <p className="t-body text-ink-2 leading-relaxed">
            אנו משתדלים לשמור על זמינות גבוהה, אך ייתכנו הפסקות לתחזוקה, תקלות
            ספקים (כולל Meta/WhatsApp) או כוח עליון. אין התחייבות לזמינות
            רציפה של 100%.
          </p>
        </section>

        <section className="space-y-3" lang="he">
          <h2 className="t-body-strong">4. פרטיות</h2>
          <p className="t-body text-ink-2 leading-relaxed">
            השימוש כפוף ל־
            <Link
              href="/privacy"
              className="text-[var(--tenant)] underline-offset-2 hover:underline"
            >
              מדיניות הפרטיות
            </Link>
            .
          </p>
        </section>

        <hr className="border-border" />

        <section className="space-y-3" lang="en" dir="ltr">
          <h2 className="t-title text-ink">Terms of Service (English)</h2>
          <p className="t-body text-ink-2 leading-relaxed">
            MaintainOS provides a maintenance fault-reporting channel (including
            a WhatsApp bot) and an operations console for Optical Center
            authorized users. Use the service only for legitimate maintenance
            reporting and handling. Availability may be affected by maintenance
            windows or third-party providers such as Meta/WhatsApp. Privacy
            practices are described in our Privacy Policy.
          </p>
          <p className="t-caption text-ink-3">Last updated: 7 September 2026</p>
        </section>

        <footer className="border-t border-border pt-6 t-caption text-ink-3">
          <Link
            href="/privacy"
            className="text-[var(--tenant)] underline-offset-2 hover:underline"
          >
            מדיניות פרטיות
          </Link>
          {' · '}
          <Link href="/" className="text-[var(--tenant)] underline-offset-2 hover:underline">
            חזרה למערכת
          </Link>
        </footer>
      </article>
    </main>
  )
}
