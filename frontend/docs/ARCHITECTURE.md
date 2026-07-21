# FP Sovereign — Logic Tree → Code Map

## Architectural principle

```
Conversational UI  →  renders only
Deterministic Core →  src/lib/engine/* + state-machine (cannot be overridden by chat)
Relational DB      →  supabase/migrations (source of truth when deployed)
```

## 12-phase engine

| Phase | Spec name | Code module |
|------|-----------|-------------|
| 1 | Compliant parametric ingestion | `src/lib/engine/phases/phase1-ingestion.ts` |
| 2 | Capability arbitrage | `phase2-capability.ts` |
| 3 | Runway & survivability | `phase3-runway.ts` |
| 4 | Monte Carlo (1000 paths) | `phase4-monte-carlo.ts` |
| 5 | Market & regional matching | `phase5-matching.ts` |
| 6 | Friction index | `phase6-7-scoring.ts` |
| 7 | P_s calculator | `phase6-7-scoring.ts` |
| 8 | Dual-vector roadmap | `phase8-12-output.ts` |
| 9 | Psychological drive audit | `phase8-12-output.ts` |
| 10 | Ego-targeted presentation | `phase8-12-output.ts` |
| 11 | Strategy state lock | `src/lib/strategy-lock/lock-engine.ts` |
| 12 | Parkinsonian workspace | `phase8-12-output.ts` |

**Orchestrator:** `src/lib/engine/pipeline.ts` → `runSovereignPipeline()`

**API:** `POST /api/engine/onboard`

## Contradiction resolution (Section III)

| Incident | Detector | API |
|----------|----------|-----|
| High ambition / zero base | `resolveContradiction()` | `POST /api/intercept/chat` |
| Fatigue backtrack | `FATIGUE_BACKTRACK` | same |
| Fake task proof | `validateTaskProof()` | same |

## State machine

| Component | Path |
|-----------|------|
| States & enums | `src/types/domain.ts` |
| Valid / invalid transitions | `src/lib/state-machine/transitions.ts` |
| Single write gateway | `src/lib/state-machine/state-machine.ts` |

## Backend blueprint alignment (MVP)

| Blueprint section | Status |
|-------------------|--------|
| Section 2 — DB tables | `supabase/migrations/001_mvp_core.sql` (subset) |
| Section 3 — State machine | Implemented in TS |
| Section 4 — Strategy lock + SHA-256 | `lock-engine.ts` |
| Section 5–12 | Types + stubs; wire to Supabase in V2 |

## Frontend screens → engine

| UI screen | Engine hook |
|-----------|-------------|
| Onboarding phases 1–3 | `POST /api/engine/onboard` |
| Sovereign Terminal chat | `POST /api/intercept/chat` before send |
| Confrontation Lock | `FAKE_TASK_PROOF` / `FATIGUE_BACKTRACK` |
| Metric Matrix | `ProbabilitySnapshot` / capability_scores |
| Trajectory Simulator | Phase 4 distribution + Phase 8 paths |

## Next implementation steps

1. Supabase project + `NEXT_PUBLIC_SUPABASE_URL` / anon key
2. Auth (Supabase Auth) → attach `user_id` to pipeline
3. Edge Functions: move `runSovereignPipeline` behind service role
4. AI Orchestration: Strategy/Execution agents call engine, never replace it
5. Realtime: `strategy.locked`, `task.missed` → frontend subscriptions
