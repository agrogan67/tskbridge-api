# Notification & Audit Service Test Cases

These six test cases cover the requested notification dispatch, audit integrity, filtering, and organisation-isolation behaviours. They are intentionally independent and can be mapped to automated integration tests in the service test suite.

## Test Case1 — Equal notification dispatch to all team members on a project state change

**Objective:** Verify that a project state change produces one equivalent notification for every member of the project team.

**Preconditions:**
- Organisation A contains project `project-1` and team `team-1`.
- `team-1` has members `user-1`, `user-2`, and `user-3`.
- The project is currently `ACTIVE`.

**Steps:**
1. Change the project state from `ACTIVE` to `ARCHIVED` as an authorised user.
2. Retrieve the notifications generated for `team-1` and the state-change event.

**Expected result:**
- Exactly one notification is created for each team member.
- All three members are included; no member is omitted because of role.
- Notifications contain the same event type, project ID, old state, and new state.
- No notification is sent to users outside the organisation or team.

## Test Case2 — Audit entry is created correctly when a project milestone is updated

**Objective:** Verify that a milestone update creates a complete and accurate audit entry.

**Preconditions:**
- Milestone `milestone-1` belongs to `project-1`.
- The previous milestone state is `{ "status": "PENDING", "completionPercentage": 0 }`.

**Steps:**
1. Update the milestone to `{ "status": "COMPLETED", "completionPercentage": 100 }`.
2. Retrieve the resulting audit entry.

**Expected result:**
- One audit entry is created with event type `PROJECT_MILESTONE_UPDATED`.
- The entry identifies the correct organisation, actor, project, milestone, and timestamp.
- `previousState` and `newState` exactly match the before-and-after values.
- The entry has a unique ID and is persisted.

## Test Case3 — Audit entry cannot be deleted or overwritten

**Objective:** Verify audit-log immutability.

**Preconditions:**
- Audit entry `audit-1` exists.

**Steps:**
1. Attempt to delete `audit-1`.
2. Attempt to update its event type or state.
3. Attempt to insert a replacement entry using the same ID.
4. Retrieve `audit-1` again.

**Expected result:**
- Delete, update, and same-ID overwrite operations are rejected.
- The original entry remains present and unchanged.
- The original actor, event type, states, timestamp, and ID are preserved.

## Test Case4 — Audit history query returns correct results filtered by date range

**Objective:** Verify inclusive date-range filtering of audit history.

**Preconditions:**
- Audit entries exist before, inside, and after the requested date range for the same organisation and project.

**Steps:**
1. Query audit history with a start date and end date.
2. Include entries exactly on both boundaries.

**Expected result:**
- Only entries within the requested range are returned.
- Boundary entries are included according to the API's documented inclusive-boundary rule.
- Entries outside the range are excluded.
- Results remain scoped to the requested organisation and project.

## Test Case5 — Audit history query filtered by event type returns only matching entries

**Objective:** Verify event-type filtering.

**Preconditions:**
- The project has audit entries for `PROJECT_STATUS_CHANGED`, `PROJECT_MILESTONE_UPDATED`, and another event type.

**Steps:**
1. Query audit history using event type `PROJECT_MILESTONE_UPDATED`.
2. Inspect every returned entry.

**Expected result:**
- Every returned entry has event type `PROJECT_MILESTONE_UPDATED`.
- Entries for other event types are excluded.
- If no entries match, the service returns an empty result set rather than unrelated entries.

## Test Case6 — Unauthorised user cannot access another organisation's audit log

**Objective:** Verify tenant isolation and authorisation for audit history.

**Preconditions:**
- Organisation A owns audit entry `audit-1`.
- `user-b` belongs only to Organisation B.

**Steps:**
1. Authenticate as `user-b`.
2. Request `audit-1` directly and query Organisation A's audit history.
3. Attempt to override the organisation/tenant context in the request.

**Expected result:**
- Direct access is rejected with `403 Forbidden` (or the service's documented authorisation error).
- The history query returns no entries from Organisation A.
- A tenant-context override does not grant access.
- No Organisation A audit data is disclosed in the response.
