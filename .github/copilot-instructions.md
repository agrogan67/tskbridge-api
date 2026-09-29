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
