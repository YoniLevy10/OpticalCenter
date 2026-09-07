# Messaging cost policy (Israel pilot)

Goal: keep WhatsApp spend near-zero for fault reporting.

## Allowed (prefer free Meta service window)
1. Employee scans QR/NFC → opens WhatsApp → **employee writes first** (user-initiated).
2. Bot replies inside the **24h service window**: ask store/description, confirm ticket `#OC-…`.
3. Optional one follow-up question in the same window.

## Avoid (paid / high cost)
1. Business-initiated template blasts to all stores.
2. Status spam on every ticket transition (`assigned`, `in_progress`, …) via WhatsApp.
3. One Meta number per store (rejected — one number **per country**).

## Preferred notification channels
| Audience | Channel |
|----------|---------|
| Store reporter | WhatsApp replies in open session only |
| HQ | Web `/ops` (SoT) |
| Technician | **SMS (019)** on assign + WhatsApp deep link to `/tech/{id}` (Bamakor parity) |

## Providers
- Default WhatsApp: **Meta Cloud API direct**
- Technician assign SMS: **019SMS** (`SMS_019_*` env) — “שיוך חדש · תקלה … + חנות + קישור”.  
  Sender must be **≤11 English letters/digits** (019 API). Hebrew / spaces are rejected.  
  Recommended: `SMS_019_SENDER=OpticalCtr` (register that source in the 019 dashboard).  
  Do **not** use the WhatsApp E.164 number as sender if you want a branded name.
- Aggregators (e.g. Sent.dm) do **not** remove Meta conversation fees; evaluate later for broader SMS/RCS
