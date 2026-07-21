# FP Sovereign

Professional **Deterministic Execution Engine** — AXIOM-grade UI, 12-phase sovereign logic core, immutable strategy lock, and Supabase-ready backend schema.

## Highlights

- **Sovereign Terminal** — vault · chat · live metrics · Parkinsonian sprint
- **Command palette** — `⌘K` / `Ctrl+K`
- **Focus mode** — `⌘.` / `Ctrl+.`
- **12-phase engine** — `POST /api/engine/onboard`
- **Contradiction intercept** — `POST /api/intercept/chat`
- **Persistent session** — local state survives refresh

## Design fusion

| Influence | What you get |
|-----------|----------------|
| **Vercel / Geist** | Typography, void black, engineering clarity |
| **Apple** | Glass depth, motion curves, focus mode, breathing void |
| **Gemini** | Spacious conversational corridor, calm AI presence |
| **Linux / Terminal** | OBJ sprint chrome, monospace metrics, lock states |

## Screens (FP v1.0 locked)

1. **Sovereign Terminal** — Vault panel · Chat · Metric matrix + Parkinson sprint
2. **Vault Configuration Matrix** — Four registers + mission ledger table
3. **Trajectory Graph Simulator** — Monte Carlo paths + active P_s route

## Run locally

Requires **Node.js 18+**.

```bash
cd C:\Users\Hp\fp-sovereign
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Internal Server Error (500)?

Usually a **corrupted `.next` cache** (e.g. running `npm run build` while `npm run dev` is still running). Fix:

```powershell
# Stop dev server (Ctrl+C), then:
Remove-Item -Recurse -Force .next
npm run dev
```

Or use: `npm run dev:clean`

- Complete onboarding → **Lock trajectory** → main app
- `Ctrl+.` / `⌘.` — Focus mode (hide side panels)
- Demo confrontation: wait for sprint expiry or trigger via store

## Stack

- Next.js 15 (App Router)
- React 19
- Tailwind CSS 3
- Framer Motion
- Recharts
- Geist fonts
- Zustand (client state)

## Project structure

```
src/
  app/           layout, globals, page
  components/    chat, terminal, screens, nav, ui
  lib/           mock data, utils
  store/         app state
```

## Sovereign Engine (logic tree)

The **12-phase deterministic core** lives in `src/lib/engine/` and runs via:

- `POST /api/engine/onboard` — full pipeline through Phase 12
- `POST /api/intercept/chat` — contradiction resolver + strategy lock middleware

See **`docs/ARCHITECTURE.md`** for the logic-tree → code map.

**Supabase schema (MVP):** `supabase/migrations/001_mvp_core.sql`

Copy `.env.example` → `.env.local` when connecting Supabase + AI agents (V2).
