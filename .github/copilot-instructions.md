# GitHub Copilot Instructions

## Purpose

This repository contains the TaskBridge assessment solution.

These instructions define the engineering standards that GitHub Copilot must follow when generating code, tests, documentation, architectural suggestions, migrations, API contracts, and refactoring proposals.

Copilot must prioritize consistency, maintainability, security, and correctness over speed of implementation.

---

# Current Scope Restrictions

The following constraints are mandatory:

- Do NOT implement new application features unless explicitly requested.
- Do NOT modify the existing Project Service unless specifically instructed.
- Do NOT create the Notification & Audit Service yet.
- Do NOT generate placeholder business functionality.
- Do NOT invent requirements that are not documented.
- Prefer architectural guidance, interfaces, contracts, documentation, and tests over speculative implementation.

When information is missing, generate assumptions as comments and clearly mark them.

---

# Technology Stack

Assume the TaskBridge solution follows a modern cloud-native architecture.

## Backend

- ASP.NET Core (.NET 8+)
- REST APIs
- Entity Framework Core
- PostgreSQL
- OpenAPI / Swagger
- Dependency Injection using built-in ASP.NET Core container

## Authentication

- JWT Bearer Authentication
- OAuth 2.0 / OpenID Connect compatible identity provider
- Claims-based authorization

## Messaging

Use asynchronous messaging abstractions where cross-service communication is required.

Examples:

- Azure Service Bus
- RabbitMQ
- Kafka

Generate code against abstractions rather than broker-specific implementations whenever possible.

## Infrastructure

- Docker
- Docker Compose for local development
- Cloud-ready deployment patterns
- Environment-based configuration

## Testing

- xUnit
- FluentAssertions
- Moq or equivalent mocking framework
- Integration testing using test containers where appropriate

---

# Architecture Conventions

## Service Boundaries

The solution follows a multi-service architecture.

Each service must:

- Own its own data store.
- Expose functionality through well-defined APIs.
- Avoid direct database access across services.
- Communicate through APIs or messaging contracts.
- Maintain independent deployment capability.

Never suggest sharing databases between services.

## Layering

Use clean separation of concerns.

Preferred structure:

```text
Service
 ├─ API
 ├─ Application
 ├─ Domain
 ├─ Infrastructure
 └─ Tests
