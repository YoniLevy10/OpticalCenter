import {
  Building2,
  ChevronDown,
  LayoutDashboard,
  MessageCircle,
  ScanLine,
  Settings2,
  UsersRound,
} from 'lucide-react'

const sampleCases = [
  {
    branch: 'סניף 024',
    channel: 'QR',
    issue: 'תקלה בתאורה באזור המכירה',
    status: 'חדשה',
  },
  {
    branch: 'סניף 118',
    channel: 'WhatsApp',
    issue: 'בדיקת מערכת מיזוג',
    status: 'בטיפול',
  },
]

export function OpcProductPreview() {
  return (
    <div className="opc-product-preview">
      <div
        className="opc-preview-frame"
        role="img"
        aria-label="המחשת ממשק OPC: לוח טיפול שמציג דיווחים, סניפים וסטטוסי טיפול. התוכן לדוגמה בלבד."
      >
        <div aria-hidden="true">
          <div className="opc-preview-windowbar">
            <span className="opc-preview-window-dots">
              <span />
              <span />
              <span />
            </span>
            <span className="opc-preview-address" dir="ltr">opc / operations</span>
            <span className="opc-preview-window-action" />
          </div>

          <div className="opc-preview-toolbar">
            <div className="opc-preview-app-brand">
              <span className="opc-preview-brand-mark" dir="ltr">O</span>
              <span dir="ltr">OPC</span>
            </div>
            <span className="opc-preview-toolbar-divider" aria-hidden="true" />
            <span className="opc-preview-toolbar-title">מרכז תפעול</span>
            <span className="opc-preview-demo-label">תצוגה להמחשה</span>
          </div>

          <div className="opc-preview-layout">
            <aside className="opc-preview-sidebar">
              <span className="opc-preview-nav-item opc-preview-nav-active">
                <LayoutDashboard size={17} />
              </span>
              <span className="opc-preview-nav-item">
                <MessageCircle size={17} />
              </span>
              <span className="opc-preview-nav-item">
                <Building2 size={17} />
              </span>
              <span className="opc-preview-nav-item">
                <UsersRound size={17} />
              </span>
              <span className="opc-preview-nav-spacer" />
              <span className="opc-preview-nav-item">
                <Settings2 size={17} />
              </span>
            </aside>

            <section className="opc-preview-main">
              <div className="opc-preview-breadcrumb">סקירה <span>/</span> קריאות</div>
              <div className="opc-preview-heading">
                <div>
                  <span className="opc-preview-overline">תפעול הרשת</span>
                  <h3>קריאות ופעולות</h3>
                </div>
                <span className="opc-preview-filter">
                  כל הסניפים
                  <ChevronDown size={14} />
                </span>
              </div>

              <div className="opc-preview-lifecycle" aria-label="שלבי טיפול">
                <span>דיווח</span>
                <span>שיוך</span>
                <span>טיפול</span>
                <span>סגירה</span>
              </div>

              <div className="opc-preview-list-heading">
                <div>
                  <strong>אירועים אחרונים</strong>
                  <span>דוגמה לרצף הטיפול</span>
                </div>
                <span className="opc-preview-list-count">לוח עבודה</span>
              </div>

              <div className="opc-preview-case-list">
                {sampleCases.map((item) => (
                  <article className="opc-preview-case" key={item.branch}>
                    <div className="opc-preview-case-main">
                      <span className="opc-preview-case-icon">
                        <ScanLine size={17} />
                      </span>
                      <div className="opc-preview-case-copy">
                        <span className="opc-preview-case-meta">
                          {item.branch}
                          <span aria-hidden="true">·</span>
                          {item.channel}
                        </span>
                        <strong>{item.issue}</strong>
                      </div>
                    </div>
                    <span className="opc-preview-case-status">{item.status}</span>
                  </article>
                ))}
              </div>

              <div className="opc-preview-footer">
                <span className="opc-preview-footer-line" aria-hidden="true" />
                <span>פרטי אירוע, אחריות ועדכונים — במקום אחד</span>
              </div>
            </section>
          </div>
        </div>
      </div>
      <p className="opc-preview-caption">
        <span className="opc-status-dot" aria-hidden="true" />
        ממשק להמחשה · התוכן אינו נתוני מערכת
      </p>
    </div>
  )
}
