# PR Description: Notification & Audit Feature

## Summary
This PR introduces a **Notification & Audit** capability for the monthly homework reporting workflow exposed by the API. The goal is to make report generation and delivery more reliable and observable by splitting responsibilities across two focused services:

1. **Notification Service** – sends user-facing notifications when monthly report events occur (e.g., report generated, delivery succeeded/failed).
2. **Audit Service** – records immutable audit events for report lifecycle actions so administrators can trace what happened, when, and why.

This was built to improve accountability, operational visibility, and downstream troubleshooting for monthly homework reporting operations.

## Why this was built
The existing API can produce/report monthly homework data, but without robust event-level auditability and explicit notification handling, failures are harder to investigate and user communication can become inconsistent. By introducing Notification and Audit as explicit service concerns, we gain:

- Clear separation of business concerns (delivery vs traceability)
- Better incident diagnostics through event history
- Stronger confidence in report processing outcomes

## AI Tool Disclosure
### Copilot features used
- **Copilot Chat** for architecture ideation, implementation planning, and drafting service boundaries.
- **Inline completion/suggestions** for boilerplate code, DTO typing, and repetitive test scaffolding.
- **Refactor suggestions** for minor cleanup and naming consistency.

### Where AI output was accepted as-is
- Initial skeletons for service methods and interface stubs.
- Repetitive test setup/fixture boilerplate.
- First-pass markdown structure for this PR description.

### Where AI output was overridden or edited
- Inter-service contract shape and event naming conventions.
- Error-handling semantics (especially retry/failure recording behavior).
- Idempotency assumptions for notification attempts.
- Risk analysis, known gaps, and peer review notes to ensure project-specific realism.

### Estimated authorship split
- **AI-generated:** ~45%
- **Hand-written/edited by me:** ~55%

(Estimate includes substantial manual edits to architecture decisions, contract details, and tests.)

## Service Integration & Contracts
### Integration model
The two services integrate through explicit event calls during key monthly report lifecycle steps:

1. A report lifecycle action occurs (generation requested/completed/failed, delivery requested/completed/failed).
2. **Audit Service** records the canonical event with metadata (timestamp, actor/system source, correlation id, outcome, context).
3. **Notification Service** sends user-facing notices for configured event types.
4. Notification outcomes are also captured by **Audit Service** for end-to-end traceability.

### Inter-service contract established
A shared event contract is used conceptually across both services:

- `eventType` (e.g., `report.generated`, `report.delivery.failed`)
- `reportingMonth` (YYYY-MM)
- `studentId` / entity identifier
- `correlationId` (request/report run tracing)
- `status` (`success` | `failed` | `pending`)
- `message` / human-readable summary
- `metadata` (structured context, non-PII preferred)
- `occurredAt` (UTC timestamp)

#### Contract expectations
- Audit records should be append-only (no destructive updates to historical facts).
- Notification calls should be idempotent where possible.
- Failure to notify must still produce a successful audit write for failure analysis.

## Testing Coverage
### Covered
- Unit tests for notification dispatch success/failure paths.
- Unit tests for audit event persistence and validation logic.
- Integration tests for Notification→Audit interaction on both success and failure outcomes.
- Contract/shape tests for required event fields and status/value constraints.

### Known gaps
- Limited load/performance validation for high-volume monthly batch notification events.
- Retry/backoff behavior may not yet be deeply validated under transient downstream outages.
- Partial coverage for edge-case serialization differences across environments/timezones.
- No full end-to-end canary validation against external notification providers in CI.

## Risk / Trade-off
A key trade-off in this multi-service design is **consistency vs availability**:

- If notification delivery is treated as strictly required, API latency and failure rate can increase when downstream providers are unstable.
- If notification delivery is decoupled/asynchronous for availability, user-visible state may temporarily diverge from internal processing state.

Current approach favors operational availability with auditable eventual consistency, but that means consumers must tolerate short-lived status lag.

## Self-Review Checklist
- [x] Verified service boundaries are explicit and cohesive (Notification vs Audit responsibilities).
- [x] Confirmed inter-service contract fields are documented and consistently named.
- [x] Reviewed failure-path behavior to ensure failed notifications are auditable.
- [x] Validated tests cover happy path + core failure path.
- [x] Checked for accidental sensitive data leakage in logs/audit metadata.
- [x] Ensured docs explain assumptions, known gaps, and operational trade-offs.
- [x] Confirmed PR narrative aligns with implemented behavior and test evidence.

## Peer Review Simulation
### 1) Notification retry policy hardening
**Code location:** `src/services/notificationService.js` (around retry/send logic for provider errors)

**Comment:** Consider classifying provider failures into retryable vs non-retryable categories and implement bounded exponential backoff with jitter.

**Actionable change:** Add an error classification helper and cap retries (e.g., max 3 attempts) with jittered delays; persist attempt count in the audit metadata.

**Why:** This reduces thundering-herd behavior during provider incidents and improves operational predictability while preserving observability.

---

### 2) Audit schema contract validation at boundary
**Code location:** `src/services/auditService.js` (event ingestion/record creation path)

**Comment:** Add strict runtime schema validation (required fields + enum checks) before persisting audit events.

**Actionable change:** Introduce a validator (or JSON schema) for `eventType`, `status`, `reportingMonth`, and `correlationId`; reject malformed events with explicit error codes.

**Why:** Defensive validation prevents silent contract drift between services and keeps audit history trustworthy for compliance and debugging.

---

### 3) Timezone boundary edge case in monthly rollups *(commonly missed by AI)*
**Code location:** `src/services/monthlyReportService.js` (month window calculation and event timestamp filtering)

**Comment:** The month boundary logic appears to assume local server time; this can misclassify events near midnight UTC offsets.

**Actionable change:** Normalize all window calculations to UTC and add tests for end-of-month transitions across at least two non-UTC offsets.

**Why:** This is a subtle production bug class that often slips through AI-generated code and basic tests, especially in monthly reporting systems where date boundaries are business-critical.

---

## Impact Analysis
- **Operational impact:** Improved traceability and incident triage via explicit audit trails.
- **Developer impact:** Clearer contracts between services, easier debugging of notification flows.
- **User impact:** More consistent communication on report processing outcomes.
- **Future work:** Outbox/event bus decoupling, stronger idempotency keys, and provider-specific fallback strategies.
