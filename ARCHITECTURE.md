# ARCHITECTURE

- TaskBridge uses a multi-service, tenant-isolated design where the Project Service owns project lifecycle APIs and data.
- The Notification & Audit Service is a separate bounded context that persists immutable audit entries and user notifications.
- Integration contract: Project Service publishes domain events such as ProjectCreated, ProjectUpdated, ProjectStatusChanged, and ProjectDeleted.
- Each event includes tenantId, projectId, userId, eventType, timestamp, and a minimal before/after payload; consumers must ignore cross-tenant records.
- Inbound API request -> API controller -> application service -> domain validation -> repository/unit of work -> project database commit.
- After the commit, the Project Service emits the integration event through an asynchronous messaging abstraction, not a direct database call.
- Notification & Audit Service consumes the event, verifies tenant scope, writes an immutable audit record, and creates one notification per eligible tenant user.
- This keeps write latency low for the request path while preserving reliable side effects and independent service deployment.
- Layering follows API, Application, Domain, Infrastructure, and Tests so business rules stay isolated from transport and persistence concerns.
- Multi-tenancy is enforced at every boundary with tenant-aware contracts, database filtering, and no shared datastore between services.
- The architecture fits B2B SaaS because it supports isolation, compliance traceability, and independent scaling per service and tenant workload.
- Key trade-off: eventual consistency between project changes and downstream audit/notification persistence is accepted to avoid tight coupling.
- Another trade-off is added messaging complexity in exchange for resilience, auditability, and cleaner service boundaries.
