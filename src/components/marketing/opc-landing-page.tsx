import Link from 'next/link'
import {
  ArrowLeft,
  ArrowUp,
  BarChart3,
  Check,
  ClipboardCheck,
  Clock3,
  MessagesSquare,
  QrCode,
  type LucideIcon,
} from 'lucide-react'
import { OpcProductPreview } from './opc-product-preview'

type Capability = {
  number: string
  icon: LucideIcon
  title: string
  description: string
}

const capabilities: Capability[] = [
  {
    number: '01',
    icon: MessagesSquare,
    title: 'דיווח שמתחיל בשטח',
    description:
      'WhatsApp, QR, NFC או טופס — עם זיהוי ברור של הסניף והאירוע כבר מהצעד הראשון.',
  },
  {
    number: '02',
    icon: ClipboardCheck,
    title: 'טיפול שנשאר ברצף',
    description:
      'שיוך לגורם מטפל, מעקב SLA ותיעוד עד לסגירה, בלי לאבד את ההקשר בדרך.',
  },
  {
    number: '03',
    icon: BarChart3,
    title: 'תמונה שעוזרת להשתפר',
    description:
      'היסטוריה ודוחות שנועדו לחשוף עלויות, תקלות חוזרות והזדמנויות למניעה.',
  },
]

const workflowSteps = [
  {
    number: '01',
    title: 'מדווחים',
    description: 'מתחילים בערוץ שנוח לצוות בשטח — WhatsApp, QR או NFC.',
    icon: MessagesSquare,
  },
  {
    number: '02',
    title: 'מזהים',
    description: 'מחברים את הדיווח לסניף ולהיסטוריה הרלוונטית.',
    icon: QrCode,
  },
  {
    number: '03',
    title: 'מטפלים',
    description: 'שיוך, SLA ועדכונים מתועדים באותו רצף.',
    icon: ClipboardCheck,
  },
  {
    number: '04',
    title: 'לומדים',
    description: 'היסטוריה מצטברת עוזרת להבין מה חוזר ואיפה אפשר למנוע.',
    icon: BarChart3,
  },
]

function LandingHeader() {
  return (
    <>
      <aside className="opc-announcement" aria-label="סטטוס הפיתוח">
        <div className="opc-container opc-announcement-inner">
          <span className="opc-status-dot" aria-hidden="true" />
          <span>OPC נמצאת בשלבי פיתוח</span>
          <span className="opc-announcement-divider" aria-hidden="true" />
          <span className="opc-announcement-secondary">בונים תפעול ברור יותר לרשתות מרובות סניפים</span>
        </div>
      </aside>

      <header className="opc-header" id="top">
        <div className="opc-container opc-header-inner">
          <Link className="opc-brand" href="#top" aria-label="OPC — לעמוד הבית">
            <span className="opc-brand-mark" aria-hidden="true" />
            <span className="opc-brand-word" dir="ltr">OPC</span>
          </Link>

          <nav className="opc-nav" aria-label="ניווט ראשי">
            <Link href="#capabilities">מה המערכת עושה</Link>
            <Link href="#workflow">איך זה עובד</Link>
            <Link href="#development">שלב הפיתוח</Link>
          </nav>

          <Link className="opc-login-link" href="/login">
            כניסה לצוות
            <ArrowLeft aria-hidden="true" size={16} />
          </Link>
        </div>
      </header>
    </>
  )
}

function CapabilityItem({ capability }: { capability: Capability }) {
  const Icon = capability.icon

  return (
    <article className="opc-capability">
      <div className="opc-capability-topline">
        <span className="opc-capability-number" aria-hidden="true">{capability.number}</span>
        <Icon className="opc-capability-icon" aria-hidden="true" strokeWidth={1.7} />
      </div>
      <h3>{capability.title}</h3>
      <p>{capability.description}</p>
    </article>
  )
}

function WorkflowStep({ step }: { step: (typeof workflowSteps)[number] }) {
  const Icon = step.icon

  return (
    <li className="opc-workflow-step">
      <div className="opc-step-topline">
        <span className="opc-step-number" aria-hidden="true">{step.number}</span>
        <Icon className="opc-step-icon" aria-hidden="true" strokeWidth={1.7} />
      </div>
      <h3>{step.title}</h3>
      <p>{step.description}</p>
    </li>
  )
}

function DevelopmentNotice() {
  return (
    <section
      className="opc-development-section"
      id="development"
      aria-labelledby="opc-development-title"
    >
      <div className="opc-container">
        <div className="opc-development-panel">
          <div className="opc-development-icon" aria-hidden="true">
            <Clock3 size={22} strokeWidth={1.7} />
          </div>
          <div className="opc-development-copy">
            <p className="opc-development-label">סטטוס המוצר · בפיתוח</p>
            <h2 id="opc-development-title">המערכת עדיין נבנית, שלב אחר שלב.</h2>
            <p>
              היכולות והתהליכים המתוארים בעמוד מציגים את כיוון המוצר. הממשק והיקף
              היכולות ממשיכים להתגבש במהלך הפיתוח.
            </p>
          </div>
          <Link className="opc-back-to-top" href="#top">
            חזרה למעלה
            <ArrowUp aria-hidden="true" size={16} />
          </Link>
        </div>
      </div>
    </section>
  )
}

export function OpcLandingPage() {
  return (
    <div className="opc-landing" dir="rtl" lang="he">
      <a className="opc-skip-link" href="#main-content">דילוג לתוכן הראשי</a>
      <LandingHeader />

      <main id="main-content">
        <section className="opc-hero" aria-labelledby="opc-hero-title">
          <div className="opc-container opc-hero-grid">
            <div className="opc-hero-copy">
              <p className="opc-eyebrow">
                <span className="opc-eyebrow-mark" aria-hidden="true" />
                מערכת תפעולית לרשתות מרובות סניפים
              </p>
              <h1 className="opc-hero-title" id="opc-hero-title">
                כל מה שקורה בסניפים.
                <br />
                <span className="opc-hero-highlight">בתמונה תפעולית אחת.</span>
              </h1>
              <p className="opc-hero-description">
                OPC נבנית כדי לחבר דיווחי שטח, זיהוי סניפים ותהליכי טיפול — כך שכל
                אירוע יישאר מחובר למקום, לאנשים ולהחלטות שאחריו.
              </p>
              <div className="opc-hero-actions">
                <Link className="opc-button opc-button-primary" href="#workflow">
                  כך התהליך עובד
                  <ArrowLeft aria-hidden="true" size={18} />
                </Link>
                <Link className="opc-text-link" href="#capabilities">
                  מה נבנה ב־OPC?
                  <ArrowLeft aria-hidden="true" size={16} />
                </Link>
              </div>
              <p className="opc-hero-footnote">
                <Check aria-hidden="true" size={15} />
                פיתוח פעיל · היכולות מתגבשות בהדרגה
              </p>
            </div>

            <OpcProductPreview />
          </div>
        </section>

        <section
          className="opc-capabilities-section"
          id="capabilities"
          aria-labelledby="opc-capabilities-title"
        >
          <div className="opc-container">
            <div className="opc-section-heading">
              <p className="opc-eyebrow">ליבה תפעולית אחת</p>
              <h2 id="opc-capabilities-title">לא רק לפתוח קריאה. להבין את כל מה שסביבה.</h2>
              <p>
                במקום להעביר מידע בין ערוצים, אנשים וגיליונות, OPC נבנית סביב רצף
                אחד של דיווח, טיפול והקשר.
              </p>
            </div>

            <div className="opc-capabilities-grid">
              {capabilities.map((capability) => (
                <CapabilityItem capability={capability} key={capability.number} />
              ))}
            </div>
          </div>
        </section>

        <section
          className="opc-workflow-section"
          id="workflow"
          aria-labelledby="opc-workflow-title"
        >
          <div className="opc-container">
            <div className="opc-workflow-heading">
              <div>
                <p className="opc-eyebrow">מהדיווח ועד לתמונה הניהולית</p>
                <h2 id="opc-workflow-title">רצף אחד. ארבעה שלבים ברורים.</h2>
              </div>
              <p>
                כל מעבר בין שלבים שומר על ההקשר, כדי שהצוות וההנהלה יראו את אותה
                תמונה.
              </p>
            </div>

            <ol className="opc-workflow-grid">
              {workflowSteps.map((step) => (
                <WorkflowStep key={step.number} step={step} />
              ))}
            </ol>
          </div>
        </section>

        <section className="opc-network-section" aria-labelledby="opc-network-title">
          <div className="opc-container opc-network-grid">
            <div className="opc-network-copy">
              <p className="opc-eyebrow opc-eyebrow-inverse">נבנה לרשתות, לא לנקודות בודדות</p>
              <h2 id="opc-network-title">הסניף הוא לא רק שדה בטופס.</h2>
              <p>
                החיבור בין סניף, ציוד, צוות והיסטוריית תקלות הוא מה שהופך דיווח
                בודד לתמונה שאפשר לפעול לפיה.
              </p>
              <p className="opc-network-note">
                התשתית נבנית בהדרגה — מהיסודות שמחברים אירוע למקום, למטפל ולמה שקרה
                לפניו.
              </p>
            </div>

            <div className="opc-network-map" aria-label="הקשרים במערכת OPC">
              <div className="opc-network-map-heading">
                <span className="opc-network-map-kicker">הקשר תפעולי</span>
                <span className="opc-network-map-caption">חלקים שמתחברים לתמונה אחת</span>
              </div>
              <div className="opc-network-flow">
                <span className="opc-network-node">סניף</span>
                <span className="opc-network-connector" aria-hidden="true" />
                <span className="opc-network-node">דיווח</span>
                <span className="opc-network-connector" aria-hidden="true" />
                <span className="opc-network-node opc-network-node-core" dir="ltr">OPC</span>
                <span className="opc-network-connector" aria-hidden="true" />
                <span className="opc-network-node">טיפול</span>
                <span className="opc-network-connector" aria-hidden="true" />
                <span className="opc-network-node">היסטוריה</span>
              </div>
              <p className="opc-network-map-footnote">
                <span className="opc-status-dot" aria-hidden="true" />
                ההקשר נשאר רציף לאורך הדרך
              </p>
            </div>
          </div>
        </section>

        <DevelopmentNotice />
      </main>

      <footer className="opc-footer">
        <div className="opc-container opc-footer-inner">
          <Link className="opc-brand opc-footer-brand" href="#top" aria-label="OPC — לעמוד הבית">
            <span className="opc-brand-mark" aria-hidden="true" />
            <span className="opc-brand-word" dir="ltr">OPC</span>
          </Link>
          <p>מערכת תפעולית לרשתות מרובות סניפים</p>
          <Link href="/login">כניסה לצוות</Link>
        </div>
      </footer>
    </div>
  )
}
