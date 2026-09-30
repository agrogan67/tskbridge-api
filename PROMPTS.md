# PROMPTS.md — GitHub Copilot Prompt Chain for Notification & Audit Service

## Overview

This document traces the complete prompt chain used to build the Notification & Audit Service specification and test suite for TskBridge API using GitHub Copilot. The chain demonstrates iterative refinement, constraint-based prompting, role-based reasoning, and decomposition techniques across multiple Copilot features.

**Generation Date:** 2026-09-30  
**Service:** Notification & Audit Service for TskBridge (Multi-tenant Homework Tracking API)  
**Artifacts:** SPEC.md, audit-notification.test.js, notification-audit-test-cases.md  

---

## Prompt Chain Execution Order

### Prompt 1: Architecture and Requirements Definition

**Feature Used:** GitHub Copilot Chat (Conversation Mode)

**Prompting Technique:** Constraint-Based + Role-Based Reasoning

**Exact Prompt Text:**
```
You are a software architect designing a notification and audit service for a 
multi-tenant education platform (TskBridge). The system tracks homework assignments 
and requires:

1. Notifications must reach ALL team members when a project state changes
2. Audit logs are immutable and cannot be deleted or modified
3. Tenant isolation is mandatory—users cannot access other organizations' data
4. IP addresses and user agents must be captured for compliance
5. Event types: PROJECT_STATUS_CHANGED, PROJECT_MILESTONE_UPDATED, PROJECT_DESCRIPTION_CHANGED

Constraints:
- Database: MySQL 5.7+ with JSON support
- No hard deletes (soft delete only)
- Query timeouts: 5 seconds maximum
- Support date-range and event-type filtering in audit queries

Design the data models (tables, fields, indexes) and explain immutability enforcement 
at both application and database levels. Include sample SQL for audit_logs table with 
triggers or constraints that prevent updates/deletes.
```

**Rationale:**
- **Constraint-Based:** Explicit technical and business constraints narrow the design space, reducing ambiguity.
- **Role-Based:** Framing the prompt as an architect speaking to architects establishes domain expertise and formality.
- Used Copilot Chat to explore architectural ideas conversationally before committing to code.

**Copilot Response Summary:**
- Proposed `audit_logs` table with `id`, `tenant_id`, `user_id`, `event_type`, `entity_type`, `entity_id`, `previous_state`, `new_state`, `created_at`.
- Suggested database-level immutability via `BEFORE UPDATE` and `BEFORE DELETE` triggers.
- Defined composite indexes on `(tenant_id, project_id)` and `(tenant_id, created_at)` for query performance.

---

### Prompt 2: Notification Dispatch Logic

**Feature Used:** GitHub Copilot Chat (Conversation Mode)

**Prompting Technique:** Decomposition + Specificity

**Exact Prompt Text:**
```
Now define the notification dispatch mechanism. Break this into sub-tasks:

A) Query all team members for a given project without including the requester
B) Create one notification record per team member in a single atomic transaction
C) Ensure no duplicate notifications for the same event
D) Handle edge cases:
   - Empty teams
   - Cross-tenant contamination (e.g., a user from Org B joining Org A's team by mistake)
   - Notification delivery failures (log them, don't crash)

For each sub-task, provide:
1. SQL query or pseudo-code
2. Validation check (how do you know it worked?)
3. One failure scenario and recovery

Use Node.js + MySQL2 with prepared statements (no string concatenation).
```

**Rationale:**
- **Decomposition:** Breaking notification logic into discrete, testable sub-tasks reduces cognitive load and allows targeted fixes.
- **Specificity:** Naming edge cases (empty teams, cross-tenant issues) forces the AI to consider security and robustness.
- Reused Chat to iterate on implementation details before committing to code.

**Copilot Response Summary:**
- Provided SQL query: `SELECT DISTINCT u.id FROM users u JOIN team_members tm ON u.id = tm.user_id WHERE tm.team_id = ? AND u.tenant_id = ? AND u.id != ?`
- Suggested batch insert with transaction wrapping.
- Outlined duplicate-prevention logic (check event timestamp + user ID combination).
- Listed validation: "Query returned N members, N notifications created, none for requester."

---

### Prompt 3: Audit Log Immutability Enforcement

**Feature Used:** GitHub Copilot Inline Code Suggestions (in editor)

**Prompting Technique:** Constraint-Based + Few-Shot Examples

**Exact Prompt Text:**
```
Create database-level immutability for audit_logs table. Write:

1. CREATE TABLE audit_logs with:
   - id (VARCHAR(36), PK)
   - tenant_id (FK, NOT NULL)
   - user_id (FK, NOT NULL)
   - event_type (VARCHAR(50), NOT NULL)
   - previous_state (JSON)
   - new_state (JSON)
   - created_at (TIMESTAMP, NOT NULL, DEFAULT CURRENT_TIMESTAMP)
   - updated_at (TIMESTAMP, NOT NULL, DEFAULT CURRENT_TIMESTAMP)
   
2. BEFORE UPDATE trigger that raises an error if any field except updated_at changes
3. BEFORE DELETE trigger that rejects the operation with message "Audit logs cannot be deleted"
4. Application-level repository method that throws if update/delete is attempted

Example trigger pattern:
BEGIN
  IF NEW.id != OLD.id OR NEW.tenant_id != OLD.tenant_id THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Audit logs are immutable';
  END IF;
END;

Provide all three with error messages that match compliance requirements.
```

**Rationale:**
- **Constraint-Based:** Specifying exact error messages and immutability rules ensures the output aligns with compliance needs.
- **Few-Shot:** Providing a sample trigger pattern teaches Copilot the desired syntax and structure.
- Used inline suggestions in the editor to generate schema and triggers in the same file.

**Copilot Response Summary:**
- Generated full `CREATE TABLE` with appropriate data types and indexes.
- Delivered two triggers (BEFORE UPDATE, BEFORE DELETE) with SIGNAL statements.
- Provided Node.js repository methods that check a read-only flag and throw descriptive errors.

---

### Prompt 4: Comprehensive Test Suite Design

**Feature Used:** GitHub Copilot Chat (Conversation Mode)

**Prompting Technique:** Role-Based + Iterative Refinement

**Exact Prompt Text:**
```
You are a QA engineer writing comprehensive Jest tests for the audit-notification service. 
Use this structure:

Test Suite: "Audit & Notification System"

Six core test cases (describe blocks):
1. TC-001: Notification Dispatch to All Team Members
2. TC-002: Audit Entry Creation on Milestone Update
3. TC-003: Audit Log Immutability Enforcement
4. TC-004: Audit History Date Range Filtering
5. TC-005: Audit History Event Type Filtering
6. TC-006: Audit Log Access Control & Tenant Isolation

For each:
- Use Arrange-Act-Assert pattern
- Test both happy path and failure cases
- Include at least 2 negative tests per describe block
- Use SQLite in-memory database for speed
- Mock repositories and services

Requirements:
- All tests must be independent (can run in any order)
- Setup creates two tenants, multiple users per tenant, teams, projects
- Verify both success AND unauthorized access blocking
- Test database constraints (immutability, FK violations)

Start with TC-001. Show the full beforeEach, the main test, and 3 edge cases.
```

**Rationale:**
- **Role-Based:** Adopting QA voice ensures tests are comprehensive and mutation-aware.
- **Iterative Refinement:** Requesting one test case first allows reviewing and correcting before generating others.
- Establishes Arrange-Act-Assert as the template to maintain consistency.

**Copilot Response Summary:**
- Provided full test setup with `beforeAll`, `beforeEach`, `afterAll`.
- Generated TC-001 test with three sub-tests: main dispatch, role-agnostic notifications, cross-tenant isolation.
- Included repository mocks and database schema setup.

---

### Prompt 5: Iterative Test Refinement and Edge Cases

**Feature Used:** GitHub Copilot Chat (Conversation Mode)

**Prompting Technique:** Iterative Refinement + Specificity

**Exact Prompt Text:**
```
The TC-001 tests look good. Now generate TC-002 through TC-006 with the same rigor.

For TC-002 (Audit Entry Creation):
- Test that previousState and newState are captured correctly
- Verify JSON serialization integrity (no truncation, no double-encoding)
- Test with large payloads (1000+ item arrays in state)
- Verify database persistence (can retrieve the entry after creation)
- Verify unique ID generation (no collisions)

For TC-003 (Immutability):
- Verify deletion is rejected at both repository and database levels
- Verify update is rejected for all fields except optional metadata
- Test overwrite-by-reinsert (same ID) fails with PK constraint
- Test that multiple failed attempts don't corrupt the audit trail

For TC-004 (Date Range):
- Test inclusive boundaries (start_date and end_date both included)
- Test wide range captures all entries
- Test narrow range returns empty set correctly
- Respect tenant isolation in date queries

For TC-005 (Event Type):
- Case-sensitive matching (PROJECT_STATUS_CHANGED != project_status_changed)
- Multi-type filtering (array of event types)
- Combine date range + event type filtering

For TC-006 (Tenant Isolation):
- Verify user from tenant2 gets 403 Forbidden for tenant1 audit access
- Prevent token reuse across tenants (token must be bound to tenant)
- Test access logging (audit_access_logs table records attempts)
- Role-based redaction (IP addresses visible to admins, hidden from members)

Generate all five test case describe blocks with at least 3 it() blocks each.
```

**Rationale:**
- **Iterative Refinement:** Building on the first test case, this prompt refines subsequent tests to follow the same pattern.
- **Specificity:** Listing exact edge cases (JSON truncation, large payloads, case sensitivity, token binding) ensures comprehensive coverage.
- Maintains consistency while addressing each test's unique challenges.

**Copilot Response Summary:**
- Delivered 5 complete describe blocks (TC-002 through TC-006).
- TC-002: 4 tests covering JSON integrity, large payloads, persistence, and unique IDs.
- TC-003: 5 tests covering deletion, update, overwrite, DB-level enforcement, and persistence after failures.
- TC-004: 5 tests covering boundaries, wide/narrow ranges, empty results, tenant isolation, and boundary inclusion.
- TC-005: 5 tests covering case sensitivity, multiple types, combined filtering.
- TC-006: 6 tests covering cross-tenant blocking, API 403 response, token binding, access logging, role-based redaction.

---

### Prompt 6: Test Case Documentation and SQL Verification

**Feature Used:** GitHub Copilot Chat (Conversation Mode)

**Prompting Technique:** Constraint-Based + Few-Shot Examples

**Exact Prompt Text:**
```
Create a human-readable test case document (Markdown) with the same six test cases. 
Each test case should have:

1. **Objective** — one sentence describing what is tested
2. **Preconditions** — the state of the database/system before the test
3. **Steps** — numbered actions (no code, just plain language)
4. **Expected Result** — what should happen (including error messages if applicable)

Format example:
---
## Test Case1 — Equal notification dispatch to all team members on project state change

**Objective:** Verify that a project state change produces one notification for each team member.

**Preconditions:**
- Organization A contains project `project-1` and team `team-1`.
- `team-1` has members `user-1`, `user-2`, `user-3`.
- Project is currently `ACTIVE`.

**Steps:**
1. Change project state from `ACTIVE` to `ARCHIVED`.
2. Query notifications for `team-1` and the event.

**Expected Result:**
- Exactly 3 notifications created (one per team member).
- Notifications contain project ID, event type, state change.
- No notification sent to users outside the team.
---

Create all six test cases in this format, then for each one, provide:
- SQL setup statements to create preconditions
- SQL verification queries to check the expected results
- Expected row counts or field values in comments

Use realistic UUIDs like 'tenant-a', 'user-1', 'project-1', 'milestone-1'.
```

**Rationale:**
- **Constraint-Based:** Specifying the exact Markdown format ensures consistent output.
- **Few-Shot:** Providing one complete example teaches the desired structure before generating six variations.
- Bridges from Jest tests to operational/manual test documentation.

**Copilot Response Summary:**
- Generated 6 well-structured test case documents.
- Each includes 4-6 SQL setup statements for preconditions.
- Each includes 4-8 SQL verification queries with `-- Expected:` comments.
- Covers all major scenarios: notification dispatch, audit creation, immutability, filtering, access control.

---

### Prompt 7: SPEC.md Integration and Data Model

**Feature Used:** GitHub Copilot Chat (Conversation Mode)

**Prompting Technique:** Decomposition + Constraint-Based

**Exact Prompt Text:**
```
The SPEC.md for TskBridge API (project service) already exists. Now write an 
"Audit & Notification Service" section to append to SPEC.md or create as a separate 
document. It should cover:

1. **Data Models**
   - audit_logs table (all fields, constraints, indexes, triggers)
   - notifications table (id, user_id, team_id, project_id, event_type, message, is_read, created_at)
   - audit_access_logs table (audit_log_id, user_id, allowed, denial_reason, accessed_at)

2. **API Endpoints**
   - GET /api/audit — list audit logs with date range + event type filters
   - GET /api/audit/:id — retrieve single audit entry (with authorization checks)
   - GET /api/notifications — list notifications for current user
   - PATCH /api/notifications/:id/read — mark notification as read

3. **Event Types**
   - PROJECT_STATUS_CHANGED
   - PROJECT_MILESTONE_UPDATED
   - PROJECT_DESCRIPTION_CHANGED
   - TEAM_MEMBER_ADDED
   - TEAM_MEMBER_REMOVED

4. **Constraints & Business Rules**
   - Immutability: audit entries are write-once, never deleted or modified
   - Tenant Isolation: all queries scoped by tenant_id
   - Notification Dispatch: all team members except requester
   - Access Control: admins see IP; members see redacted logs
   - Audit of Audits: every access attempt is logged

5. **Integration Points**
   - Listen for project events from Project Service
   - Emit notification events (for push/email delivery)
   - Provide audit export endpoint for compliance (CSV/JSON)

Use the same professional, structured format as the existing SPEC.md (sections, 
subsections, tables, JSON examples). Include error responses and HTTP status codes.
```

**Rationale:**
- **Decomposition:** Breaking down the spec into 5 sections (Data Models, API, Events, Rules, Integration) makes it easier to generate and review.
- **Constraint-Based:** Referencing the existing SPEC.md format ensures stylistic and structural consistency.

**Copilot Response Summary:**
- Delivered comprehensive specification covering all 5 sections.
- Included detailed table schemas with data types, constraints, and indexes.
- Provided 6 endpoint definitions with request/response JSON examples.
- Defined 5 event types with descriptions.
- Listed business rules, access control, and compliance requirements.

---

### Prompt 8: Post-Generation Refinement and Corrections

**Feature Used:** GitHub Copilot Inline Code Suggestions (in editor)

**Prompting Technique:** Iterative Refinement + Constraint-Based

**Exact Prompt Text:**
```
Review the generated test suite and spec for these issues:

1. The BEFORE UPDATE trigger should check if created_at is being modified—
   if so, reject. Otherwise, allow updated_at to be set to NOW().

2. The notifications table is missing a composite index on (tenant_id, team_id, created_at) 
   for efficient "get recent notifications" queries.

3. Test Case 3 (immutability) should verify that a direct SQL UPDATE also fails, 
   not just the application layer. Add a test that executes raw SQL.

4. The TC-001 test checks for 3 notifications but doesn't verify that the requester 
   (user-1) is excluded. Add explicit assertion: 
   expect(notifiedUserIds).not.toContain(user1.id);

5. The date range filtering in TC-004 uses millisecond-level precision. 
   MySQL might have seconds-level precision. Add a comment explaining this 
   and adjust test to account for rounding.

6. The IP address redaction in TC-006 should be tested: 
   - Admin sees: "ipAddress": "192.168.1.100"
   - Member sees: "ipAddress": undefined or omitted
   Add explicit field checks.

7. The audit_logs.id field should explicitly be a UUID v4 primary key. 
   Document how UUIDs are generated (client-side or server-side UUID library).

Regenerate the affected sections with these corrections applied.
```

**Rationale:**
- **Iterative Refinement:** Identifying issues and re-generating fixes specific issues without redoing the entire suite.
- **Constraint-Based:** Specifying exact assertions, indexes, and trigger logic ensures precise corrections.

**Copilot Response Summary:**
- Updated BEFORE UPDATE trigger to reject modifications to `created_at`, allow `updated_at` updates.
- Added composite index to notifications table.
- Enhanced TC-003 with raw SQL UPDATE test.
- Added explicit `.not.toContain(user1.id)` assertion to TC-001.
- Added note on MySQL timestamp precision in TC-004; adjusted test tolerance.
- Enhanced TC-006 with field-level assertions for IP address visibility.
- Documented UUID generation strategy (v4, server-side via `uuid` npm package).

---

## Copilot Features Used

### 1. GitHub Copilot Chat (Conversation Mode)
- **Used for:** Architectural design, requirements decomposition, test strategy, iterative refinement.
- **Advantages:** 
  - Allows multi-turn dialogue to refine ideas.
  - Can ask follow-up questions and request variations.
  - Easier to review outputs before committing to code.
- **Prompts:** 1, 2, 4, 5, 6, 7, 8

### 2. GitHub Copilot Inline Code Suggestions (in editor)
- **Used for:** SQL schema generation, trigger definitions, application-layer repository code.
- **Advantages:**
  - Autocomplete within actual file context.
  - Faster for generating boilerplate code.
  - Can quickly insert snippets into working files.
- **Prompts:** 3

---

## Prompting Techniques Used

### 1. **Constraint-Based Prompting**
Providing explicit technical and business constraints to narrow the solution space.

**Prompts:** 1, 3, 6, 7, 8

**Example:**
```
Constraints:
- Database: MySQL 5.7+ with JSON support
- No hard deletes (soft delete only)
- Query timeouts: 5 seconds maximum
```

**Effect:** Ensured outputs respected performance, compliance, and architecture requirements without requiring extensive refinement.

---

### 2. **Role-Based Reasoning**
Framing prompts as if the AI is adopting a professional role (architect, QA engineer, compliance officer).

**Prompts:** 1, 4

**Example:**
```
You are a software architect designing a notification and audit service...
You are a QA engineer writing comprehensive Jest tests...
```

**Effect:** Improved the sophistication and rigor of responses; the AI "knew" what architects and QA engineers prioritize (security, edge cases, compliance).

---

### 3. **Decomposition**
Breaking large, complex requirements into smaller, independent sub-tasks.

**Prompts:** 2, 7

**Example:**
```
Break this into sub-tasks:
A) Query all team members for a given project without including the requester
B) Create one notification record per team member in a single atomic transaction
C) Ensure no duplicate notifications for the same event
D) Handle edge cases...
```

**Effect:** Made it easier to generate precise, testable code; reduced ambiguity in each sub-task.

---

### 4. **Specificity**
Naming exact edge cases, error messages, and validation criteria instead of leaving them implicit.

**Prompts:** 2, 5, 8

**Example:**
```
Handle edge cases:
- Empty teams
- Cross-tenant contamination (e.g., a user from Org B joining Org A's team by mistake)
- Notification delivery failures (log them, don't crash)
```

**Effect:** Ensured the AI generated defensive code that handled realistic failure modes; reduced the need for follow-up fixes.

---

### 5. **Few-Shot Examples**
Providing one or two examples of the desired output format before asking the AI to generate many similar items.

**Prompts:** 3, 6

**Example:**
```
Example trigger pattern:
BEGIN
  IF NEW.id != OLD.id OR NEW.tenant_id != OLD.tenant_id THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Audit logs are immutable';
  END IF;
END;

Provide all three with error messages that match compliance requirements.
```

**Effect:** Copilot generated triggers that followed the exact syntax and error-handling pattern shown; reduced incorrect patterns (e.g., RAISE instead of SIGNAL).

---

### 6. **Iterative Refinement**
Reviewing outputs, identifying issues, and re-generating affected sections with targeted corrections.

**Prompts:** 5, 8

**Example:**
```
The TC-001 tests look good. Now generate TC-002 through TC-006...
Review the generated test suite and spec for these issues:
1. [Issue]
2. [Issue]
...
Regenerate the affected sections with these corrections applied.
```

**Effect:** Allowed incremental improvement without discarding working code; ensured quality increased with each iteration.

---

## Summary of Techniques vs. Prompts

| Technique | Prompts | Purpose |
|-----------|---------|---------|
| Constraint-Based | 1, 3, 6, 7, 8 | Narrow design space; enforce requirements |
| Role-Based | 1, 4 | Improve sophistication and rigor |
| Decomposition | 2, 7 | Break complex tasks into testable units |
| Specificity | 2, 5, 8 | Handle edge cases and realistic failures |
| Few-Shot | 3, 6 | Teach desired output format by example |
| Iterative Refinement | 5, 8 | Incrementally improve quality |

**Techniques Used:** 6  
**Required Minimum:** 3 ✓

---

## Post-Generation Corrections

This section documents every change made to Copilot's output, what was wrong, and how it was fixed.

### Correction 1: BEFORE UPDATE Trigger Logic

**What Was Wrong:**
Copilot generated:
```sql
CREATE TRIGGER audit_logs_no_update BEFORE UPDATE ON audit_logs
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Audit logs are immutable';
END;
```

This blocked ALL updates, including the `updated_at` timestamp that the application needs to set to track access.

**How It Was Fixed:**
```sql
CREATE TRIGGER audit_logs_no_update BEFORE UPDATE ON audit_logs
FOR EACH ROW
BEGIN
  IF NEW.id != OLD.id 
     OR NEW.tenant_id != OLD.tenant_id 
     OR NEW.user_id != OLD.user_id 
     OR NEW.event_type != OLD.event_type 
     OR NEW.entity_type != OLD.entity_type 
     OR NEW.entity_id != OLD.entity_id 
     OR NEW.previous_state != OLD.previous_state 
     OR NEW.new_state != OLD.new_state 
     OR NEW.created_at != OLD.created_at THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Audit logs are immutable';
  END IF;
  -- Allow updated_at to be updated to NOW()
END;
```

**Rationale:** Added granular field-by-field checks to permit `updated_at` updates while blocking all other modifications.

---

### Correction 2: Notifications Table Missing Index

**What Was Wrong:**
Copilot generated the `notifications` table without a composite index for efficient filtering:
```sql
CREATE TABLE notifications (
  id VARCHAR(36) PRIMARY KEY,
  tenant_id VARCHAR(36) NOT NULL,
  team_id VARCHAR(36),
  user_id VARCHAR(36) NOT NULL,
  event_type VARCHAR(50),
  message TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (team_id) REFERENCES teams(id)
);
```

Queries like "get all unread notifications for user X in tenant Y" would require full table scans.

**How It Was Fixed:**
```sql
CREATE TABLE notifications (
  -- ... (same fields)
  INDEX idx_tenant_user (tenant_id, user_id),
  INDEX idx_tenant_team_created (tenant_id, team_id, created_at),
  INDEX idx_is_read (is_read)
);
```

**Rationale:** Added composite indexes for the most common query patterns:
- Filter by tenant and user (accessing user's own notifications).
- Filter by tenant, team, and creation date (retrieving recent team notifications).

---

### Correction 3: TC-003 Missing Database-Level Immutability Test

**What Was Wrong:**
Copilot's TC-003 tested only application-layer immutability via repository methods. It did not verify that direct SQL UPDATE or DELETE statements were rejected at the database level (the whole point of triggers).

**Original test:**
```javascript
it('should prevent modification of audit entry fields', async () => {
  // ... setup
  expect(async () => {
    await repositories.auditLog.update(auditEntry.id, tenant1.id, { /* ... */ });
  }).rejects.toThrow('Audit logs are immutable');
  // ... assertion
});
```

**How It Was Fixed:**
Added a new test that bypasses the repository layer:
```javascript
it('should enforce immutability at database level (NOT just application logic)', async () => {
  // Arrange: Create audit entry
  const auditEntry = await auditNotificationService.recordAuditAndNotify({ /* ... */ });

  // Act: Attempt direct database UPDATE (bypassing application logic)
  expect(async () => {
    await db.query(
      'UPDATE audit_logs SET event_type = ?, new_state = ? WHERE id = ? AND tenant_id = ?',
      ['PROJECT_STATUS_CHANGED', JSON.stringify({ status: 'ARCHIVED' }), auditEntry.id, tenant1.id]
    );
  }).rejects.toThrow(); // Should fail due to DB-level immutability constraint

  // Assert: Verify entry unchanged in database
  const rows = await db.query(
    'SELECT event_type, new_state FROM audit_logs WHERE id = ? AND tenant_id = ?',
    [auditEntry.id, tenant1.id]
  );

  expect(rows[0].event_type).toBe('PROJECT_MILESTONE_UPDATED');
  expect(JSON.parse(rows[0].new_state)).toStrictEqual({ status: 'COMPLETED' });
});
```

**Rationale:** Ensures the database layer (trigger) enforces immutability, not just the application layer. Prevents an attacker or database admin from bypassing application checks.

---

### Correction 4: TC-001 Missing Requester Exclusion Assertion

**What Was Wrong:**
Copilot's test verified that 3 notifications were created but did not explicitly check that the requester (user-1) was NOT included:

```javascript
it('should dispatch notifications to all team members when project status changes', async () => {
  // ...
  const notifications = await repositories.notification.findByTeamId(team1.id);
  expect(notifications).toHaveLength(3); // Passes if 3 notifications exist, even if wrong users
  const notifiedUserIds = notifications.map(n => n.userId);
  expect(notifiedUserIds).toContain(user2.id);
  expect(notifiedUserIds).toContain(user3.id);
  expect(notifiedUserIds).toContain(user4.id);
  // Missing: verification that user1 is NOT notified
});
```

This would pass even if user-1 received a notification (4 notifications created instead of 3, but test only checks for 3).

**How It Was Fixed:**
```javascript
expect(notifiedUserIds).not.toContain(user1.id); // Requester excluded
```

**Rationale:** Explicitly verify the negative case (requester is NOT notified) as well as the positive cases. Prevents a bug where the requester accidentally receives a notification.

---

### Correction 5: TC-004 Timestamp Precision Mismatch

**What Was Wrong:**
Copilot generated tests using millisecond-level precision for timestamps:
```javascript
const startDate = new Date(now.getTime() - 1.5 * 24 * 60 * 60 * 1000);
const endDate = now;

const results = await repositories.auditLog.findByDateRange(
  tenant1.id,
  project1.id,
  startDate,
  endDate
);

expect(results).toHaveLength(2); // May fail due to rounding
```

MySQL stores timestamps at second precision (not millisecond), so entries created at `2026-09-30T12:34:56.999Z` and queried with millisecond boundaries could be excluded or included unexpectedly.

**How It Was Fixed:**
```javascript
const now = new Date();
const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

// Insert with explicit timestamps (timestamps are rounded by DB to seconds)
await db.query(
  `INSERT INTO audit_logs (..., created_at) VALUES (..., ?)`,
  [threeDaysAgo] // DB converts to second precision
);
// ... more inserts ...

// Query with same precision (no sub-second boundaries)
const startDate = new Date(now.getTime() - 1.5 * 24 * 60 * 60 * 1000);
const endDate = new Date(now.getTime() + 1000); // 1 second buffer for DB rounding

const results = await repositories.auditLog.findByDateRange(
  tenant1.id,
  project1.id,
  startDate,
  endDate
);

expect(results).toHaveLength(2);

// Explanation added to test:
// Note: MySQL TIMESTAMP columns have second precision. The DB will round
// millisecond-level timestamps. This test uses a 1-second buffer on endDate
// to account for rounding.
```

**Rationale:** Prevents flaky tests caused by timestamp precision mismatches between JavaScript (milliseconds) and MySQL (seconds).

---

### Correction 6: TC-006 IP Address Redaction Not Testable

**What Was Wrong:**
Copilot's TC-006 test checked that non-admin users see redacted audit logs, but the repository/service layer didn't actually implement redaction:

```javascript
it('should enforce role-based access control for sensitive audit data (IP addresses)', async () => {
  const auditEntry = await auditNotificationService.recordAuditAndNotify({
    // ... with ipAddress: '192.168.1.100'
  });

  const memberResponse = await request(app)
    .get(`/api/audit/${auditEntry.id}`)
    .set('Authorization', `Bearer ${user2.token}`)
    .set('X-Tenant-Id', tenant1.id);

  expect(memberResponse.status).toBe(200);
  expect(memberResponse.body.data.ipAddress).toBeUndefined(); // Fails—IP is visible to all
});
```

The service was returning the full audit entry without checking the user's role.

**How It Was Fixed:**
Added redaction logic to the audit service:

```javascript
// In AuditLogRepository or AuditNotificationService
async function findById(id, tenantId, user) {
  const entry = await db.query(
    'SELECT * FROM audit_logs WHERE id = ? AND tenant_id = ?',
    [id, tenantId]
  );
  
  // Redact sensitive fields for non-admin users
  if (user.role !== 'admin') {
    entry.ipAddress = undefined;
    entry.userAgent = undefined;
  }
  
  return entry;
}
```

And updated the test to pass the user object:

```javascript
const memberResponse = await request(app)
  .get(`/api/audit/${auditEntry.id}`)
  .set('Authorization', `Bearer ${user2.token}`)
  .set('X-Tenant-Id', tenant1.id);

expect(memberResponse.status).toBe(200);
expect(memberResponse.body.data.ipAddress).toBeUndefined(); // Now passes

const adminResponse = await request(app)
  .get(`/api/audit/${auditEntry.id}`)
  .set('Authorization', `Bearer ${user1.token}`)
  .set('X-Tenant-Id', tenant1.id);

expect(adminResponse.status).toBe(200);
expect(adminResponse.body.data.ipAddress).toBe('192.168.1.100'); // Admin sees IP
```

**Rationale:** Ensures sensitive fields are actually redacted based on user role, not just expected to be. Tests the full end-to-end behavior, not just the ideal case.

---

### Correction 7: UUID Generation Strategy Undocumented

**What Was Wrong:**
The schema and tests referenced UUID v4 IDs like `'audit-1'`, `'user-1'`, etc., but didn't specify:
1. How UUIDs are generated (client-side or server-side)?
2. Which npm package is used?
3. Is generation synchronous or async?

This could lead to developers using the wrong approach or causing ID collisions in tests.

**How It Was Fixed:**
Added documentation to the audit_logs table definition:

```sql
-- audit_logs.id is a VARCHAR(36) primary key containing UUIDs (RFC 4122, v4).
-- UUIDs are generated server-side using the 'uuid' npm package (v4 variant).
-- Generation is synchronous: const id = uuidv4();

CREATE TABLE audit_logs (
  id VARCHAR(36) PRIMARY KEY NOT NULL COMMENT 'UUIDv4, generated server-side by uuid@4.x',
  tenant_id VARCHAR(36) NOT NULL,
  -- ... other fields
);
```

And added to the service layer documentation:

```javascript
/**
 * Generates a new audit log ID using UUID v4.
 * @returns {string} UUID v4 (RFC 4122)
 */
function generateAuditLogId() {
  const { v4: uuidv4 } = require('uuid');
  return uuidv4();
}
```

**Rationale:** Prevents ambiguity and ensures all developers generate IDs the same way. Reduces risk of collisions or unexpected ID formats in production.

---

### Correction 8: TC-005 Event Type Case Sensitivity Not Enforced

**What Was Wrong:**
Copilot's TC-005 included a test for case-sensitive event type matching:

```javascript
it('should respect case sensitivity in event type filtering', async () => {
  // ... create entry with event_type = 'PROJECT_STATUS_CHANGED'
  
  const resultsExact = await repositories.auditLog.findByEventType(
    tenant1.id,
    project1.id,
    'PROJECT_STATUS_CHANGED'
  );
  expect(resultsExact).toHaveLength(1);

  const resultsWrongCase = await repositories.auditLog.findByEventType(
    tenant1.id,
    project1.id,
    'project_status_changed'
  );
  expect(resultsWrongCase).toHaveLength(0);
});
```

However, the repository implementation didn't enforce case sensitivity:

```javascript
async findByEventType(tenantId, projectId, eventType) {
  return db.query(
    'SELECT * FROM audit_logs WHERE tenant_id = ? AND project_id = ? AND event_type = ?',
    [tenantId, projectId, eventType.toUpperCase()] // Converts to uppercase—NO case sensitivity!
  );
}
```

**How It Was Fixed:**
Removed the `.toUpperCase()` conversion to enforce exact case matching:

```javascript
async findByEventType(tenantId, projectId, eventType) {
  return db.query(
    'SELECT * FROM audit_logs WHERE tenant_id = ? AND project_id = ? AND event_type = ?',
    [tenantId, projectId, eventType] // Exact match, case-sensitive
  );
}
```

And added a comment to explain:

```javascript
// Event types are case-sensitive (enum-like enforcement).
// Valid values: PROJECT_STATUS_CHANGED, PROJECT_MILESTONE_UPDATED, etc.
// Queries with wrong case (e.g., 'project_status_changed') return 0 results.
```

**Rationale:** Ensures the application rejects malformed queries and prevents silent bugs where lowercase event types are silently converted to uppercase.

---

## Summary of Corrections

| Correction # | Issue | Fix Type | Impact |
|--------------|-------|----------|--------|
| 1 | BEFORE UPDATE trigger blocked all updates | Logic refinement | CRITICAL—enabled access logging |
| 2 | Notifications table missing indexes | Schema enhancement | HIGH—improves query performance |
| 3 | TC-003 missing DB-level immutability test | Test expansion | HIGH—ensures defense-in-depth |
| 4 | TC-001 missing requester exclusion check | Test enhancement | MEDIUM—catches a common bug |
| 5 | Timestamp precision mismatch (ms vs. s) | Test robustness | MEDIUM—prevents flaky tests |
| 6 | IP address redaction not implemented | Logic addition | HIGH—ensures compliance |
| 7 | UUID generation strategy undocumented | Documentation | LOW—improves maintainability |
| 8 | Event type case sensitivity not enforced | Logic refinement | MEDIUM—prevents silent failures |

**Total Corrections:** 8  
**Critical Issues:** 1  
**High-Priority Issues:** 3  
**Medium-Priority Issues:** 3  
**Low-Priority Issues:** 1  

---

## Lessons Learned

### What Worked Well

1. **Constraint-Based Prompting:** Specifying exact requirements (database version, timeout limits, compliance rules) led to outputs that needed minimal correction.

2. **Role-Based Framing:** Adopting "architect" and "QA engineer" voices made Copilot outputs significantly more rigorous and comprehensive.

3. **Decomposition + Few-Shot:** Breaking tasks into sub-tasks and providing examples made it easy to generate consistent, high-quality code across multiple test cases.

4. **Iterative Refinement:** Re-generating specific sections after identifying issues was faster and less error-prone than discarding everything and starting over.

### What Needed Correction

1. **Implicit Assumptions:** Copilot assumed field updates were always allowed (didn't think about immutability triggers).

2. **Performance Considerations:** Initial schema generation lacked indexes; had to be added manually.

3. **Edge Case Testing:** TC-001 didn't explicitly verify requester exclusion; required a follow-up prompt.

4. **Cross-Layer Concerns:** Tests initially focused on application-layer behavior (repositories) without verifying database-layer constraints (triggers).

5. **Precision Mismatches:** Copilot didn't account for timestamp precision differences between JavaScript and MySQL.

### Future Recommendations

1. **Request defense-in-depth:** Explicitly ask for both application-layer AND database-layer enforcement.
2. **Specify performance requirements:** Include indexes and query complexity expectations in initial prompts.
3. **Demand negative test cases:** Always ask for tests that verify what should NOT happen, not just what should.
4. **Document assumptions:** After receiving output, list implicit assumptions and ask for clarification.
5. **Test the test suite:** Manually verify that tests actually catch bugs (e.g., by temporarily breaking implementation).

---

## Files Generated

- **tests/audit-notification.test.js** — Full Jest test suite (1,248 lines)
- **tests/notification-audit-test-cases.md** — Human-readable test case documentation
- **SPEC.md** (section) — Audit & Notification Service specification
- **PROMPTS.md** (this document) — Complete prompt chain and corrections

---

**Document Version:** 1.0  
**Last Updated:** 2026-09-30  
**Author:** GitHub Copilot (prompted by agrogan67)  
**Review Status:** ✅ Reviewed and corrected for production use
