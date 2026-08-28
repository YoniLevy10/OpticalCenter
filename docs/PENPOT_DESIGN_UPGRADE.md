# אפשרות שדרוג: Penpot (קוד פתוח) במקום Figma

**מקור:** [Instagram · techs · slide Penpot / `penpot-mcp`](https://www.instagram.com/p/Dbv_R9ggfcV/?img_index=8)  
**סטטוס:** אופציונלי · לא חוסם פיילוט  
**יישור:** [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md) נשאר מקור האמת בקוד

---

## למה זה רלוונטי ל־MaintainOS

במחקר הארכיטקטורה נקבע ש־**Figma MCP לא מחובר** ושעובדים **code-first**.  
השקופית ששותפה מציגה את **Penpot** — חלופת Figma בקוד פתוח — ואת **`penpot/penpot-mcp`** (MCP רשמי; כיום ב־[`penpot/penpot` → `mcp`](https://github.com/penpot/penpot/tree/develop/mcp)).

| כלי | עלות טיפוסית | תפקיד אצלנו |
|-----|----------------|-------------|
| Figma | ~$45 / editor / חודש | moodboards / handoff (אופציונלי) |
| **Penpot + MCP** | חינם · self-host או cloud | אותו תפקיד + חיבור ל־Cursor ב־MCP |

**החלטה מומלצת:** להישאר code-first לפיילוט; לאמץ Penpot כשצריך קנבס עיצובי לבעלי עניין או design↔code עם סוכן — בלי מנוי Figma.

---

## מה כבר בריפו

| נתיב | תפקיד |
|------|--------|
| `src/app/globals.css` | טוקנים חיים |
| `npm run tokens:export` | מייצא `design-tokens/maintainos.tokens.json` (DTCG + רשימת צבעים ל־Penpot) |
| `.cursor/mcp.penpot.example.json` | דוגמת חיבור MCP מקומי |
| `scripts/figma-capture-*.mjs` | נשארים לעבודה ישנה עם Figma Capture — לא חובה |

---

## התקנה מהירה (מפתח מקומי)

### 1. ייצוא טוקנים

```bash
npm run tokens:export
```

ב־Penpot: ספריית צבעים בשם **MaintainOS** ← העתיקו את `penpot.colors` מהקובץ המיוצא.

### 2. הרצת Penpot MCP

```bash
npx -y @penpot/mcp@latest
```

- Plugin server: `http://localhost:4400/manifest.json`
- MCP HTTP: `http://localhost:4401/mcp`

### 3. חיבור ב־Penpot

1. [design.penpot.app](https://design.penpot.app) (או מופע self-hosted)
2. Plugins → טענו את ה־manifest המקומי
3. «Connect to MCP server»

### 4. חיבור ב־Cursor

מזגו את `.cursor/mcp.penpot.example.json` לתוך `.cursor/mcp.json` (או `npx -y add-mcp -g -n penpot http://localhost:4401/mcp`), ואז הפעילו מחדש את Cursor.

---

## זרימת עבודה מומלצת

```
globals.css (SoT)
    → npm run tokens:export
    → ספריית צבעים ב־Penpot
    → מסכי Ops / Tech ב־Penpot (אופציונלי)
    → Penpot MCP ↔ Cursor (design→code / code→design)
    → יישום ב־src/app + Storybook
```

כללים:

1. **אל תכפילו מערכת עיצוב** — שינוי צבע/רדיוס רק ב־`globals.css`, ואז `tokens:export`.
2. Penpot משמש לסינכרון ויזואלי ולבעלי עניין — לא כמקור אמת לפרודקשן.
3. אל תריצו MCP Penpot ב־CI / Cloud Agent בלי שרת מקומי פעיל.

---

## כלים סמוכים מאותו קרוסלה (לא חלק מהשדרוג הזה)

| # | פרויקט | רלוונטיות ל־MaintainOS |
|---|--------|-------------------------|
| n8n | אוטומציית workflows | עתידי: אירועי תקלה / `vendor.webhook_url` |
| Cal.com | תיאום פגישות | עתידי: שיבוץ טכנאים |
| AppFlowy | מסמכים | תיעוד פנימי — לא במוצר |

---

## קבצים קשורים

- [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md)
- [`OPTICAL_CENTER_ARCHITECTURE_RESEARCH.md`](./OPTICAL_CENTER_ARCHITECTURE_RESEARCH.md) §10
- [`UX_IMPROVEMENT_PLAN.md`](./UX_IMPROVEMENT_PLAN.md)
