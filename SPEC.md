# TskBridge API - Technical Specification

## 1. Overview

TskBridge API is a web app that tracks and reports homework completed by students in a monthly schedule. Student homework assignments are stored in a database and accessed through a simple web API. The system must maintain an audit trail of all changes for compliance.

---

## 2. Data Models

### 2.1 Projects (Homework Assignments)

**Table Name**: `projects`

| Field | Type | Description |
|-------|------|-------------|
| `id` | VARCHAR(36) | Unique ID (UUID v4) |
| `name` | VARCHAR(255) | Assignment name (e.g., "Math Chapter 5") |
| `description` | TEXT | Assignment details and instructions |
| `team_id` | VARCHAR(36) | References the team/class this assignment belongs to |
| `status` | VARCHAR(50) | ACTIVE, INACTIVE, ARCHIVED, or ON_HOLD |
| `created_at` | TIMESTAMP | When created |
| `updated_at` | TIMESTAMP | When last changed |
| `deleted_at` | TIMESTAMP | When deleted (soft delete only) |

**Indexes**:
- `idx_team_id (team_id)` - Find assignments by team
- `idx_status (status)` - Filter by status
- `idx_deleted_at (deleted_at)` - Exclude deleted records

### 2.2 Audit Log (Required for Compliance)

**Table Name**: `audit_logs`

Track all changes to assignments for compliance and reporting.

| Field | Type | Description |
|-------|------|-------------|
| `id` | VARCHAR(36) | Unique ID |
| `tenant_id` | VARCHAR(36) | Organization/school ID |
| `project_id` | VARCHAR(36) | Assignment ID |
| `user_id` | VARCHAR(36) | User who made the change |
| `event_type` | VARCHAR(100) | What happened (e.g., CREATED, UPDATED, DELETED, STATUS_CHANGED) |
| `entity_type` | VARCHAR(50) | Type of object changed (e.g., "Project") |
| `previous_state` | JSON | Data before change |
| `new_state` | JSON | Data after change |
| `created_at` | TIMESTAMP | When change was made |

**Key Rules**:
- Audit entries **cannot** be modified or deleted
- All queries must filter by `tenant_id` (no cross-organization access)
- Immutable record of every action for compliance

### 2.3 Notifications (Required for Team Communication)

**Table Name**: `notifications`

Notify team members when assignments are created, updated, or deleted.

| Field | Type | Description |
|-------|------|-------------|
| `id` | VARCHAR(36) | Unique ID |
| `tenant_id` | VARCHAR(36) | Organization/school ID |
| `user_id` | VARCHAR(36) | Who receives this notification |
| `project_id` | VARCHAR(36) | Assignment this is about |
| `event_type` | VARCHAR(100) | Type of event (CREATED, UPDATED, DELETED) |
| `message` | TEXT | Human-readable description |
| `read` | BOOLEAN | Has user read this? |
| `created_at` | TIMESTAMP | When notification created |

**Key Rules**:
- Send to all team members except the person who made the change
- Do not notify outside your organization
- Keep it simple: one notification per event

### 2.4 Teams (Existing - Required)

Represents a class, grade, or school division.

| Field | Type | Description |
|-------|------|-------------|
| `id` | VARCHAR(36) | Unique ID |
| `name` | VARCHAR(255) | Team/class name |
| `school_id` | VARCHAR(36) | Links to institution |
| `created_at` | TIMESTAMP | When created |

---

## 3. API Endpoints

### 3.1 Projects API

**Base URL**: `/api/projects`

#### Create Assignment
- **Endpoint**: `POST /api/projects`
- **Request**:
  ```json
  {
    "name": "Chapter 5 Math Problems",
    "description": "Complete problems 1-20",
    "teamId": "team-uuid-123"
  }
  ```
- **Response** (201 Created):
  ```json
  {
    "success": true,
    "data": {
      "id": "proj-uuid-456",
      "name": "Chapter 5 Math Problems",
      "teamId": "team-uuid-123",
      "status": "ACTIVE",
      "createdAt": "2026-09-29T10:15:00Z"
    }
  }
  ```

#### Get Assignment
- **Endpoint**: `GET /api/projects/:id`
- **Response** (200 OK): Returns assignment details

#### List Team Assignments
- **Endpoint**: `GET /api/projects/team/:teamId`
- **Response** (200 OK): Returns all active assignments for the team

#### Update Assignment
- **Endpoint**: `PUT /api/projects/:id`
- **Request**: Any fields to update (`name`, `description`, `status`)
- **Response** (200 OK): Returns updated assignment

#### Change Status
- **Endpoint**: `PATCH /api/projects/:id/status`
- **Request**: `{ "status": "ARCHIVED" }`
- **Valid Statuses**: ACTIVE, INACTIVE, ARCHIVED, ON_HOLD

#### Delete Assignment (Soft Delete)
- **Endpoint**: `DELETE /api/projects/:id`
- **Response** (200 OK): Marks assignment as deleted (not removed from database)

#### Restore Assignment
- **Endpoint**: `POST /api/projects/:id/restore`
- **Response** (200 OK): Un-deletes a previously deleted assignment

---

### 3.2 Audit Log API (Required for Compliance)

**Base URL**: `/api/audit`

#### Get Audit History for Project
- **Endpoint**: `GET /api/audit/project/:projectId`
- **Query Parameters**:
  - `startDate` - Start of date range (ISO format)
  - `endDate` - End of date range (ISO format)
  - `eventType` - Filter by event type (optional)
- **Response** (200 OK):
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "audit-1",
        "projectId": "proj-123",
        "userId": "user-456",
        "eventType": "STATUS_CHANGED",
        "entityType": "Project",
        "previousState": { "status": "ACTIVE" },
        "newState": { "status": "ARCHIVED" },
        "createdAt": "2026-09-29T10:15:00Z"
      }
    ]
  }
  ```

#### Get Single Audit Entry
- **Endpoint**: `GET /api/audit/:id`
- **Response** (200 OK): Returns one audit log entry

**Key Requirements**:
- All queries return only records for your organization
- No cross-organization access
- Audit records cannot be modified or deleted

---

### 3.3 Notifications API (Required for Team Communication)

**Base URL**: `/api/notifications`

#### Get My Notifications
- **Endpoint**: `GET /api/notifications`
- **Response** (200 OK):
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "notif-1",
        "projectId": "proj-123",
        "eventType": "CREATED",
        "message": "New assignment: Chapter 5 Math",
        "read": false,
        "createdAt": "2026-09-29T10:15:00Z"
      }
    ]
  }
  ```

#### Mark Notification as Read
- **Endpoint**: `PATCH /api/notifications/:id/read`
- **Response** (200 OK): Marks notification as read

---

## 4. How It Works: Monthly Report

1. **Teacher creates homework assignments** → Stored in `projects` table
2. **System logs the creation** → Entry added to `audit_logs`
3. **Team members are notified** → Notification added to `notifications` table
4. **Report shows monthly activity** → Query projects filtered by date range and status
5. **Compliance audit trail** → Complete history in `audit_logs` for record-keeping

---

## 5. Data Safety & Compliance

### Soft Delete (No Hard Deletes)
- Deleted assignments are marked with `deleted_at` timestamp
- Data is never removed from database
- Teachers can restore deleted assignments
- Complete history preserved for compliance

### Audit Trail (Required)
- Every change (create, update, delete, status change) is logged
- Audit logs cannot be modified or deleted
- Shows who made the change, when, and what changed
- Used for compliance reports and investigating issues

### Team Isolation
- Each organization sees only their own data
- Users cannot access other organizations' assignments or audit logs
- Enforced at database level and API level

---

## 6. Technical Requirements

### Database
- **MySQL** 5.7 or later
- **Character Set**: UTF-8 (supports international names)
- **Max Payload**: 1 MB per request
- **Query Timeout**: 5 seconds

### API
- **Format**: JSON only
- **Authentication**: Required on all endpoints (JWT or session token)
- **HTTPS**: Required in production
- **Rate Limiting**: Recommended (100-1000 requests per hour per user)

### Security
- All queries use parameterized statements (no SQL injection)
- Soft delete only - no permanent data loss
- Audit logs immutable and cannot be tampered with
- All PII protected at database level

---

## 7. Validation Rules

| Field | Rules |
|-------|-------|
| `name` | Required, 1-255 characters, no extra spaces |
| `description` | Optional, max 5000 characters |
| `teamId` | Required, must be valid UUID, must exist in teams table |
| `status` | Must be one of: ACTIVE, INACTIVE, ARCHIVED, ON_HOLD |

---

## 8. Error Responses

| Status | Message | Meaning |
|--------|---------|---------|
| 200 | OK | Success |
| 201 | Created | Assignment created |
| 400 | Bad Request | Invalid input (missing field, bad format) |
| 404 | Not Found | Assignment doesn't exist |
| 409 | Conflict | Team doesn't exist, or other business rule violated |
| 500 | Internal Server Error | System error |

---

## 9. Future Improvements (Not Needed Yet)

- [ ] Bulk operations (create multiple assignments at once)
- [ ] Due dates and reminders
- [ ] Grading rubrics
- [ ] Student submission status tracking
- [ ] Webhooks for external integrations
- [ ] GraphQL endpoint

---

**Document Version**: 2.0 (Simplified)  
**Last Updated**: 2026-10-02  
**Owner**: TskBridge API Team  
**Scope**: Basic homework tracking and monthly reporting with compliance audit trail
