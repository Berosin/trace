# TRACE — Ticket Reasoning & Agent Continuity Engine

> **Don't just pass the ticket. Pass the reasoning.**
> When the agent stops, the investigation doesn't.

**Live demo:** `https://trace-psi-five.vercel.app`

---

## The problem

Every support team eventually escalates tickets — L1 to L2, human to specialist,
one shift to the next. What actually gets passed along is a **conversation
transcript**. The new agent has to re-read it, re-derive what's already been ruled
out, and often re-ask the customer questions they've already answered.

Three failure modes show up constantly in real support operations:

- **Lost context on handoff** — the receiving agent starts from zero instead of
  from where the investigation actually left off.
- **Duplicate investigations** — five customers report the same outage in five
  different words, and five agents independently investigate the same root cause.
- **Lost work on failure** — an agent process crashes, a session times out, a tab
  closes — and the diagnostic progress made up to that point is just gone.

## The solution

TRACE is a multi-agent support escalation platform that treats **diagnostic
reasoning** — not conversation history — as the thing that gets persisted and
handed off. Every ticket carries a structured diagnostic state: extracted
entities, evidence gathered, hypotheses proposed and ruled out, a confidence
score, and a recommended next action. That state is what moves between agents,
what gets checked for overlap with other tickets, and what survives a crash.

It demonstrates three things live, under manual control (no scripted demo,
no canned scenarios — every investigative step is a real LLM call reasoning
over whatever problem you actually type in):

1. **Reasoning handoff** — L1 → L2 transfers structured diagnostic state, not a
   chat log. The L2 agent picks up mid-investigation with full context and no
   re-triage.
2. **Cross-ticket correlation** — a correlation agent checks new tickets against
   every open incident and merges matches instead of letting duplicate
   investigations run in parallel. Resolving the root cause on one ticket
   cascades resolution to every correlated sibling.
3. **Crash recovery** — kill the L2 agent mid-investigation and a *different*
   agent process — one that has never seen this ticket before — reads the
   persistent, hash-chained ledger and resumes from the exact recorded next
   action, instead of starting over.

## How the reasoning actually works

Nothing in this system is keyword-matched or scripted. Four functions in
[`server/src/services/reasoning.service.ts`](server/src/services/reasoning.service.ts)
each make a real inference call to Groq with a schema-describing prompt:

| Function | Called when | What it does |
|---|---|---|
| `runL1Triage` | Run L1 triage | Extracts entities, proposes competing hypotheses, simulates diagnostic actions and their findings, rules hypotheses out, sets confidence + next action |
| `continueL2Investigation` | Start L2 investigation | Receives only the structured diagnostic state (not a transcript), continues the investigation with deeper actions |
| `runRecoveryInvestigation` | Start recovery agent | Given the ledger's persisted state and nothing else, resumes from the recorded next action rather than restarting |
| `synthesizeResolution` | Resolve | Synthesizes a root-cause statement from the full accumulated diagnostic state |

`server/src/services/groq.ts` is the only module that talks to the LLM network —
pointing this at a different OpenAI-compatible provider is a one-file change.

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | React + Vite + TypeScript + Tailwind | Fast dev loop, small bundle |
| Backend | Node + Express + TypeScript + Socket.IO | Live updates to the UI as agents work |
| LLM inference | [Groq](https://console.groq.com/keys) (free tier) | Real inference, fast enough that every button click still feels instant |
| Database | [Supabase](https://supabase.com) (Postgres) | Real persistence, generous free tier, no infra to manage |
| Correlation | Jaccard similarity over extracted entities/keywords | No vector DB needed at this scope — swappable behind `correlation.service.ts` |
| Provenance | Hash-chained, append-only ledger | Every action tamper-evident and independently verifiable |

## Design

The UI is a deliberate brutalist system — cream (`#EFEBDD`) background, near-black
ink, a single accent orange (`#EA580C`), zero border-radius, hard 4px offset
shadows, JetBrains Mono throughout. The logo is the product's actual mechanic
turned into a mark: three investigative paths converge, two get ruled out
(faded), one traces through to a confirmed resolution.

The app opens with a one-shot animated boot sequence (skippable) — the logo
draws itself in via a clip-path reveal, a terminal-style log types out, and the
screen slams open into the live dashboard, which has already started loading
real data underneath it.

## Architecture

```
trace/
├── supabase/
│   └── schema.sql        Postgres schema: tickets, incidents, ledger_entries,
│                          atomic counters (run this in Supabase's SQL Editor)
├── server/                Express + TypeScript API
│   └── src/
│       ├── data/          Supabase client + store.ts (the persistence boundary —
│       │                  the only module that knows storage is Postgres)
│       ├── services/      reasoning.service (LLM calls), agents.service
│       │                  (ticket lifecycle orchestration), correlation.service,
│       │                  ledger.service, ticket.service, groq.ts
│       ├── routes/        REST endpoints (tickets, incidents, ledger)
│       └── sockets/       Socket.IO — live ticket/incident/ledger updates
└── client/                 React + Vite + TypeScript + Tailwind UI
    └── src/
        ├── pages/          Dashboard, Tickets, TicketDetails, Incidents, Ledger
        ├── components/     WorkflowHub, IntroScreen, BrandMark, Atoms, Layout
        ├── hooks/          Live store (REST fetch + Socket.IO subscriptions)
        └── services/       api.ts, socket.ts
```

**The ledger is hash-chained**: every ticket creation, agent action, evidence
item, and decision is recorded and chained to the previous entry via SHA-256
(`prevHash` + payload → `hash`). `GET /api/ledger/verify` walks the entire chain
and confirms it's unbroken — this is what makes the crash-recovery story provable
rather than just claimed.

## Setup (local development)

You need a free [Groq API key](https://console.groq.com/keys) and a free
[Supabase project](https://supabase.com).

**1. Set up Supabase:**
- Create a new project at supabase.com
- SQL Editor → New query → paste the contents of `supabase/schema.sql` → Run
- Settings → API → copy the **Project URL** and the **`service_role`** secret key
  (not `anon` — this backend needs write access and isn't a per-user client)

**2. Backend:**
```bash
cd server
cp .env.example .env      # fill in GROQ_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
npm install
npm run dev                # http://localhost:4000
```
A clean boot looks like:
```
TRACE API listening on http://localhost:4000
LLM provider: groq:llama-3.3-70b-versatile
Storage: Supabase
```

**3. Frontend:**
```bash
cd client
npm install
npm run dev                 # http://localhost:5173
```

Open `http://localhost:5173`.

## Deployment

This app is split across three free-tier services:

| Service | Hosts | Why here |
|---|---|---|
| **Render** | Backend (`server/`) | Runs as a persistent Node process, not serverless — needed for Socket.IO's long-lived WebSocket connections |
| **Vercel** | Frontend (`client/`) | Fast static hosting, trivial GitHub-connected deploys |
| **Supabase** | Database | Already covered above |

**Backend on Render** — Web Service, root directory `server`, build command
`npm install && npm run build`, start command `npm run start`. Environment
variables: `GROQ_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (and
optionally `GROQ_MODEL`). Don't set `PORT` — Render injects its own.

**Frontend on Vercel** — root directory `client`, framework preset **Vite**
(auto-detected). Environment variable: `VITE_API_URL` set to your Render backend's
URL (no trailing slash) — this is what makes the deployed static frontend find
the deployed backend instead of trying relative `/api` paths, which only resolve
locally via Vite's dev-server proxy. `client/vercel.json` handles the SPA
rewrite so client-side routes survive a page refresh.

A `docker-compose.yml` is included as an alternative to running `server/` and
`client/` natively — `server/Dockerfile` builds and runs the compiled production
output (`npm run build` → `npm run start`); local Compose overrides that with
`npm run dev` for hot-reload.

## How to use it (manual, step by step)

1. **Tickets → New ticket.** Write a real problem in your own words, or start
   from one of the editable examples. This is the only "seed" content in the
   whole app — nothing auto-populates, and the reasoning engine doesn't key off
   any particular wording.
2. Open the ticket. **Agent controls** only enables the button valid for the
   ticket's current state:
   - **Run L1 triage** — real inference call: entities, competing hypotheses,
     simulated diagnostic actions and findings, ruled-out hypotheses, confidence,
     next recommended action.
   - **Escalate to L2** — packages the diagnostic state into a structured handoff
     (visible in the ledger), then runs correlation against every open incident.
   - **Start L2 investigation** — a second, independent inference call that
     receives only the structured state and continues, with no re-triage.
   - **Crash L2 agent** — simulates an infra fault mid-investigation.
   - **Start recovery agent** — a fresh inference call, given only the ledger's
     persisted state, that must resume from the recorded next action.
   - **Resolve** — synthesizes a root-cause statement and, if the ticket is
     linked to an incident, cascades resolution to correlated siblings.
3. Watch the **diagnostic state** panel and the **ledger** update live after each
   click.
4. To see correlation concretely: file two tickets describing the same
   underlying problem in different words, run L1 on both, escalate the second —
   it should link to the incident the first one opened, and resolving either one
   resolves both.

## Honest scope notes

A few deliberate simplifications, made explicitly rather than silently:

- **Correlation** uses Jaccard similarity over extracted entities and subject
  keywords, not vector embeddings. It's genuinely general-purpose (works on
  whatever the LLM extracts from any ticket), just not semantic — a real
  embedding-based upgrade would slot in behind `correlation.service.ts` without
  touching anything else.
- **Ledger writes under concurrency**: seq numbers are allocated atomically (a
  real Postgres function), but reading the previous entry's hash and inserting
  the new row are two separate round trips. For this app's usage pattern — one
  operator driving one ticket's actions at a time — that's a non-issue. Fully
  concurrent-safe would mean moving the hash computation into a Postgres
  function so allocate+insert happen in one transaction.
- **No auth, permissive CORS.** There's no per-user account model — this is a
  single shared operational dataset, matching how the original in-memory
  prototype worked. Fine for a demo; add auth and lock down CORS before this
  goes anywhere near real customer data.

## What's next

- Real embedding-based correlation (Qdrant or pgvector)
- Auth + per-team data isolation
- A second, specialized reasoning path for infrastructure/API-style tickets
  vs. billing/account tickets
- Slack/email intake instead of manual ticket filing

---

Built for `Tenori hackathon`.