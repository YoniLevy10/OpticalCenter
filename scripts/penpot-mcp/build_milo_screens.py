#!/usr/bin/env python3
"""Build MILO Alive boards in the currently connected Penpot file (File→Connect)."""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from penpot_mcp_client import PenpotMcpClient, PenpotMcpError, resolve_url  # noqa: E402

# Penpot execute_code supports top-level await
BUILD_CODE = r"""
const PAGE_NAME = 'MILO Alive';
const file = penpot.currentFile;
if (!file) throw new Error('No file connected');

let page = (file.pages || []).find(p => p.name === PAGE_NAME);
if (!page) {
  page = penpot.createPage();
  page.name = PAGE_NAME;
}
await penpot.openPage(page);

// clear previous MILO boards on this page
const existing = page.findShapes({ type: 'board' }) || [];
for (const b of existing) {
  if (b.name && String(b.name).startsWith('MILO /')) {
    try { b.remove(); } catch (e) {}
  }
}

const C = {
  canvas: '#EEF3F8',
  warm: '#F7F1EE',
  surface: '#FFFFFF',
  ink: '#1C2430',
  ink2: '#5A6573',
  ink3: '#8491A1',
  border: '#D7E0EA',
  tenant: '#E11D2E',
  critical: '#FF3B30',
  warning: '#FF9F0A',
  progress: '#007AFF',
  resolved: '#34C759',
  sunken: '#F0F4F8',
};

function board(name, x, y, w, h, fill) {
  const b = penpot.createBoard();
  b.name = name;
  b.x = x;
  b.y = y;
  b.resize(w, h);
  b.fills = [{ fillColor: fill || C.canvas, fillOpacity: 1 }];
  page.root.appendChild(b);
  return b;
}

function rect(parent, x, y, w, h, opts = {}) {
  const r = penpot.createRectangle();
  r.resize(w, h);
  r.x = parent.x + x;
  r.y = parent.y + y;
  if (opts.r != null) r.borderRadius = opts.r;
  r.fills = [{ fillColor: opts.fill || C.surface, fillOpacity: opts.op ?? 1 }];
  if (opts.stroke) {
    r.strokes = [{ strokeColor: opts.stroke, strokeWidth: 1, strokeOpacity: 1 }];
  }
  parent.appendChild(r);
  return r;
}

function label(parent, text, x, y, opts = {}) {
  const t = penpot.createText(String(text));
  if (!t) return null;
  t.x = parent.x + x;
  t.y = parent.y + y;
  try { t.fontFamily = 'Heebo'; } catch (e) {}
  t.fontSize = opts.size || 14;
  try { t.fontWeight = String(opts.weight || '400'); } catch (e) {}
  t.fills = [{ fillColor: opts.color || C.ink, fillOpacity: 1 }];
  parent.appendChild(t);
  return t;
}

// ——— Dashboard ———
const dash = board('MILO / Dashboard', 0, 0, 1440, 900);
rect(dash, 24, 24, 228, 852, { r: 28, fill: C.surface, op: 0.92, stroke: C.border });
rect(dash, 48, 52, 44, 44, { r: 14, fill: C.tenant });
label(dash, 'ML', 58, 64, { size: 14, weight: '700', color: '#FFFFFF' });
label(dash, 'MILO', 104, 58, { size: 16, weight: '700' });
label(dash, 'Optical Center', 104, 80, { size: 11, color: C.ink3 });
label(dash, 'דשבורד', 56, 140, { size: 13, weight: '600', color: C.progress });
label(dash, 'תקלות', 56, 176, { size: 13, color: C.ink2 });
label(dash, 'תיבת דואר', 56, 212, { size: 13, color: C.ink2 });
label(dash, 'סניפים', 56, 248, { size: 13, color: C.ink2 });
label(dash, 'בוקר טוב, יוני', 292, 52, { size: 26, weight: '700' });
label(dash, 'מה קורה עכשיו · מה דורש טיפול · מה הצעד הבא', 292, 88, { size: 13, color: C.ink2 });
rect(dash, 1220, 48, 176, 44, { r: 14, fill: C.tenant });
label(dash, 'תקלה חדשה', 1255, 60, { size: 14, weight: '600', color: '#FFFFFF' });

const stats = [
  { x: 292, title: 'חריגות SLA', v: '4', c: C.critical },
  { x: 568, title: 'ללא אחראי', v: '7', c: C.warning },
  { x: 844, title: 'בטיפול', v: '18', c: C.progress },
  { x: 1120, title: 'נסגרו היום', v: '11', c: C.resolved, w: 276 },
];
for (const s of stats) {
  rect(dash, s.x, 132, s.w || 260, 110, { r: 20, fill: C.surface, stroke: C.border });
  label(dash, s.title, s.x + 24, 156, { size: 12, color: C.ink2 });
  label(dash, s.v, s.x + 24, 188, { size: 36, weight: '700', color: s.c });
}

rect(dash, 292, 268, 1104, 540, { r: 24, fill: C.surface, op: 0.95, stroke: C.border });
label(dash, 'דורש תשומת לב', 320, 292, { size: 15, weight: '600' });
const rows = [
  { y: 340, t: 'מזגן אולם תצוגה לא מקרר', m: 'דיזנגוף · #OC-1042', badge: 'SLA +2ש׳', c: C.critical },
  { y: 410, t: 'תאורת ויטרינה כבויה', m: 'רמת אביב · #OC-1038', badge: 'SLA 40ד׳', c: C.warning },
  { y: 480, t: 'מדפסת קבלות — נייר תקוע', m: 'אשדוד · #OC-1031', badge: 'בטיפול', c: C.progress },
  { y: 550, t: 'דלת כניסה לא ננעלת', m: 'באר שבע · #OC-1029', badge: 'SLA +1ש׳', c: C.critical },
];
for (const row of rows) {
  rect(dash, 320, row.y, 12, 12, { r: 6, fill: row.c });
  label(dash, row.t, 348, row.y - 4, { size: 14, weight: '600' });
  label(dash, row.m, 348, row.y + 18, { size: 12, color: C.ink3 });
  rect(dash, 1180, row.y - 6, 160, 32, { r: 16, fill: C.surface, stroke: row.c });
  label(dash, row.badge, 1210, row.y + 2, { size: 12, weight: '600', color: row.c });
}

// ——— Login ———
const login = board('MILO / Login', 1560, 0, 1440, 900, '#1C2430');
rect(login, 500, 180, 440, 540, { r: 28, fill: C.surface, op: 0.96 });
rect(login, 696, 224, 48, 48, { r: 14, fill: C.tenant });
label(login, 'ML', 706, 236, { size: 16, weight: '700', color: '#FFFFFF' });
label(login, 'MILO', 680, 290, { size: 28, weight: '700' });
label(login, 'Maintenance Intelligence & Logistics Operations', 540, 330, { size: 12, color: C.ink2 });
label(login, 'כניסה · Optical Center', 620, 358, { size: 12, color: C.ink3 });
label(login, 'אימייל', 540, 410, { size: 12, color: C.ink2 });
rect(login, 540, 432, 360, 48, { r: 12, fill: C.sunken, stroke: C.border });
label(login, 'you@opticalcenter.co.il', 560, 446, { size: 14 });
label(login, 'סיסמה', 540, 510, { size: 12, color: C.ink2 });
rect(login, 540, 532, 360, 48, { r: 12, fill: C.sunken, stroke: C.border });
label(login, '••••••••', 560, 546, { size: 14 });
rect(login, 540, 612, 360, 52, { r: 14, fill: C.tenant });
label(login, 'כניסה למערכת', 650, 628, { size: 15, weight: '600', color: '#FFFFFF' });

// ——— Tech iPhone ———
const tech = board('MILO / Tech iPhone', 3120, 0, 430, 932, C.warm);
label(tech, 'היום · טכנאי', 40, 72, { size: 12, color: C.ink3 });
label(tech, 'העבודות שלי', 40, 100, { size: 28, weight: '700' });
label(tech, '2 דחופות · ממשק בסגנון iPhone', 40, 140, { size: 13, color: C.ink2 });
const jobs = [
  { y: 190, t: 'מזגן אולם תצוגה', m: 'דיזנגוף', badge: 'SLA חריגה', c: C.critical },
  { y: 318, t: 'דלת כניסה', m: 'באר שבע', badge: 'עד 14:00', c: C.warning },
  { y: 446, t: 'מדפסת קבלות', m: 'אשדוד', badge: 'בטיפול', c: C.progress },
];
for (const j of jobs) {
  rect(tech, 24, j.y, 382, 108, { r: 24, fill: C.surface, op: 0.9, stroke: C.border });
  label(tech, j.t, 48, j.y + 28, { size: 15, weight: '600' });
  label(tech, j.m, 48, j.y + 56, { size: 12, color: C.ink2 });
  rect(tech, 280, j.y + 22, 102, 28, { r: 14, fill: C.surface, stroke: j.c });
  label(tech, j.badge, 290, j.y + 28, { size: 11, weight: '600', color: j.c });
}
rect(tech, 28, 820, 374, 72, { r: 28, fill: C.surface, op: 0.92, stroke: C.border });
label(tech, 'בית', 70, 848, { size: 12, color: C.ink3 });
label(tech, 'תקלות', 150, 848, { size: 12, weight: '700', color: C.tenant });
label(tech, 'דיווח', 245, 848, { size: 12, color: C.ink3 });
label(tech, 'עוד', 335, 848, { size: 12, color: C.ink3 });

// ——— Tickets ———
const tickets = board('MILO / Tickets', 0, 1020, 1440, 900);
label(tickets, 'תקלות', 48, 40, { size: 26, weight: '700' });
label(tickets, 'תור צפוף · מיון לפי דחיפות', 48, 76, { size: 13, color: C.ink2 });
const cols = ['חריג', 'פתוח', 'בטיפול', 'ממתין לסניף'];
cols.forEach((c, i) => {
  const x = 48 + i * 340;
  rect(tickets, x, 120, 320, 720, { r: 20, fill: C.surface, op: 0.95, stroke: C.border });
  label(tickets, c, x + 20, 140, { size: 14, weight: '600' });
  for (let k = 0; k < 3; k++) {
    const y = 190 + k * 120;
    rect(tickets, x + 16, y, 288, 100, { r: 16, fill: C.canvas, stroke: C.border });
    label(tickets, 'תקלה #' + (1040 - i * 3 - k), x + 32, y + 24, { size: 13, weight: '600' });
    label(tickets, 'סניף פיילוט · SLA', x + 32, y + 52, { size: 12, color: C.ink2 });
  }
});

return {
  ok: true,
  file: file.name,
  page: page.name,
  boards: ['MILO / Dashboard', 'MILO / Login', 'MILO / Tech iPhone', 'MILO / Tickets'],
};
"""


def main() -> int:
    url = resolve_url(None)
    client = PenpotMcpClient(url, timeout=180)
    client.initialize()
    info = client.probe()
    print(json.dumps({"probe": info}, ensure_ascii=False, indent=2))
    resp = client.call_tool("execute_code", {"code": BUILD_CODE}, timeout=180)
    text = client.unwrap_text(resp)
    print(text)
    if "No Penpot instance connected" in text:
        return 3
    if "Tool execution failed" in text or text.startswith("Error"):
        return 4
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except PenpotMcpError as e:
        print(
            json.dumps({"ok": False, "error": str(e), "exit_code": e.exit_code}, ensure_ascii=False),
            file=sys.stderr,
        )
        raise SystemExit(e.exit_code)
