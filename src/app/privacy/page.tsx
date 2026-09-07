import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'מדיניות פרטיות · Privacy Policy — MaintainOS',
  description:
    'מדיניות פרטיות של MaintainOS (Optical Center) לשימוש בבוט WhatsApp ובמערכת דיווח התקלות',
  robots: { index: true, follow: true },
}

const UPDATED = '7 בספטמבר 2026'

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-dvh bg-canvas px-4 py-10 text-ink" dir="rtl">
      <article className="mx-auto max-w-2xl space-y-8">
        <header className="space-y-2 border-b border-border pb-6">
          <p className="t-caption text-ink-2">MaintainOS · Optical Center</p>
          <h1 className="t-title text-ink">מדיניות פרטיות</h1>
          <p className="t-body text-ink-2">Privacy Policy</p>
          <p className="t-caption text-ink-3">עודכן לאחרונה: {UPDATED}</p>
        </header>

        <section className="space-y-3" lang="he">
          <h2 className="t-body-strong">1. מי אנחנו</h2>
          <p className="t-body text-ink-2 leading-relaxed">
            MaintainOS היא מערכת לדיווח וניהול תקלות תחזוקה עבור רשת Optical
            Center (פיילוט ישראל). השירות כולל בוט WhatsApp עסקי וממשק תפעול
            לצוות התחזוקה.
          </p>
        </section>

        <section className="space-y-3" lang="he">
          <h2 className="t-body-strong">2. איזה מידע נאסף</h2>
          <ul className="list-disc space-y-2 pe-5 t-body text-ink-2 leading-relaxed">
            <li>
              מספר טלפון (מזהה WhatsApp) של מי ששולח הודעה לבוט העסקי
            </li>
            <li>תוכן הודעות טקסט ומדיה שנשלחו לדיווח תקלה</li>
            <li>קוד חנות / זיהוי סניף (למשל דרך QR או טקסט)</li>
            <li>
              פרטי תקלה שנוצרים במערכת (תיאור, עדיפות, סטטוס, שיוך לטכנאי)
            </li>
            <li>
              פרטי התחברות של משתמשי מערכת פנימיים (צוות Ops / טכנאים) דרך
              ספק האימות
            </li>
          </ul>
        </section>

        <section className="space-y-3" lang="he">
          <h2 className="t-body-strong">3. למה אנחנו משתמשים במידע</h2>
          <ul className="list-disc space-y-2 pe-5 t-body text-ink-2 leading-relaxed">
            <li>קבלת דיווחי תקלות ופתיחת קריאות תחזוקה</li>
            <li>תקשורת עם מדווח התקלה דרך WhatsApp</li>
            <li>שיבוץ טכנאים ומעקב אחר טיפול</li>
            <li>שיפור איכות השירות והבוט (כולל עיבוד שפה)</li>
            <li>אבטחה, מניעת שימוש לרעה ועמידה בדרישות החוק</li>
          </ul>
        </section>

        <section className="space-y-3" lang="he">
          <h2 className="t-body-strong">4. WhatsApp ו־Meta</h2>
          <p className="t-body text-ink-2 leading-relaxed">
            השירות משתמש ב־WhatsApp Cloud API של Meta. הודעות שנשלחות אל המספר
            העסקי שלנו מתקבלות דרך Meta ומעובדות במערכות שלנו לצורך תחזוקה
            בלבד. השימוש כפוף גם למדיניות של Meta / WhatsApp.
          </p>
        </section>

        <section className="space-y-3" lang="he">
          <h2 className="t-body-strong">5. שיתוף מידע</h2>
          <p className="t-body text-ink-2 leading-relaxed">
            איננו מוכרים מידע אישי. המידע עשוי להיות זמין לצוות התחזוקה של
            Optical Center ולספקי תשתית הכרחיים להפעלת השירות (אחסון, אימות,
            שליחת הודעות), בכפוף להתחייבויות סודיות ואבטחה.
          </p>
        </section>

        <section className="space-y-3" lang="he">
          <h2 className="t-body-strong">6. שמירה ואבטחה</h2>
          <p className="t-body text-ink-2 leading-relaxed">
            אנו שומרים מידע כל עוד נדרש לטיפול בתקלות, לתיעוד תפעולי ולחובות
            חוקיות. אנו נוקטים באמצעי אבטחה סבירים (הצפנה בתעבורה, בקרת גישה,
            מפתחות שרת) כדי להגן על המידע.
          </p>
        </section>

        <section className="space-y-3" lang="he">
          <h2 className="t-body-strong">7. הזכויות שלך</h2>
          <p className="t-body text-ink-2 leading-relaxed">
            ניתן לפנות אלינו בבקשה לעיון, תיקון או מחיקה של מידע אישי הקשור
            לדיווחים שלך, בכפוף למגבלות חוק ותפעול. לפניות: דרך הודעה למספר
            העסקי של הבוט או לצוות Optical Center האחראי על המערכת.
          </p>
        </section>

        <section className="space-y-3" lang="he">
          <h2 className="t-body-strong">8. יצירת קשר</h2>
          <p className="t-body text-ink-2 leading-relaxed">
            MaintainOS / Optical Center (פיילוט ישראל)
            <br />
            WhatsApp עסקי:{' '}
            <span dir="ltr" className="inline-block">
              +972 55-281-9086
            </span>
          </p>
        </section>

        <hr className="border-border" />

        <section className="space-y-4" lang="en" dir="ltr">
          <h2 className="t-title text-ink">Privacy Policy (English)</h2>
          <p className="t-body text-ink-2 leading-relaxed">
            MaintainOS is a maintenance ticketing service operated for Optical
            Center (Israel pilot). It includes a WhatsApp business bot and an
            internal operations console.
          </p>
          <p className="t-body text-ink-2 leading-relaxed">
            We collect WhatsApp identifiers (phone numbers), message content and
            media submitted for fault reports, store identification codes, ticket
            metadata, and login data for authorized staff. We use this data to
            open and manage maintenance tickets, communicate with reporters,
            assign technicians, improve service quality, and secure the system.
          </p>
          <p className="t-body text-ink-2 leading-relaxed">
            Messages are delivered via Meta WhatsApp Cloud API and processed on
            our systems for maintenance purposes only. We do not sell personal
            data. Data may be shared with Optical Center maintenance staff and
            essential infrastructure providers under appropriate safeguards.
          </p>
          <p className="t-body text-ink-2 leading-relaxed">
            Contact: Optical Center / MaintainOS Israel pilot — WhatsApp{' '}
            <span dir="ltr">+972 55-281-9086</span>. Last updated: 7 September
            2026.
          </p>
        </section>

        <footer className="border-t border-border pt-6 t-caption text-ink-3">
          <Link href="/terms" className="text-[var(--tenant)] underline-offset-2 hover:underline">
            תנאי שימוש
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
