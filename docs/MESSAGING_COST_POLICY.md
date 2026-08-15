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
| Technician | Web/PWA `/tech` (+ optional future push/email) |

## Providers
- Default: **Meta Cloud API direct**
- Aggregators (e.g. Sent.dm) do **not** remove Meta conversation fees; evaluate later only for SMS/RCS fallback
