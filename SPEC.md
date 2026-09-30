# TskBridge API - Technical Specification

## 1. Overview

TskBridge API is a multi-tenant homework tracking and reporting system for educational institutions. This specification defines the data models, API contracts, integration points, and constraints for the Project Service component, which manages homework projects assigned to students within a school/team context.

---

## 2. Data Models

### 2.1 Project Entity

**Table Name**: `projects`

| Field | Type | Constraints | Description |
|-------|------|-----------|-------------|
| `id` | VARCHAR(36) | PRIMARY KEY, NOT NULL | UUID v4 generated client-side |
| `name` | VARCHAR(255) | NOT NULL | Project/assignment name (e.g., "Math Chapter 5 Homework") |
| `description` | TEXT | NULLABLE | Detailed project description, rubric, or instructions |
| `team_id` | VARCHAR(36) | NOT NULL, FK | References `teams.id` (school/grade level/class) |
| `status` | VARCHAR(50) | NOT NULL, DEFAULT 'ACTIVE' | Enum: ACTIVE, INACTIVE, ARCHIVED, ON_HOLD |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Audit timestamp |
| `updated_at` | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE | Audit timestamp |
| `deleted_at` | TIMESTAMP | NULLABLE | Soft delete marker for compliance/recovery |

**Indexes**:
```sql
INDEX idx_team_id (team_id)              -- Filter projects by team
INDEX idx_status (status)                -- Filter by status
INDEX idx_deleted_at (deleted_at)       -- Exclude soft-deleted records
INDEX idx_team_status (team_id, status) -- Common query pattern
```

**Foreign Key**:
```sql
CONSTRAINT fk_team_id FOREIGN KEY (team_id) 
  REFERENCES teams(id) ON DELETE CASCADE
```

### 2.2 Related Entities (External Services)

#### Teams Table
Required to exist in the same database. Represents school divisions, grades, or classes.

| Field | Type | Notes |
|-------|------|-------|
| `id` | VARCHAR(36) | Primary key |
| `name` | VARCHAR(255) | Team/class name |
| `school_id` | VARCHAR(36) | Links to institution |
| `created_at` | TIMESTAMP | Audit |

#### Expected Future Entities (Out of Scope for Project Service v1)
- `project_submissions` - Student homework submissions
- `project_rubrics` - Grading criteria
- `project_grades` - Grades/feedback per student
- `project_attachments` - Files, resources, rubrics

---

## 3. API Contract

### Base URL
```
POST   /api/projects
GET    /api/projects/:id
GET    /api/projects/team/:teamId
PUT    /api/projects/:id
PATCH  /api/projects/:id/status
DELETE /api/projects/:id
POST   /api/projects/:id/restore
```

### 3.1 Create Project
**Endpoint**: `POST /api/projects`

**Request**:
```json
{
  "name": "Chapter 5 Math Problems",
  "description": "Complete problems 1-20 from textbook section 5.3",
  "teamId": "team-uuid-123"
}
```

**Validation Rules**:
- `name`: Required, string, 1–255 characters, no leading/trailing whitespace
- `description`: Optional, string, max 5000 characters
- `teamId`: Required, string, must be valid UUID format, must reference existing team

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "id": "proj-uuid-456",
    "name": "Chapter 5 Math Problems",
    "description": "Complete problems 1-20 from textbook section 5.3",
    "teamId": "team-uuid-123",
    "status": "ACTIVE",
    "createdAt": "2026-09-29T10:15:00.000Z",
    "updatedAt": "2026-09-29T10:15:00.000Z",
    "deletedAt": null
  }
}
```

**Error Response** (400 Bad Request):
```json
{
  "error": "Bad Request",
  "message": "name and teamId are required"
}
```

**Error Response** (500 Internal Server Error):
```json
{
  "error": "Internal Server Error",
  "message": "Failed to create project"
}
```

---

### 3.2 Get Project by ID
**Endpoint**: `GET /api/projects/:id`

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "proj-uuid-456",
    "name": "Chapter 5 Math Problems",
    "description": "Complete problems 1-20 from textbook section 5.3",
    "teamId": "team-uuid-123",
    "status": "ACTIVE",
    "createdAt": "2026-09-29T10:15:00.000Z",
    "updatedAt": "2026-09-29T10:15:00.000Z",
    "deletedAt": null
  }
}
```

**Error Response** (404 Not Found):
```json
{
  "error": "Not Found",
  "message": "Project with ID proj-uuid-999 not found"
}
```

**Constraint**: Excludes soft-deleted projects (deletedAt IS NOT NULL).

---

### 3.3 Get Projects by Team
**Endpoint**: `GET /api/projects/team/:teamId`

**Query Parameters** (for future pagination):
- `page`: integer, default 1
- `limit`: integer, default 50, max 100

**Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": "proj-uuid-456",
      "name": "Chapter 5 Math Problems",
      "description": "Complete problems 1-20 from textbook section 5.3",
      "teamId": "team-uuid-123",
      "status": "ACTIVE",
      "createdAt": "2026-09-29T10:15:00.000Z",
      "updatedAt": "2026-09-29T10:15:00.000Z",
      "deletedAt": null
    }
  ]
}
```

**Constraint**: Returns only active projects (deletedAt IS NULL), ordered by createdAt DESC.

---

### 3.4 Update Project
**Endpoint**: `PUT /api/projects/:id`

**Request**:
```json
{
  "name": "Chapter 5 & 6 Math Problems",
  "description": "Updated: include Chapter 6 problems 1-15",
  "status": "ACTIVE"
}
```

**Validation**: Same as create; allows partial updates (only provided fields updated).

**Response** (200 OK): Returns updated project object.

---

### 3.5 Update Project Status
**Endpoint**: `PATCH /api/projects/:id/status`

**Request**:
```json
{
  "status": "ARCHIVED"
}
```

**Valid Status Values**:
- `ACTIVE` - Project is open and visible
- `INACTIVE` - Project paused (e.g., class absent that day)
- `ARCHIVED` - Project completed, hidden from active lists
- `ON_HOLD` - Project deferred pending review

**Response** (200 OK): Returns updated project.

**Error Response** (400 Bad Request):
```json
{
  "error": "Bad Request",
  "message": "status must be one of: ACTIVE, INACTIVE, ARCHIVED, ON_HOLD"
}
```

---

### 3.6 Delete Project (Soft Delete)
**Endpoint**: `DELETE /api/projects/:id`

**Request**: (no body)

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Project deleted successfully"
}
```

**Constraint**: Sets `deletedAt` to current timestamp; does not remove record. Deleted projects excluded from subsequent queries.

---

### 3.7 Restore Deleted Project
**Endpoint**: `POST /api/projects/:id/restore`

**Request**: (no body)

**Response** (200 OK): Returns restored project with `deletedAt: null`.

---

## 4. Integration Points

### 4.1 Dependencies on External Services

#### Teams Service (Required)
- **Dependency**: Project.teamId must reference a valid team
- **Integration**: Foreign key constraint `fk_team_id` ensures referential integrity
- **Fallback**: Reject project creation if team_id does not exist (409 Conflict or 404 Not Found)
- **Future**: Consider event-driven sync if teams deleted asynchronously

#### Authentication Service (Required for Production)
- **Integration**: All endpoints must validate JWT/session token
- **Tenant Isolation**: Extract `tenant_id` from token; filter all queries by tenant
- **Authorization**: Verify user role can manage projects for the specified team

#### Submissions Service (Future Integration)
- **Dependency**: Project may be referenced by `project_submissions` table
- **Constraint**: Project cannot be deleted if submissions exist (business rule: return 409 Conflict)
- **Cascade**: Consider ON DELETE behavior when defining submissions foreign key

### 4.2 Event Publishing (Future)
When Project Service reaches v2, emit events for:
```javascript
// Examples (not yet implemented)
ProjectCreated { projectId, teamId, timestamp }
ProjectStatusChanged { projectId, oldStatus, newStatus, timestamp }
ProjectDeleted { projectId, timestamp }
```

Subscribe by: Submissions service, reporting service, notification service.

---

## 5. Constraints & Business Rules

### 5.1 Data Integrity
- **UUID Format**: All IDs must be valid UUIDs (v4)
- **Tenant Isolation**: Projects are always scoped to team_id; no cross-team queries
- **Audit Trail**: `createdAt`, `updatedAt`, `deletedAt` are immutable after creation
- **Foreign Key**: teamId must reference an existing team; cascade delete on team removal

### 5.2 Status Workflow
```
ACTIVE ──┬──> INACTIVE (pause)
         ├──> ARCHIVED (complete)
         └──> ON_HOLD (defer)
INACTIVE ──> ACTIVE (resume)
ARCHIVED ──> ACTIVE (unarchive, rare)
ON_HOLD ──> ACTIVE (resume)
```

No invalid transitions; status updates are unrestricted (allow any transition for flexibility).

### 5.3 Soft Delete & Compliance
- **No Hard Delete**: Projects are soft-deleted to preserve audit trail (FERPA/educational compliance)
- **Restore Window**: Deleted projects can be restored indefinitely
- **Query Filtering**: All queries automatically exclude `deletedAt IS NOT NULL` records
- **Reporting**: Deleted projects may still appear in historical/archived reports (requires separate query with deleted_at NOT NULL)

### 5.4 Performance & Scalability
- **Connection Pool**: 10 concurrent MySQL connections
- **Query Timeout**: 5-second default timeout for all queries
- **Pagination**: Prepare for `GET /api/projects/team/:teamId?page=1&limit=50` (not yet enforced, but schema supports)
- **Indexing Strategy**: Composite index on `(team_id, status)` for common filtering

### 5.5 Validation & Error Handling
- **Field Validation**: 
  - `name`: 1–255 chars, trim whitespace, reject empty
  - `description`: max 5000 chars
  - `teamId`: valid UUID, must exist in teams table
  - `status`: enum validation against allowed values
- **HTTP Status Codes**:
  - `200` - OK
  - `201` - Created
  - `400` - Bad Request (validation failed)
  - `404` - Not Found
  - `409` - Conflict (e.g., team doesn't exist, or project cannot be deleted due to submissions)
  - `500` - Internal Server Error
- **Error Message**: Consistent JSON format; no stack traces in production

### 5.6 Rate Limiting (Recommended for Production)
- Per-tenant rate limit: 1000 requests/hour
- Per-user rate limit: 100 requests/hour
- Burst allowance: 10 requests/second

### 5.7 Timeouts & Resilience
- **Database Query Timeout**: 5 seconds
- **Connection Acquire Timeout**: 10 seconds
- **Graceful Degradation**: If teams service unavailable, reject project creation with 503 Service Unavailable

---

## 6. Technical Constraints

### 6.1 Database
- **MySQL Version**: 5.7 or later (supports JSON, triggers, foreign keys)
- **Character Set**: UTF-8 for international student names
- **Collation**: utf8mb4_unicode_ci for case-insensitive, emoji support
- **Transactions**: Supported for multi-step operations (e.g., create project + emit event)

### 6.2 API
- **Request Size**: Max 1 MB payload
- **Response Caching**: No caching (projects are mutable); every GET returns fresh data
- **CORS**: Enable for partner institutions; restrict to known origins
- **Content-Type**: `application/json` only

### 6.3 Authentication & Security
- **Token Expiry**: JWT expires in 1 hour (refresh token for longer sessions)
- **PII Handling**: Never log `description` field if it contains student names
- **TLS**: HTTPS only in production
- **SQL Injection**: Parameterized queries (mysql2 native prepared statements)

---

## 7. Non-Functional Requirements

| Attribute | Target | Notes |
|-----------|--------|-------|
| Availability | 99.5% uptime | Excludes scheduled maintenance |
| Latency (p95) | <200ms | For single project lookup |
| Throughput | 1000 RPS per instance | With connection pooling |
| Storage | ~100 bytes per project + description | Scales linearly |
| Recovery Time Objective (RTO) | 1 hour | Database replication/failover |
| Recovery Point Objective (RPO) | 5 minutes | Hourly backups minimum |

---

## 8. Deployment & Operations

### 8.1 Versioning
- API Version: v1 (implicit in `/api/projects`)
- Database Migrations: Track in `src/database/migrations/` with timestamps
- Breaking Changes: Require new API version (e.g., `/api/v2/projects`)

### 8.2 Monitoring
- Log all errors with requestId for tracing
- Track API response times (latency distribution)
- Monitor database connection pool utilization
- Alert on error rate > 1% or p95 latency > 500ms

### 8.3 Rollback Strategy
- Database migrations are backward-compatible (additive only)
- API changes deployed with blue-green strategy
- Soft deletes allow safe data recovery if rollback needed

---

## 9. Future Enhancements (Out of Scope v1)

- [ ] Project templates for recurring assignments
- [ ] Bulk project operations (create multiple for a team)
- [ ] Project attachments/resources (PDFs, videos, URLs)
- [ ] Due dates and deadline tracking
- [ ] Project rubrics and grading criteria
- [ ] Student submission status tracking
- [ ] Automatic status transitions (e.g., archive after due date)
- [ ] Webhooks for external integrations
- [ ] GraphQL endpoint alongside REST API

---

**Document Version**: 1.0  
**Last Updated**: 2026-09-29  
**Owner**: TskBridge API Team
