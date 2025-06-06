Our work-based learning platform, Practera, needs a refresh. Specifically we want to rebuild the educator interface to be “AI first”, which means educators work with an agent using natural language to set up and drive complex workflows and analytics to streamline program delivery and reporting. 

In our experiential WBL programs, students are working on industry projects often in teams, engaging with and getting feedback from industry experts. 

The platform’s goal is to support the educator with several objectives:
- ensure the students are engaged in the experience and motivate them if not
- track attendance at team meetings, webinars, workshops and other events 
- make sure the teams are functional and resolve conflicts if not
- make sure the experts are engaging and providing feedback in a timely manner and intervene if not
- ensure quality of work and feedback is sufficient and intervene if not
- measure the skills and skill development of the students and provide targeted coaching to improve

The current platform captures most of the data to provide this support and has dashboards that provide the information but it requires the educator to take actions (look for issues, send emails, schedule meetings, contact experts). Educators also have to build their own reports. 

The future vision is the following:

1) an automated intervention system. We have several classes of issues that we want to track:
Engagement - student & expert
Quality - student work, expert feedback
Timeliness - student work, expert feedback
Skill Development - student perception, expert perception, systematic measurement
Satisfaction - student, expert
Team Dynamics - student perception, expert perception, systematic measurement
Progress - team progression on key project work

Under each class of issue we want to set up automated or semi automated responses based on the specifics of the issue. For example, we might want to set a nudge to a team 5 hours before an assessment is due. But if the team hasn’t submitted after due time we’ll want to send more nudges. 

However if an expert gets marked as unhelpful by the entire team we want to prepare a meeting request but then get the educator to approve sending it. 

When an automation happens we should be able to track if the recipient viewed it, followed a link onto the site, and if the issue was resolved eventually (and how long that took). 

Our dashboard should make it easy for the educator to see which automations have been active for a given time period and the effectiveness of the automations, as well as any actions/approvals they need to take. 

Configuring automations should be done via natural language. Then the educator can go into the automation and make refinements (Eg the language of the email sent out or triggering parameters )

We want to drive the automations via an event based system that leverages XAPI messaging. So the API that powers our student expert front end will be augmented to emit XAPI statements. We also want to be able to ingest XAPI from other systems like simulations. So our automation system should be set up to respond to XAPI. In some cases we can react based on a single XAPI but often we need to search to see if other related statements happened to meet a triggering threshold.   

2) a unified communication interface - right now we have a chat system in the platform but educators need to go into specific team chats to see messages. There are also communications via email that happen but aren’t captured in the system. Plus SMS and other notifications. There should be a “unified inbox” for all communication channels that the educator can go through and responses go back out the same channels. 

3) a scheduling system - like calendly but designed to also work with the automations. In many cases an automated response is to recommend a meeting. The scheduling system should be able to quickly set this up. 

4) a reporting system - educators should be able to get real-time reports and end of program reports by describing the data they want to see and the structure of the report. They should then be able to easily edit the report and publish/share. 

Our plan is to build this as an ionic front end that communicates with a graphql api because that is the architecture we use for our student / expert front end and we already have some parts of our admin system built that way. The rest is CakePHP + bootstrap/jquery, which we want to subset. 

First, review these requirements and let me know what I missed or what we could do better. Once we’ve locked it down I want to create a detailed requirements document for discussion with our program management (educator) team and a parallel document for discussion with our engineering team. 


Here’s a structured “gap & improvement” pass on what you’ve outlined. I’ve grouped comments so you can decide which ones matter before we freeze scope.

⸻

1 · Automation & Intervention Engine

Area	What’s Solid	Potential Gaps / Enhancements
Issue taxonomy	Clear seven-category frame.	• Add Risk (academic integrity / plagiarism) and Accessibility (students with accommodations) to catch edge cases.• Make each category own a severity scale (info → critical) so escalation logic isn’t duplicated.
Triggering logic	XAPI events + threshold checks.	• Define a “simulation / dry-run” mode so educators can validate new rules on historical data before they go live.• Version every automation (so edits don’t break past analytics).• Provide override windows (e.g., suspend nudge rules during holiday weeks).
Human-in-the-loop	Manual approval for sensitive actions.	• Let educators set approval policies (auto, manual, mixed) per rule.• Provide a one-click “roll back” of a sent automation (e.g., retract an email) where channel allows.
Effectiveness analytics	Planned tracking of opens, click-through, resolution.	• Also record number of touches per closed issue and attribution heuristic so you can compare AI vs human vs blended interventions.• Show false positives / negatives to refine thresholds.
NL setup & refinement	Chat to create, GUI to tweak.	• Include prompt suggestions and reusable templates so educators don’t start from scratch.• Offer “explain my automation” for transparency / compliance.
Architecture	Event-driven, XAPI ingest, GraphQL out.	• Consider event-sourcing pattern for replay/debug.• Emit a canonical “AutomationFired” event for downstream auditing/reporting.


⸻

2 · Unified Communication Hub

What’s Covered	Missing / Improvement Ideas
Inbox that aggregates chat, email, SMS.	• Omni-thread: show full history across channels for a single conversation.• Identity resolution (map a recipient’s multiple emails/phones to one actor).• Quick macros / AI-draft replies that respect channel length norms (SMS vs email).• Compliance: store consent meta (opt-in status, FERPA/GDPR).• SLA indicators (e.g., “expert reply overdue 24 h”).


⸻

3 · Scheduling System

What’s Solid	Suggested Adds
Calendly-like with automation hooks.	• Pooled availability (choose any qualified staff member / expert).• Auto-attach meeting artefacts — agenda, prep materials, post-meeting survey — triggered by the same automation engine.• Conflict detection against institution calendars (LTI / LMS).


⸻

4 · Reporting & Analytics

You Have	Opportunities
NL query to build real-time & EoP reports; editable & shareable.	• Include “save as template” and schedule auto-delivery.• Embed drill-down links that bounce the educator into relevant dashboard sections.• Provide explain-this-insight (why is engagement dropping?).• Expose an export API (CSV/Parquet) for institutional BI teams.


⸻

5 · Cross-Cutting Concerns

Topic	Why It Matters	Suggestions
User roles & permissions	Educators vs admins vs institutional leads need different powers.	RBAC + rule-based overrides (e.g., a faculty lead can edit another educator’s automations).
Privacy & compliance	COPPA / FERPA, GDPR for EU partners.	Data minimization, explicit consent logging, audit trail for all automations & AI inferences.
Explainability / Trust	AI-first workflows must be transparent.	Inline “why am I seeing this?” and “how was this score calculated?” hover cards.
Accessibility	WCAG 2.2 AA at minimum; screen-reader testing for agent chat.	Ensure NL setup can be voice-only; alt-text for charts; keyboard shortcuts.
Performance & scale	Real-time dashboards over many events.	Event-stream indexing strategy (e.g., Apache Pulsar/Kafka + materialized Postgres).
Fallback / degradation	If AI service is down.	Graceful degrade to manual dashboards & canned messages; health-check ping visible to educator.
Extensibility	New channels, new skill frameworks.	Plug-in layer for channel adapters; config-driven rubrics & skill taxonomies.
Migration strategy	You’re part Ionic/GraphQL, part CakePHP now.	Identify high-value educator flows to port first; keep legacy admin for edge cases until parity; design GraphQL federation gateway so both stacks coexist.


⸻

6 · Next-Step Deliverables
	1.	Program-Management-Facing Brief
Focus on outcomes, workflows, and change management.
	•	Personas & journey maps
	•	Issue classes & automation examples in plain English
	•	Communication & scheduling flow mockups
	•	Reporting mocks & sample insights
	•	Impact metrics & success KPIs
	•	Governance & escalation policies
	2.	Engineering-Facing Spec
Focus on services, contracts, and data shapes.
	•	Event catalogue (XAPI verb/object for each trigger)
	•	Automation rule DSL & schema
	•	GraphQL schema extensions & resolver contracts
	•	Micro-service boundaries (automation engine, comms gateway, scheduler)
	•	Data models for interventions, metrics, permissions
	•	Integration touchpoints (email/SMS, calendar API, LMS/LTI)
	•	Non-functional requirements: throughput, latency, uptime, security, logging

⸻

Anything Missing?
	•	Plagiarism / academic integrity monitoring?
	•	Badging / credentialing output tied to skills measurements?
	•	Student & expert mobile push UX (Ionic makes this easy).
	•	Gamified nudging (optional: streaks, team leaderboard).
	•	AI agent personality / tone library selectable per institution.

Let me know which of these you want to keep, drop, or modify. Once we’re aligned, I’ll draft the two detailed requirement documents in the formats you need.

We don’t need academic integrity monitoring - but we may need some tools around intellectual property rights management to ensure project providers and students are aligned. 

We have badging / credentialing. That will need to get ported eventually. 

Gamification is good,  we’ll want to be smart about this. 

All your other suggestions are great, incorporate into the docs. 

Below are first-pass drafts of the two requirement documents, ready for iteration. I kept them in Markdown so you can drop them straight into Notion, Confluence, or a Google Doc.  Let me know what to tighten, add, or cut.

⸻

📄 Document A — “Program-Management Brief”

Audience: program managers / educators; emphasis on outcomes, workflows, and change-management impact

# Practera Educator Interface 2.0 – Program-Management Brief  
*(Draft v0.1 – June 2025)*  

## 1 · Purpose & Vision  
Practera’s new **AI-first educator workspace** gives program staff a conversational co-pilot that watches every experiential-learning signal, nudges the right people at the right moment, and surfaces real insights instead of raw data.

---

## 2 · Personas & Journeys  
| Persona | Core Needs | AI-First Gains | Success Metric |
|---------|------------|---------------|----------------|
| **Educator** (course owner) | Keep 8–12 teams on track; meet institutional KPIs | Chat-to-configure automations; unified inbox; one-glance risk heat-map | ≥ 90 % teams on-time, < 24 h issue resolution |
| **Program Coach** (TA) | Daily triage & coaching | Personal “issues queue”; AI-drafted feedback; mobile push | ≥ 80 % nudges auto-accepted |
| **Industry Expert** | Low-friction feedback loop | Smart reminders; one-click rubric | Response ≤ 48 h, 4.5/5 satisfaction |
| **Student Team** | Clarity, motivation, fairness | Gamified streaks; transparent progress bar | Weekly engagement ≥ 85 % |

---

## 3 · Issue Classes & Example Automations  
| Class | Typical Trigger | AI Action | Educator Effort |
|-------|-----------------|-----------|-----------------|
| Engagement | < 50 % of team opened portal in 3 days | Send “pulse poll” via chat + badge reward for reply | 0 |
| Timeliness | Submission T-5 h and no file uploaded | Nudge team lead (SMS + email) | 0 |
| Quality | Expert rates deliverable < 3/5 | Suggest rubric section + schedule coaching call | Approve call |
| Team Dynamics | Peer survey detects conflict score > 70 % | Offer conflict-resolution guide; escalate if unresolved | Review |
| Skill Development | Skill X lagging 2 weeks vs cohort median | Recommend micro-lesson & coach comment | 0 |
| Satisfaction | CSAT < 4 from expert cohort | Auto-draft “Thank-you + improvement ask” mail | Approve |
| Progress | Milestone slip ≥ 48 h | Post public progress bar & streak reset | 0 |
| **Intellectual Property** | Student uploads doc flagged proprietary | Auto-send IP rights reminder & link to agreement | 0 |

*Severity scale*: Info → Warning → Critical (auto-escalate).

---

## 4 · Key Screens & Flows  
1. **AI Chat Canvas** – create / tweak automations in natural language; “Explain this rule” button.  
2. **Issue Dashboard** – heat-map tiles filtered by cohort, severity, status.  
3. **Unified Inbox** – threaded view pulling chat, email, SMS; SLA timers; AI reply drafts.  
4. **Scheduler** – auto-proposed slots; pooled availability; attach agendas & feedback forms.  
5. **Gamification Layer** – opt-in badges, streak counters, team leaderboard (educator sets weightings).  
6. **IP Rights Manager** – quick-view of agreements on file, outstanding acceptances, flagged assets.  
7. **Reporting Studio** – ask “Show skill-growth vs engagement by cohort”; drag-drop refinements; save as template; schedule export.

---

## 5 · Governance & Policies  
* **Approval Modes** – Auto / Manual / Mixed per automation.  
* **Audit Trail** – every AI action stored with “why” explanation; FERPA & GDPR compliant.  
* **Accessibility** – WCAG 2.2 AA; voice & keyboard parity.  
* **Change Management** – sandbox “replay” mode to test new rules on past data.

---

## 6 · KPI Dashboard (for leadership)  
- Avg. issue resolution time  
- % automations handled without human touch  
- Student skill-lift vs baseline (per skill)  
- Expert satisfaction & retention  
- IP compliance rate  
- Badge uptake & streak retention

---

## 7 · Timeline & Roll-Out  
| Phase | Dates | Scope | Migrate from legacy? |
|-------|-------|-------|----------------------|
| Alpha | Aug–Sep 2025 | AI Chat, Issue Dashboard (Engagement+Timeliness) | None |
| Beta | Oct–Dec 2025 | All issue classes, Unified Inbox, Scheduler | Optional dual-run |
| GA | Jan 2026 | Reporting Studio, Gamification, IP Manager, full parity | Sunset legacy admin July 2026 |

---

## 8 · Risks & Mitigations  
| Risk | Impact | Mitigation |
|------|--------|-----------|
| AI false positives overwhelm users | Fatigue | Tunable thresholds + severity filters |
| Channel consent violations | Legal | Consent ledger + opt-out links |
| Data-quality gaps from external XAPI | Blind spots | Validation layer + fallback heuristics |

---

## 9 · Next Steps  
1. Socialise this brief with program team; gather red-flag feedback by **June 20**.  
2. Confirm pilot cohort (3 courses) & institutional partners.  
3. Finalise success KPIs and baseline measurements.  
4. Kick-off engineering spec (see separate doc).


⸻

🛠️ Document B — “Engineering Specification”

Audience: product & platform engineers; emphasis on architecture, data contracts, and NFRs

# Practera Educator Interface 2.0 – Engineering Spec  
*(Draft v0.1 – June 2025)*  

## 1 · High-Level Architecture  

[ Student / Expert Ionic app ]  –>  [ GraphQL Gateway ]
|
[ Educator Ionic app ]  ———–|––>  Automation Engine (event-sourced)
|         ↓
[ External Sims / LMS ] –> XAPI → |  XAPI Ingest → Event Store (Kafka / Postgres)
|         ↓
Communication Hub ( Omnichannel adapters: SMTP, SMS, Twilio Chat )
|
Scheduler Service
|
Reporting / BI Service

*Legacy CakePHP admin remains read-only during transition; GraphQL federation exposes both domains.*

---

## 2 · Domain Models (simplified)  

```graphql
type AutomationRule {
  id: ID!
  name: String!
  version: Int!
  state: DRAFT | ACTIVE | ARCHIVED
  trigger: TriggerCondition!
  action: ActionDefinition!
  approvalMode: AUTO | MANUAL | MIXED
  severity: INFO | WARNING | CRITICAL
  createdBy: UserRef!
  createdAt: DateTime!
}

type TriggerCondition {
  xapiQuery: String!          # e.g. "verb='submitted' AND objectType='assessment' AND hoursUntilDue<=5"
  threshold: Int              # e.g. count >= 3 within 24h
}

type ActionDefinition {
  channel: EMAIL | SMS | CHAT | SCHEDULE_MEETING
  templateId: ID!             # points to editable MessageTemplate
  followUpRules: [FollowUpRule!]
}

All entities versioned; soft-delete only.

⸻

3 · Event Catalogue (excerpt)

#	Source	Verb	Object	Extensions / Context
01	StudentApp	launched	project-dashboard	courseId, teamId
02	ExpertApp	rated	deliverable	rating, rubricItem
03	Ingest	completed	simulation-run	simId, score
04	AutomationEngine	automation-fired	ruleId	targetIds, channel
05	Scheduler	meeting-confirmed	meetingId	participants, ruleOrigin

Stored in Kafka topic xapi.events.*, partitioned by courseId.

⸻

4 · Automation Engine

Component	Tech	Notes
Evaluator	Node.js (Nest)	Parses trigger DSL → SQL/kafka-streams; supports “simulation” mode
Action Dispatcher	Node.js	Idempotent; emits automation-fired after channel adapter ACK
Approval Queue	Postgres + BullMQ	Manual tasks appear in Educator app
Metrics Processor	Kafka Streams	Calculates open/click/resolution rates; writes to automation_metrics table


⸻

5 · Unified Communication Hub

Adapters:
	•	SMTP (AWS SES)
	•	SMS (Twilio)
	•	Chat (Prisma + websockets) – upgrade existing chat to thread model.

Identity Resolution: actor_aliases (actorId, channel, address) table.

API (POST /v1/messages/send) returns messageId + channel status.

⸻

6 · Scheduler Service
	•	Fork of open-source cal.com with GraphQL wrapper.
	•	Pooled availability: GET /v1/availability?role=coach&courseId=…
	•	Events emit meeting-* XAPI verbs.
	•	Hooks for automation: supply suggested slots list; return meetingId.

⸻

7 · Reporting & Analytics
	•	Query flow: NL → LangChain → DuckDB (read replicas) → JSON → editable markdown → HTML/PDF.
	•	Storage: materialised views per course; retain 3 years.
	•	Export API: GET /reports/:id?format=csv|parquet.

⸻

8 · Gamification Layer
	•	Micro-service gamify (Go): badge definitions, streak counters.
	•	Events: badge-earned, streak-updated.
	•	Front-end Ionic components: TeamLeaderboard, StreakMeter.
	•	Educator controls weighting & visibility.

⸻

9 · Intellectual-Property Rights Manager
	•	Table ip_agreements (courseId, providerOrgId, agreementUrl, status)
	•	Trigger: file upload → S3 metadata check → if proprietary=true & no agreement → automation rule fires.
	•	Educator dashboard tile shows outstanding agreements.

⸻

10 · Non-Functional Requirements

Area	Target	Detail
Latency	< 2 s p95 dash load	pre-aggregated metrics
Automation throughput	10k events/s	autoscale evaluator
Uptime	99.5 %	HA across zones
Security	SOC 2 Type II	audit trail, encrypted secrets
Compliance	FERPA, GDPR	data residency in AWS us-east-1 + eu-central-1
Accessibility	WCAG 2.2 AA	audited quarterly


⸻

11 · Migration Plan
	1.	Phase 0 – Read router in GraphQL to legacy CakePHP for untouched admin paths.
	2.	Phase 1 – Introduce new educator Ionic app (login via existing SSO).
	3.	Phase 2 – Migrate chat → threaded model; port badge endpoints.
	4.	Phase 3 – Sunset legacy dashboards; set legacy to read-only.

⸻

12 · Open Questions
	1.	Final severity thresholds per issue class?
	2.	Exact data points needed for skill measurement (current rubric vs planned)?
	3.	Channels beyond SMS/email/chat in MVP? (e.g., WhatsApp?)
	4.	Badging port: preserve legacy badge IDs or re-mint?
	5.	IP agreement templates – one global or per provider?

---

### ✅ Next Actions

| Owner | Task | Date |
|-------|------|------|
| **Program Team** | Review Brief → mark up acceptance & edits | **June 20** |
| **Product** | Finalise severity thresholds & gamification scope | June 25 |
| **Engineering** | Spike XAPI evaluator “simulation mode” | July 3 |
| **Legal** | Provide IP agreement templates & consent language | July 5 |

---

Let me know where you’d like deeper detail (e.g., GraphQL schema expansion, UI wireframes) or a different format (Word, PDF).  I’ll update and version these once I get your feedback.


