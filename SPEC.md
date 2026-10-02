# TskBridge API Assignment Specification

## Goal

Build a beginner-friendly Notification and Audit Service for TskBridge, a multi-tenant homework tracking system. The service records important project changes, notifies the relevant team members, and lets authorised users review audit history. Keep each organisation's information private.

## Project API

The existing Project Service manages assignments for a team. Keep these routes:

| Method | Route | Purpose |
|---|---|---|
| `POST` | `/api/projects` | Create a project |
| `GET` | `/api/projects/:id` | Get a project |
| `GET` | `/api/projects/team/:teamId` | List a team's projects |
| `PUT` | `/api/projects/:id` | Update a project |
| `PATCH` | `/api/projects/:id/status` | Change project status |
| `DELETE` | `/api/projects/:id` | Soft-delete a project |
| `POST` | `/api/projects/:id/restore` | Restore a deleted project |

Projects have a name, optional description, team ID, status, and creation/update timestamps. Valid statuses are `ACTIVE`, `INACTIVE`, `ARCHIVED`, and `ON_HOLD`. Names are required and must be 1–255 characters; descriptions are optional and may be up to 5,000 characters. A project must belong to an existing team. Team lists return active, non-deleted projects, newest first. Deleting a project sets its deletion time rather than permanently removing it. Normal project lookups and lists exclude deleted projects.

## Notification and Audit Requirements

Store notifications with their recipient, team, project, event type, message, read status, and creation time. Store audit entries with their organisation, actor, event type, affected item, before-and-after values, time, and IP address and user agent when available. Store audit access attempts with the audit entry (when applicable), user, result, denial reason, and time.

### Notifications

- When a project's status changes, create one notification for every other member of that project’s team. Do not notify the person who made the change.
- Create notifications for the team together as one operation. Only include members of the same team and organisation, and do not send duplicates for the same event.
- Include the project ID, event type, and relevant old and new values in each notification.
- Respect each user's notification preferences. Notifications may be passed to future push or email delivery systems.
- A notification failure should be logged and must not crash the application.
- Users can list their own notifications and mark one as read:
  - `GET /api/notifications`
  - `PATCH /api/notifications/:id/read`

### Audit history

- Record project changes using these event types: `PROJECT_STATUS_CHANGED`, `PROJECT_MILESTONE_UPDATED`, and `PROJECT_DESCRIPTION_CHANGED`.
- Also support `TEAM_MEMBER_ADDED` and `TEAM_MEMBER_REMOVED` audit events.
- Audit entries are permanent: updates and deletes must be rejected by both the application and database.
- Authorised users can query audit history by date range and event type, or retrieve one entry:
  - `GET /api/audit` (supports date-range and event-type filters)
  - `GET /api/audit/:id`
- Provide an authorised audit export in CSV or JSON format.
- Date-range results include entries on both the start and end dates. Event-type matching is exact.
- Record every attempt to access audit history, including the user, audit entry (when applicable), whether access was allowed, any denial reason, and the time. This access log must not expose audit data to unauthorised users.

## Access and Privacy

- Require a valid authentication token for API requests.
- Derive the organisation (tenant) from the authenticated user. Do not trust a tenant ID supplied by the request to grant access.
- Every read and write must be limited to the user's organisation. Team members may receive notifications for their own team; only users authorised for audit history may read audit entries.
- Reject cross-organisation requests with `403 Forbidden` and do not reveal another organisation's data.
- Only administrators may see IP addresses in audit history. Hide IP addresses from regular members.
- Use parameterized database queries. Do not include sensitive information or stack traces in error responses.

## Project Events

The Project Service may publish these events for future integrations: `ProjectCreated`, `ProjectStatusChanged`, and `ProjectDeleted`. The Notification and Audit Service requirements above apply to the specified audit event types.

## Completion Checks

The assignment is complete when tests show that:

- A status change notifies each other team member exactly once, and no one outside that team or organisation is notified.
- Audit entries contain the correct actor, event type, project, and before-and-after values.
- Audit entries cannot be changed or deleted.
- Date and event-type filters return only matching audit entries.
- Users cannot access another organisation's audit history, and audit access attempts are recorded.
- Administrators can see audit IP addresses while regular members cannot.
