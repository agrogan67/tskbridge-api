define the technology stack for this project, what would be architecture conventions for a multi-service layout for an education institution summarize to five sentences, coding
standards, security rules relevant to a multi-tenant B2B SaaS context (authentication,
authorisation, data exposure), and testing expectations — comprehensive enough that any
developer on the team using Copilot will get consistent, standards-compliant output
# TskBridge API - Technology Stack

## Overview
TskBridge API is a Node.js-based REST API for managing homework tracking projects. It follows a layered architecture with clear separation of concerns.

---

## Runtime & Core Framework

### Node.js
- **Version**: >=14.0.0
- **Purpose**: JavaScript runtime environment
- **Why**: Lightweight, event-driven, perfect for I/O-heavy APIs; excellent package ecosystem

### Express.js
- **Version**: ^4.18.2
- **Purpose**: HTTP server framework
- **Why**: Minimalist, flexible, industry-standard for Node.js APIs; excellent middleware support
- **Components Used**:
  - Routing (`express.Router()`)
  - Middleware stack (`express.json()`, `express.urlencoded()`)
  - Request/Response handling

---

## Database Layer

### MySQL
- **Version**: 5.7+
- **Purpose**: Relational database for persistent data storage
- **Why**: ACID-compliant, reliable, proven for production use
- **Features Used**:
  - Tables with foreign key constraints
  - Indexes for query optimization
  - Timestamps (CURRENT_TIMESTAMP, ON UPDATE)
  - Soft deletes via NULL timestamps

### mysql2/promise
- **Version**: ^3.6.5
- **Purpose**: MySQL driver for Node.js with Promise support
- **Why**: 
  - Native Promise API (async/await support)
  - Connection pooling for performance
  - Parameterized queries to prevent SQL injection
  - Thread-safe operations
- **Key Features Used**:
  - Connection pooling
  - Prepared statements
  - Transaction support

---

## Application Architecture

### Layer 1: Controller
**File**: `src/controllers/ProjectController.js`
- Handles HTTP requests/responses
- Input validation
- Error handling
- HTTP status codes

### Layer 2: Service (Business Logic)
**File**: `src/services/ProjectService.js`
- Core business logic
- Data transformation
- Validation rules
- Service-to-model mapping

### Layer 3: Model
**File**: `src/models/Project.js`
- Data structure definition
- Instance methods
- JSON serialization
- Helper methods

### Layer 4: Database
**File**: `src/database/Database.js`
- Connection pooling management
- Query execution
- Transaction handling
- Resource lifecycle management

### Layer 5: Routes
**File**: `src/routes/projectRoutes.js`
- Endpoint definitions
- HTTP method mapping
- Controller binding

---

## Dependency Management

### Production Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `express` | ^4.18.2 | HTTP server framework |
| `mysql2` | ^3.6.5 | MySQL database driver |
| `uuid` | ^9.0.0 | UUID generation for project IDs |
| `dotenv` | ^16.3.1 | Environment variable management |

### Development Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `jest` | ^29.7.0 | Unit testing framework |
| `nodemon` | ^3.0.1 | Auto-reload for development |

---

## Project Structure

## architectural conventions A multi-service architecture for an education institution should separate concerns into domain-oriented services such as student, course, enrollment, attendance, assessment, and reporting, each owning its own database and API boundaries. Use a shared API gateway or BFF to expose a unified interface to clients while keeping internal service communication loosely coupled through REST, messaging, or event streaming. Standardize common conventions across services: versioned APIs, idempotent operations, consistent authentication/authorization, health checks, and centralized observability with logs, metrics, and traces. Maintain a shared data model for core entities like schools, students, teachers, and courses, but allow each service to define its own local schema to reduce coupling and improve scalability. Finally, adopt governance practices such as contract testing, CI/CD pipelines, and clear ownership so each service can evolve independently while still fitting the institution’s compliance, security, and reporting needs.


## Coding standards for an educational institution should enforce consistent naming conventions (camelCase for variables/functions, PascalCase for classes), enforce strong typing where applicable, and require comprehensive inline documentation with JSDoc comments explaining business logic, parameters, and return values relevant to the educational domain. Code organization must follow domain-driven design principles organized by bounded contexts (students, courses, assessments, etc.), with clear separation of concerns across layers (controllers, services, models, repositories), and strict enforcement of SOLID principles to ensure maintainability by diverse development teams. All code must include input validation for sensitive educational data (student IDs, grades, attendance), implement proper error handling with meaningful messages, and never expose system internals or PII in error responses, with special attention to FERPA compliance for student record protection. Version control practices should mandate meaningful commit messages referencing ticket/issue IDs, require peer code reviews before merge, enforce branch naming conventions (feature/, bugfix/, hotfix/), and maintain a clean linear history to facilitate auditing and compliance documentation. Testing standards must require minimum 80% code coverage with unit tests for business logic, integration tests for database operations and service interactions, and automated security scanning for vulnerabilities, dependency checks, and OWASP compliance, with all tests passing in CI/CD before production deployment.


## security rules Authentication must implement OAuth 2.0 or OpenID Connect with multi-factor authentication (MFA) mandatory for all administrative users and recommended for students/parents, while maintaining separate tenant isolation at the identity provider level with distinct authentication realms per institution to prevent cross-tenant credential leakage. Authorization should enforce role-based access control (RBAC) with tenant-scoped roles (Super Admin, School Admin, Teacher, Student, Parent, Guardian) where permissions are evaluated at both the resource level and data level, ensuring a teacher can only access students/grades within their assigned school and grade level, and a student cannot view classmates' grades or other schools' data. Data exposure prevention must employ field-level encryption for PII (student names, SSNs, DOBs, contact info) and sensitive academic data (grades, assessment scores, disciplinary records), implement database-level row-level security (RLS) or application-enforced tenant filtering on every query to prevent SQL injection or logic errors from exposing cross-tenant data, and audit all access to sensitive educational records with immutable logs for FERPA compliance. Network and transport security requires all communication over TLS 1.2+, API rate limiting per tenant and user role to prevent abuse, request signing for sensitive operations, and infrastructure-level isolation where each tenant's data is logically separated with encryption keys managed per-tenant. Finally, implement comprehensive API request/response validation, sanitize all inputs to prevent injection attacks, mask sensitive fields in logs and error messages, conduct quarterly penetration testing focusing on multi-tenant attack vectors (tenant switching, privilege escalation, data leakage), and maintain compliance with FERPA, COPPA (for minors), and local data residency laws which may require student data to remain within specific geographic regions or institutional boundaries.

#testing expectations testing expectations for an educational institution should be stricter than generic SaaS because the system handles sensitive learner data, compliance obligations, and high-stakes academic workflows. The testing strategy should cover functional correctness for student lifecycle, enrollment, attendance, grading, timetable, assessments, fee management, communication, and reporting, with clear pass/fail criteria for each workflow. Core expectations include unit tests for business rules, integration tests for database and API interactions, end-to-end tests for full user journeys like “student enrolls, class assignment is created, gradebook updates, parent portal sees record,” and role-based access tests to verify a teacher, student, parent, and admin only sees what they are entitled to see. Security testing must be mandatory: validation against tenant isolation, access control bypasses, PII leakage, injection attacks, broken authentication, and audit log integrity, with specific checks for FERPA/COPPA and local data protection rules. Non-functional expectations should include performance testing for peak periods like registration or grade submission, reliability and recovery testing for outages and backup restoration, accessibility testing for students and staff using assistive technologies, and compatibility testing across browsers, devices, and mobile apps. All production changes should be gated by CI/CD automation, require passing test suites and security scans, and maintain traceability from requirements to test cases so institutional stakeholders can demonstrate auditability and compliance.

