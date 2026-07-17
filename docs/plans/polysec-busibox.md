---

## title: polysec on busibox
status: staging
destination: github.com/jazzmind/polysec (docs/spec.md once repo is bootstrapped)
last_updated: 2026-04-17

# polysec on busibox — plan

Rebuild polysec as a private, self-hosted OSCAP/OSCAL-aware compliance documentation and evidence platform on top of busibox. Framework definitions come from NIST OSCAL catalogs (SOC2, ISO 27001, HIPAA, CMMC, FedRAMP baselines) ingested into busibox data-api. Documents + evidence go through busibox's hybrid search + ingest pipeline. Agents (Pydantic-AI in `srv/agent`) handle gap analysis, evidence-to-control mapping, access-review reminders, and audit-defense narrative generation. Evidence automation pulls from GitHub, GitLab, Google Workspace, Okta, and AWS via Prowler on scheduled cadences via busibox's apscheduler.

## 1. Where it lives

- **New private repo**: `github.com/jazzmind/polysec` (cloned from `busibox-template`)
- App registered via [busibox-template/busibox.json](https://github.com/jazzmind/busibox-template/blob/main/busibox.json) as `{ id: "polysec", defaultPort: 3011, appMode: "frontend" }`
- Agents + workflows + tools are **seeded into busibox's** `agent_definitions` / `tool_definitions` / `workflow_definitions` tables (Postgres) via a seed script shipped in the polysec repo, consumed by `srv/agent` at startup
- Staging plan file: `platform/docs/plans/polysec-busibox.md` (this file) — copied to `polysec/docs/spec.md` when repo is created

## 2. Decisions (defaults)

- **OSCAL depth**: OSCAL-inspired internal model + ingest of upstream catalogs/profiles. Export to OSCAL `assessment-results` at v1.1 once the internal model is stable. No SSP round-trip in v1.
- **Evidence integrations v1**: GitHub (branch protection, required reviews, secret scanning, 2FA enforcement), GitLab (same), Google Workspace (user list, 2FA status, org units), Okta (users, groups, policies via SCIM/API), AWS via Prowler (scheduled scan → findings ingested). **Roadmap**: Azure/EntraID, 1Password, Atlassian, Slack.
- **Review cadence**: Built on busibox `/runs/schedule` + `apscheduler` + `croniter`. Notifications via `bridge` service (email + Slack + Telegram).

## 3. Data model (busibox data-api schemas)

All of these are `AppDataSchema` documents created via [data-api `/data](https://github.com/jazzmind/busibox/blob/main/openapi/data-api.yaml)`. No direct DB access.

- `polysec.catalogs` — OSCAL catalog JSON (raw + normalized): `{id, title, source_url, source_checksum, framework_key, version, imported_at, json}`
- `polysec.profiles` — OSCAL profile (selects controls from catalogs): `{id, title, catalog_id, baseline_level, controls: [{control_id, included, parameters}], json}`
- `polysec.controls` — denormalized view: `{id, catalog_id, control_id, title, statement, guidance, parts[], related[], props[]}` — built from catalog ingest
- `polysec.policies` — user-uploaded policy docs (metadata only; bytes in MinIO via data-api `/upload`): `{id, title, owner_user_id, owner_role_id, file_id, version, status: draft|approved|retired, approved_at, next_review_at, review_cadence_days, tags[]}`
- `polysec.evidence` — collected evidence items: `{id, source: github|gitlab|gworkspace|okta|aws_prowler|manual, source_ref, collected_at, summary, artifact_file_id?, data: jsonb, control_ids[]}`
- `polysec.control_mappings` — links evidence/policies to controls with AI confidence + human verdict: `{id, control_id, subject_type: policy|evidence, subject_id, ai_confidence, ai_rationale, ai_suggested_at, human_verdict: pending|accepted|rejected|needs_more, human_note, updated_at}`
- `polysec.gaps` — gap-analysis output rows: `{id, control_id, status: covered|partial|uncovered|unknown, rationale, suggested_actions[], evidence_ids[], policy_ids[], last_reviewed_at}`
- `polysec.reviews` — access/policy/evidence review tasks: `{id, title, type: access_review|policy_review|control_attestation|evidence_refresh, subject_type, subject_id, owner_user_id, due_at, completed_at, status, cadence_days, notes}`
- `polysec.integrations` — per-tenant integration configs: `{id, type, name, secrets_ref (vault key), enabled, last_run_at, last_status, schedule_cron}`
- `polysec.findings` — Prowler/Okta/etc findings surface: `{id, integration_id, severity, resource, title, description, status: open|suppressed|resolved, control_ids[], raw}`

### Schema strategy

- Each lives as a separate data-api document with its own schema version.
- RLS is handled by busibox data-api (role-scoped partitions in Milvus, `app.user_role_ids_read` in Postgres).
- Uploaded policy files get chunked + embedded by busibox's `data-worker`, making them searchable via `/search` without any polysec-specific code.

## 4. OSCAL ingest (`lib/oscal-ingest.ts` + `app/api/catalogs/*`)

### Sources

- NIST SP 800-53 rev 5: [https://github.com/usnistgov/oscal-content](https://github.com/usnistgov/oscal-content)
- FedRAMP: [https://github.com/GSA/fedramp-automation](https://github.com/GSA/fedramp-automation)
- CMMC: [https://github.com/usnistgov/oscal-content/tree/main/cmmc](https://github.com/usnistgov/oscal-content)
- SOC2 / ISO 27001 / HIPAA are not natively OSCAL; ship curated OSCAL-formatted catalogs in `polysec/catalogs/curated/{soc2,iso27001,hipaa}/catalog.json` derived from the public criteria. Document the provenance in `polysec/catalogs/curated/README.md`.

### Flow

1. Operator hits `POST /api/catalogs/import` with `{source_url | file}` (admin route)
2. Validate against OSCAL JSON schema (use `[@oscal/oscal-cli](https://github.com/usnistgov/oscal-cli)` as sidecar, or pure JSON Schema via `ajv` with OSCAL metaschemas)
3. Write catalog to `polysec.catalogs`, flatten controls into `polysec.controls`
4. Ingest selected profile(s) into `polysec.profiles` — default profiles shipped for "SOC2 Type 2 moderate", "ISO 27001:2022 Annex A full", "HIPAA Security Rule"
5. Re-ingest is idempotent by `source_checksum`

### Export (v1.1)

- `GET /api/catalogs/{id}/export` → OSCAL JSON (round-trip validation)
- `GET /api/assessments/{id}/export` → OSCAL `assessment-results` with findings + observations + control status

## 5. Agents (seeded into busibox `srv/agent`)

All agents defined in `polysec/agents/*.yaml` and loaded by a `seed_polysec_agents.py` script that POSTs to [busibox agent-api `/agents/definitions](https://github.com/jazzmind/busibox/blob/main/openapi/agent-api.yaml)`. Tool definitions follow the same pattern via `/agents/tools`.

### Agents

- `**polysec.control_mapper`** (Pydantic-AI)
  - Tools: `document_search` (KB), `data_query` (polysec.controls, polysec.policies, polysec.evidence), `create_data` (polysec.control_mappings)
  - Model: `agent` (default)
  - Instructions: given a control `{id, title, statement, guidance}`, find best-matching policy sections and evidence items, score confidence, write `control_mappings` rows for human review.
  - Triggered on: new policy upload (ingest-complete webhook from data-worker → agent runtime), new control catalog, manual refresh.
- `**polysec.gap_analyzer**` (Pydantic-AI)
  - Tools: `data_query`, `data_aggregate`, `create_data` (polysec.gaps)
  - Model: `agent` (complex tier)
  - Instructions: for each active control in a selected profile, read `control_mappings` + `evidence`, classify status (covered/partial/uncovered/unknown), write rationale + suggested actions. Runs as a scheduled workflow (daily).
- `**polysec.evidence_classifier**` (Pydantic-AI)
  - Tools: `document_search`, `data_query`, `data_update`
  - Model: `fast`
  - Instructions: given a raw evidence blob (e.g. Prowler JSON finding or Github API response), emit control-id candidates + short summary. Used as a step in ingestion workflows.
- `**polysec.audit_narrative_writer**` (Pydantic-AI)
  - Tools: `data_query`, `document_search`, `rag_query` (over policies), `data_update`
  - Model: `agent` (complex tier, large context)
  - Instructions: given a control + its mappings + evidence, produce an auditor-facing narrative with citations (file IDs + section references). Writes to `polysec.narratives` (new schema when this agent ships).
- `**polysec.review_reminder**` (Pydantic-AI)
  - Tools: `data_query`, `data_update`, `send_notification` (bridge: email / Slack), `create_task`
  - Model: `fast`
  - Instructions: query `polysec.reviews` for `due_at <= now + 7d AND status != completed`, notify owners with context + due date + a deep link to the polysec review screen. Runs as a cron-scheduled workflow.

### Tools (new, defined via `/agents/tools`)

- `polysec_control_lookup({ control_id, profile_id? }) -> control` — thin wrapper around data-api query, cached
- `polysec_mapping_write({ control_id, subject_type, subject_id, ai_confidence, ai_rationale })` — convenience over data-api insert
- `polysec_evidence_ingest({ integration_id, items: [...] })` — called by integration workers; fans out classification
- `polysec_notify({ user_id | role_id, channel, title, body, link })` — wraps `send_notification` with polysec-specific templates

### Workflows (`/agents/workflows`)

- `polysec.on_policy_uploaded` — triggered by data-worker completion event; runs: `evidence_classifier` (if auto-classify on) → `control_mapper` → `gap_analyzer.refresh(profile)`
- `polysec.daily_gap_refresh` — cron `0 6 * * *` → for each active profile: `gap_analyzer`
- `polysec.review_cadence` — cron `0 14 * * *` → `review_reminder` for upcoming reviews + overdue escalation
- `polysec.integration_sync` — cron per-integration (e.g. `0 */6 * * *` for GitHub, daily for Prowler) → integration pull (code path, not agent) → `evidence_classifier` → `control_mapper` delta

### Guardrails for these agents

- `tool_calls_limit=30` (Pydantic-AI `UsageLimits`) already in busibox
- Per-run `timeout_s` in `polysec.<agent_id>` config: `control_mapper=120`, `gap_analyzer=600`, `audit_narrative_writer=600`
- **Cost ceiling** (requires busibox enhancement — see busibox-agent-modernization plan): hard stop at `$0.50/run` for polysec agents; tune in `workflow_executions.estimated_cost_dollars`

## 6. Evidence integrations (`lib/integrations/`*)

Each integration is a small TS module in the polysec Next.js repo that runs as a scheduled agent tool (busibox agent calls it via HTTP) OR as a standalone cron script deployed as a busibox `dev-app` sidecar.

**v1 integrations** (in order of implementation):

1. **GitHub / GitLab** (`lib/integrations/github.ts`, `lib/integrations/gitlab.ts`)
  - OAuth app install flow (app-level, not per-user)
  - Pull: repo settings, branch protection rules, required reviews, code owners, secret scanning status, 2FA org enforcement, audit log entries
  - Map to controls: SOC2 CC6.1 (logical access), CC7.2 (change management), CC8.1 (change management), CMMC CM.*
  - Refresh: every 6h
2. **Google Workspace** (`lib/integrations/gworkspace.ts`)
  - Admin SDK (Directory API) service account with domain-wide delegation
  - Pull: user list, 2FA status, suspended accounts, OUs, admin role assignments, DLP rule metadata
  - Map to: SOC2 CC6.1, CC6.2, CC6.3; ISO 27001 A.9
  - Refresh: daily
3. **Okta** (`lib/integrations/okta.ts`)
  - API token or OAuth2
  - Pull: users, groups, MFA policies, sign-on policies, recent sign-in anomalies
  - Map to: SOC2 CC6.*, ISO 27001 A.9
  - Refresh: daily
4. **AWS via Prowler** (`lib/integrations/aws-prowler.ts`)
  - Shells out to `prowler aws -M json` with scoped IAM role (read-only + `SecurityAudit`)
  - Ingest JSON findings as `polysec.findings` + classify each via `polysec.evidence_classifier`
  - Map to: SOC2 CC6/CC7/CC8, ISO 27001 A.8/A.12/A.13, CMMC AC/AU/CM/SC
  - Refresh: weekly (heavy)

### Secrets

- Integration credentials stored in busibox vault (via `authz` service's existing secret store)
- `polysec.integrations.secrets_ref` holds the vault key, never the secret itself

## 7. Review cadence engine (`app/api/reviews/`* + scheduled agent)

- Every `polysec.policies` row has `review_cadence_days` (default 365 for policies, 90 for access reviews)
- `next_review_at` is computed on insert/approve
- `polysec.review_reminder` agent runs daily, 7-day warning + day-of + 7-day overdue
- Review completion: UI lets owner click "Reviewed — still accurate" → updates `next_review_at = now + cadence_days` and logs to `polysec.reviews` with verdict
- Escalation: >14 days overdue → notify owner's role admin

## 8. UI surface (Next.js 16 App Router in polysec repo)

Rough navigation, all inside `app/(authenticated)/`:

- `/polysec` — dashboard: selected profile, coverage %, overdue reviews, new findings
- `/polysec/frameworks` — catalogs + profiles management (admin)
- `/polysec/controls` — browse controls with status chips; drill into control detail
- `/polysec/controls/[control_id]` — control detail: mappings, evidence, policies, AI rationale, human verdict controls, "regenerate analysis" button
- `/polysec/policies` — upload, version, approve, set cadence, search
- `/polysec/evidence` — evidence library (uploaded + integration-sourced)
- `/polysec/gaps` — gap analysis report; filter by status; export
- `/polysec/reviews` — review queue (due soon + overdue); complete/attest
- `/polysec/integrations` — connect GitHub/GitLab/GWS/Okta/AWS; run now; last run status
- `/polysec/audit` — narrative generation: pick profile → generate audit-defense PDF/markdown
- `/polysec/settings` — cadence defaults, notification channels, export/import

Re-use `[@jazzmind/busibox-app](https://github.com/jazzmind/busibox-frontend/tree/main/packages/app)` components: `Header`, `Footer`, `SessionProvider`, `SimpleChatInterface` (wrap as "Ask about controls" widget invoking `polysec.audit_narrative_writer`).

## 9. Implementation phases

### Phase 0 — repo bootstrap (1–2 days)

- Clone [busibox-template](https://github.com/jazzmind/busibox-template), rename to polysec
- Update `busibox.json`, `package.json`, `env.example`
- Delete demo routes per `DEMO.md`
- Set up `docs/spec.md` from this plan

### Phase 1 — data model + OSCAL ingest (1 week)

- Define all `AppDataSchema`s in `lib/data-api-client.ts` with typed CRUD helpers
- Implement `/api/catalogs/import` + curated SOC2/ISO/HIPAA catalogs
- UI: `/polysec/frameworks` + `/polysec/controls` (read-only)

### Phase 2 — policy upload + manual mapping (1 week)

- Policy upload UI (re-uses busibox data-api `/upload`)
- Manual control-mapping UI (pre-AI)
- `polysec.policies` CRUD

### Phase 3 — agent seeding + control mapper + gap analyzer (1.5 weeks)

- `seed_polysec_agents.py` script
- Wire `on_policy_uploaded` workflow
- `/polysec/controls/[id]` shows AI suggestions + human verdict toggle
- `/polysec/gaps` page

### Phase 4 — review cadence (0.5 week)

- `polysec.review_reminder` agent + cron schedule via `/runs/schedule`
- `/polysec/reviews` UI
- Bridge notifications (email default; Slack/Telegram if configured)

### Phase 5 — evidence integrations (2 weeks)

- GitHub + GitLab first (week 1)
- Google Workspace + Okta (week 2)
- AWS/Prowler integration (offload heavy scans via cron)
- Each pipes findings through `evidence_classifier`

### Phase 6 — audit narrative generator (1 week)

- `polysec.audit_narrative_writer` agent
- `/polysec/audit` UI with profile selector + download as PDF (use Playwright service in busibox for PDF rendering)
- OSCAL `assessment-results` export

### Phase 7 — polish (1 week)

- Eval harness for agents (see busibox modernization plan — depends on `/agents/evals`)
- Documentation: admin guide, user guide, OSCAL provenance docs
- Public launch checklist: OSS LICENSE (Apache 2.0 suggested), CONTRIBUTING.md, curated-catalog provenance notes

**Total**: ~8 weeks focused

## 10. Known risks / open questions

- **OSCAL for SOC2/ISO/HIPAA is not upstream** — you'll curate your own OSCAL-formatted catalogs from the source criteria (AICPA TSC, ISO 27001:2022, HIPAA Security Rule). This is technically a derivative work; document licensing / attribution clearly. SOC2 in particular has no freely redistributable control text; your catalog will reference criteria IDs + your own paraphrased guidance.
- **Prowler licensing** — Apache 2.0, safe.
- **Shipping curated catalogs vs. letting users point at their own** — v1 does both; power users can `POST /api/catalogs/import` with a URL to their own OSCAL JSON.
- **Multi-tenant vs single-tenant** — busibox is single-tenant by design. Polysec inherits this. "Multi-user with RLS" is enough.
- **"audit defense" narrative liability** — ship with clear disclaimer: AI-generated, requires human review, not legal advice. Same language Vanta uses.