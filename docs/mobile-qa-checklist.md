# Mobile / PWA flow QA checklist

Device: iPhone Safari → Add to Home Screen (standalone).

**Status:** implementation complete on `cursor/mobile-pwa-qa` — run this list on a real device to start the test series.

## HQ (MaintainOS Ops)

- [ ] Install PWA from Safari (Share → Add to Home Screen); opens `/ops`
- [ ] Overview KPIs tappable → Issues / Stores
- [ ] Bottom nav: Overview / Issues / Stores / More
- [ ] More drawer: Maintenance stub, Reports, Settings, Simulator, Tech, Login
- [ ] Issues: card list (not 7-col table); filter sheet works
- [ ] Ticket detail: sticky Status / Assign above home indicator
- [ ] Assign + status sheets sit above bottom nav
- [ ] Stores: store cards + large WhatsApp button
- [ ] Safe area: nav and toasts clear the home indicator
- [ ] Deep link `/ops/tickets/[id]` opens inside installed app
- [ ] SW update banner appears on new deploy (not silent)
- [ ] Top bar profile → Login; desktop sidebar dense

## Tech portal

- [ ] `/tech` uses tech manifest; installable separately
- [ ] Job cards + tabs; claim / status in ≤4 taps
- [ ] Camera / gallery photo + note save works
- [ ] Safe-area header + bottom nav
- [ ] Quiet tokens (no zinc/sky chrome)

## Desktop regression

- [ ] Sidebar + slim search top bar + profile at `md+`
- [ ] Issues + Stores still dense tables
- [ ] Ticket actions in side panel (not sticky bar)
