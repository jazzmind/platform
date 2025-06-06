
# Practera Educator Workspace 2.0  
## Technical Roadmap & Requirements  *(v0.1 – June 2025)*

---

### 1 · Purpose
Deliver an AI‑first, event‑driven platform that a **small human team + LLM agents** can co‑develop and run on AWS managed services.

---

### 2 · Guiding Engineering Principles
1. **Managed > Self‑Hosted** – minimise ops  
2. **Event‑Driven, Idempotent** – retryable, easy for AI reasoning  
3. **Schema‑First (GraphQL)** – codegen & strong typing  
4. **Monorepo + CDK** – single truth; AI diff friendly  
5. **TS/Python Typed** – fewer agent bugs  
6. **Observability Hooks** – logging/metrics templates auto‑generated

---

### 3 · Target Architecture (AWS Native)

```
[Ionic App] —— GraphQL —— AppSync
                       │
                       ▼
            EventBridge (bus+scheduler)
             ├── Automation Engine (Lambda + SFN)
             ├── xAPI Ingest (Kinesis → Lambda)
             └── AI Summaries (Bedrock → Dynamo)
             └── Comm Adapters (SES/SNS/Pinpoint)
             └── Chime Bots
             └── Cal.com Scheduler (Fargate)
                       │
                       ▼
          Aurora Serverless v2 (Postgres)
                       ▼
          Redshift Serverless (Analytics)
```

MR devices push xAPI HTTPS → EventBridge.

---

### 4 · Service Catalog & AI Fit
| Domain | Service | AI‑Fit Reason |
|--------|---------|---------------|
| API | AppSync | Schema → codegen |
| Automation | Lambda + EventBridge | Stateless, small handlers |
| Bots | Chime SDK + Bedrock | Single summariser Lambda |
| Comms | SES/SNS/Pinpoint | 1‑liner SDK calls |
| Scheduler | Cal.com Fargate | Minimal ops; REST |
| MR | Unity/Unreal xAPI sdk | AI templatable |
| OLTP | Aurora v2 | AI‑written SQL migrations |
| Analytics | Redshift Srvless | ANSI SQL prompts |
| IaC | CDK (TS) | Agents output constructs |

---

### 5 · Dev‑Loop with AI Agents
1. GitHub Issue + prompt template  
2. Sonnet‑4/GPT‑4o writes code + tests + CDK diff  
3. CI: jest / eslint / cfn‑nag / k6  
4. Human review → merge → Argo CD deploy

---

### 6 · Team Staffing
| Role | FTE |
|------|-----|
| Product/Tech Lead | 1 |
| Full‑Stack Dev | 1 |
| DevOps | 0.5 |
| Data/AI Eng | 0.5 |
| LLM Agents | elastic |

---

### 7 · NFR Targets
| Metric | Target |
|--------|--------|
| API p99 | ≤ 250 ms |
| Lambda p95 | ≤ 500 ms |
| Uptime | 99.5 % |
| Cost | ≤ $3 k / 1 k learners / mo |
| MTTR | < 30 min |
| WCAG | 2.2 AA |

---

### 8 · Phased Roadmap
| Phase | Dates | Deliverables |
|-------|-------|--------------|
| 0 · Scaffold | Jun 25 | CDK monorepo, AppSync skeleton |
| 1 · Alpha | Aug–Sep | Meeting bot MVP, Brief Builder |
| 2 · Beta 1 | Oct–Nov | Task AI, Doc Watchers |
| 3 · Beta 2 | Dec–Feb 26 | Velocity dashboards, MR pilot |
| 4 · GA | Mar 26 | Full MR pipeline, legacy sunset |

---

### 9 · Open Decisions
1. Rule DSL grammar  
2. Meeting‑bot consent wording  
3. MR verb set & auth  
4. Velocity algorithm thresholds

---

### 10 · Immediate Next Steps
| Owner | Task | Due |
|-------|------|-----|
| Product | Approve roadmap | 12 Jun |
| DevOps | CDK scaffold | 18 Jun |
| AI Eng | Bedrock prompt POC | 22 Jun |
| Legal | Consent language | 25 Jun |
