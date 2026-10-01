# Copilot Instructions for TskBridge API

## Purpose and scope

Use these instructions for all code, tests, and documentation generated for this repository. Treat `/home/runner/work/tskbridge-api/tskbridge-api/SPEC.md` and the existing repository behavior as the source of truth for product requirements. The project handles educational records in a multi-tenant environment; design for privacy, tenant isolation, and auditability from the start. Do not implement features or create services unless specifically requested, and do not expand a task into unrelated refactoring.

## Technology stack

- **Runtime and language:** Node.js, with the documented minimum of `>=14.0.0`; the application code uses JavaScript and CommonJS (`require`/`module.exports`). Keep additions compatible with the repository's supported runtime. `src/database/IDatabase.ts` is a TypeScript interface for database contracts; do not assume the project has migrated to TypeScript.
- **HTTP:** Express.js `^4.18.2`, using routers and middleware for HTTP concerns.
- **Production database:** MySQL `5.7+`, accessed through `mysql2/promise` `^3.6.5`. Use pooled connections, async/await, transactions where operations must be atomic, and parameterized queries.
- **Supporting packages:** `uuid` `^9.0.0` for UUID v4 identifiers and `dotenv` `^16.3.1` for environment configuration.
- **Tests:** Jest `^29.7.0`; the current test artifact also uses Supertest and an in-memory SQLite test database. Keep tests isolated and deterministic, and verify MySQL-specific behavior against MySQL where dialect differences matter.
- **Development tooling:** Nodemon `^3.0.1` is documented for local development. Check the repository's available manifests and scripts before assuming a command or adding tooling; do not invent commands or dependencies.

## Architecture conventions

Organize the education domain into independently owned services such as institution/tenant, identity, teams, projects, submissions, assessment, attendance, reporting, and notification/audit, with each service owning its API and persistence boundary. Keep this repository's existing layered separation: routes map endpoints, controllers handle HTTP concerns, services enforce business rules, models represent domain data, repositories/data-access code execute persistence operations, and database infrastructure manages connections and transactions. Expose client-facing APIs through a gateway or BFF where appropriate, version public contracts, and use documented REST or asynchronous events for service-to-service integration rather than coupling services to one another's tables. Share stable identifiers and contract definitions for cross-service entities, but do not make one service's database the integration interface or duplicate ownership of authoritative data. Standardize health/readiness checks, request IDs, structured and redacted logs, metrics, tracing, timeouts, idempotency for retryable writes, contract tests, and service ownership across services.

## Coding standards

- Follow the existing CommonJS JavaScript style and directory conventions; use `camelCase` for variables/functions and `PascalCase` for classes. Keep modules focused and dependencies explicit.
- Preserve the route/controller/service/repository/model/database separation. Put business rules in services, HTTP translation and status codes in controllers, and SQL in the data-access layer; do not let controllers contain persistence logic.
- Prefer small, cohesive functions and SOLID design. Document non-obvious educational-domain rules and public module interfaces with JSDoc, including parameter and return types; avoid comments that merely restate code.
- Validate all external input at the boundary, including type, format, length, allowed values, and relationships. Enforce domain invariants in the service as well; never trust client-supplied tenant, user, role, or ownership claims.
- Use the established application error types and consistent safe error responses. Return actionable validation messages without exposing stack traces, SQL, secrets, internal topology, or personal/educational data.
- Use parameterized SQL for all values; allowlist any dynamic identifiers or sort clauses because placeholders cannot safely represent SQL syntax. Use transactions for multi-step changes that must succeed or fail together.
- Avoid adding dependencies unless needed; use the existing ecosystem and inspect repository configuration before selecting versions or commands. Keep changes narrowly scoped, update directly related documentation, and do not weaken or remove tests to make a change pass.
- Follow meaningful, reviewable changes and require peer review before merge. Where repository workflow specifies commit or branch conventions, follow them.

## Security, authentication, and authorization

- Treat every request as untrusted. Production APIs must authenticate through OAuth 2.0/OpenID Connect or an approved identity provider and validate signed, unexpired tokens, issuer, audience, and required claims. Administrative accounts require MFA; encourage MFA for other user groups. Never implement custom cryptography or accept an unverified identity header as authentication.
- Derive the tenant and actor only from verified authentication context. A request parameter, header, body field, or resource ID must never override those claims. Fail closed when identity or tenant context is missing or inconsistent.
- Apply tenant-scoped RBAC and least privilege at both action and resource/data level. Roles may include platform/super administrator, institution/school administrator, teacher, student, parent, and guardian, but permissions must be explicit and limited to the user's assigned institution, school, class/team, and relationship. A parent/guardian must only access linked learners; a student must not access another student's records.
- Authorize every operation, including reads, list/search/export, updates, deletes/restores, and background jobs. Check resource ownership/tenant membership server-side; do not rely on opaque IDs or UI filtering. Return a safe denial or not-found response without confirming another tenant's resource exists.
- Scope every database read and write to the authenticated tenant and relevant resource/relationship in the same query or transaction. Enforce isolation at the database layer when supported; otherwise centralize and test application-level tenant predicates. Never execute a query for tenant-owned data without an explicit tenant scope.
- Require HTTPS/TLS 1.2 or newer in production, secure secret management, restrictive CORS, bounded request sizes and timeouts, and rate limits by tenant and user/role. Apply request signing or equivalent replay/tamper protection to sensitive operations where the integration threat model requires it.
- Validate and normalize input; use parameterized queries, safe output handling, and allowlists to prevent injection and request-smuggling classes of bugs. Do not log credentials, tokens, student names, grades, contact details, or raw request/response bodies containing sensitive data.

## Data exposure and educational privacy

- Minimize collection, retention, and response fields. Return only the fields required by the authorized caller; apply role-based redaction to sensitive audit metadata and exports as well as ordinary API responses.
- Encrypt traffic in transit and protect stored PII and sensitive educational records (including grades, assessment, attendance, and disciplinary data) at rest. Use field-level encryption and tenant-aware key management where required by the data classification and deployment design; never implement encryption with hard-coded keys.
- Audit sensitive record access and administrative/security actions with actor, tenant, action, resource, outcome, timestamp, and request ID. Protect audit records against unauthorized alteration/deletion, restrict audit access, and apply documented retention and access policies. Treat IP addresses and user agents as sensitive data.
- Redact personal data and secrets from logs, traces, errors, and metrics; use correlation IDs rather than copying record contents. Ensure error serialization cannot expose internal exceptions or database details.
- Design and test for applicable FERPA, COPPA, and local privacy/data-residency obligations. Do not claim compliance based only on code; involve the institution's privacy/security owners for policy, retention, consent, and residency decisions.

## Testing expectations

- Add or update Jest tests with every behavioral change. Test service/domain rules at unit level, repositories and database constraints at integration level, and HTTP contracts/user flows with the established Supertest pattern where applicable.
- Target at least **80% code coverage** for changed application code, while prioritizing meaningful branch and behavior coverage over a percentage-only goal. Do not claim coverage if repository tooling cannot report it.
- Include both positive and negative cases: validation boundaries, missing/expired identity, each relevant role, cross-tenant ID substitution, unauthorized relationships, pagination/filter limits, duplicate/retried writes, transaction rollback, and safe error/redaction behavior.
- Prove tenant isolation for every tenant-scoped data path, including list, search, export, background processing, and audit access. Verify that denied attempts do not leak record existence or sensitive fields.
- Test SQL parameterization and database constraints, including MySQL-specific triggers, transaction, timestamp, and collation behavior against MySQL rather than relying solely on SQLite.
- Keep tests deterministic: isolate test data, clean up resources, avoid wall-clock assumptions, and use explicit timestamps where database precision or time boundaries matter. Test failure and recovery paths for database and downstream-service timeouts.
- Add API/service contract tests when service boundaries change. For relevant production paths, gate changes on functional suites and automated security/dependency scans; performance, recovery, accessibility, and compatibility tests should be added where the change affects those qualities.
- Before finishing, inspect the diff, run the existing applicable tests/checks, and report any unavailable checks honestly. Never edit unrelated tests or build configuration to conceal a failure.
