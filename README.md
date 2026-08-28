# TRACE — Ticket Reasoning & Agent Continuity Engine

> **Don't just pass the ticket. Pass the reasoning.**
> When the agent stops, the investigation doesn't.

TRACE is a fault-tolerant, multi-agent support escalation platform that preserves
**diagnostic reasoning** across ticket handoffs, instead of just a transcript.

Every investigative step in this build is a real call to an LLM (Groq, free tier) reasoning
over the ticket's actual text or actual accumulated diagnostic state. There is no scripted
demo and no keyword-matched scenario — type any support problem and the agents investigate
that specific problem.

It demonstrates three things live, in the UI, under your manual control:

1. **Reasoning Handoff** — L1 → L2 transfers structured diagnostic state (entities,
   evidence, actions attempted, ruled-out hypotheses, current hypothesis, confidence,
   next action), not a chat log.
2. **Cross-Ticket Correlation** — a correlation agent recognizes when several tickets
   share a root incident and merges them instead of starting duplicate investigations.
3. **Crash Recovery** — you can kill the L2 agent mid-investigation and a replacement
   agent reads the persistent, hash-chained ledger and resumes exactly where it left off.

## Architecture

- **Frontend**: React + Vite + TypeScript + Tailwind, styled around a blue/white
  chinoiserie "Dutch door" motif.
- **Backend**: Node + Express + TypeScript + Socket.IO.
- **Reasoning**: `server/src/services/reasoning.service.ts` — four functions
  (`runL1Triage`, `continueL2Investigation`, `runRecoveryInvestigation`,
  `synthesizeResolution`), each a live Groq inference call with a schema-describing
  prompt. `server/src/services/groq.ts` is the only module that talks to the network,
  so pointing this at a different OpenAI-compatible provider is a one-file change.
- **Storage**: an in-memory, hash-chained, append-only ledger
  (`server/src/data/store.ts`). Every ticket, agent action, evidence item, and decision
  is recorded and chained to the previous entry (tamper-evident, verifiable via
  `GET /api/ledger/verify`). A `docker-compose.yml` is included if you want to swap in
  real MongoDB later — the store module is the only thing that would need to change.
- **Correlation**: Jaccard similarity over extracted entities + subject keywords — no
  vector DB required for the scope of this build, swappable behind
  `correlation.service.ts` if you want to add real embeddings later.

## Setup

You need a free Groq API key: https://console.groq.com/keys

```bash
cd server
cp .env.example .env      # then paste your key into GROQ_API_KEY=
npm install
npm run dev                # http://localhost:4000
```

```bash
cd client
npm install
npm run dev                 # http://localhost:5173
```

Open `http://localhost:5173`.

## How to use it (manual, step by step — built for presenting live)

1. Go to **Tickets → New ticket**. Write a real problem in your own words (or start from
   one of the editable examples). This is the only "seed" data in the whole app — nothing
   auto-populates.
2. Open the ticket. The **Agent controls** panel only enables the button valid for the
   ticket's current state:
   - **Run L1 triage** — one real inference call. Extracts entities, proposes competing
     hypotheses, simulates diagnostic actions and their findings, rules hypotheses out,
     sets a confidence score and a next recommended action.
   - **Escalate to L2** — packages the current diagnostic state into a structured
     handoff (visible in the ledger), then runs the correlation agent against every open
     incident.
   - **Start L2 investigation** — a second, independent inference call that receives only
     the structured state (not a transcript) and continues the investigation.
   - **Crash L2 agent** — simulates an infra fault mid-investigation.
   - **Start recovery agent** — a fresh inference call that has never seen this ticket,
     given only the ledger's persisted state, and must resume from the recorded next
     action rather than restart.
   - **Resolve** — synthesizes a root-cause statement from the full diagnostic state and,
     if this ticket is linked to an incident, cascades resolution to correlated siblings.
3. Watch the **diagnostic state** panel and the **ledger** update live after each click —
   this is what to point judges at.
4. To demonstrate correlation concretely: create two tickets describing the same
   underlying problem in different words, run L1 on both, then escalate the second one —
   it should link to the incident the first one opened.

## Structure

```
trace/
├── server/     Express + TypeScript API, Socket.IO, ledger + real agent reasoning
└── client/     React + Vite + TypeScript + Tailwind UI
```
