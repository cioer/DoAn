---
stepsCompleted: [1, 2, 3, 4]
inputDocuments: []
workflowType: 'research'
lastStep: 1
research_type: 'technical'
research_topic: 'RBAC + Workflow State Machine + Audit Trail + Document Management for Academic Research Systems'
research_goals: 'Xác định patterns và best practices để implement vào hệ thống NCKH (quản lý nghiên cứu khoa học)'
user_name: 'Coc'
date: '2026-01-02'
web_research_enabled: true
source_verification: true
---

# Research Report: Technical Research - Architecture & Security Patterns for Academic Research Management Systems

**Date:** 2026-01-02
**Author:** Coc
**Research Type:** Technical

---

## Research Overview

## Technical Research Scope Confirmation

**Research Topic:** RBAC + Workflow State Machine + Audit Trail + Document Management for Academic Research Systems
**Research Goals:** Xác định patterns và best practices để implement vào hệ thống NCKH (quản lý nghiên cứu khoa học)

**Technical Research Scope:**

- Architecture Analysis - design patterns, frameworks, system architecture
- Implementation Approaches - development methodologies, coding patterns
- Technology Stack - languages, frameworks, tools, platforms
- Integration Patterns - APIs, protocols, interoperability
- Performance Considerations - scalability, optimization, patterns

**Research Methodology:**

- Current web data with rigorous source verification
- Multi-source validation for critical technical claims
- Confidence level framework for uncertain information
- Comprehensive technical coverage with architecture-specific insights

**Scope Confirmed:** 2026-01-02

---


<!-- Content will be appended sequentially through research workflow steps -->

---

## Technology Stack Analysis

### Programming Languages

**Popular Languages for Workflow & Authorization Systems:**

- **Java/Kotlin** - Enterprise-grade choice for complex workflow systems
  - Spring State Machine provides robust state machine implementation [Source: spring.io](https://spring.io/projects/spring-statemachine)
  - Strong typing and enterprise ecosystem for mission-critical systems
  - Widely adopted in academic/government sectors

- **TypeScript/Node.js** - Modern web applications with real-time workflows
  - Express.js with custom state machine implementations
  - Async/await patterns for workflow orchestration

- **Python** - Rapid prototyping and data-intensive applications
  - Growing adoption in academic/research contexts
  - Rich ecosystem for data processing

**Emerging Trends:**
- Kotlin for Spring Boot applications gaining traction in 2025 [Source: Medium](https://medium.com/@sanketsloth/managing-state-transitions-in-spring-boot-state-machine-with-kotlin-3ee6dea05ea1)
- Rust for performance-critical authorization systems (emerging)

### Development Frameworks and Libraries

**Major Workflow Frameworks:**

| Framework | Type | Best For |
|-----------|------|----------|
| **Spring State Machine** | Java/Kotlin library | Enterprise applications, Spring ecosystem |
| **AWS Step Functions** | Cloud-native serverless | Distributed workflows, AWS-centric |
| **Camunda 8** | BPMN workflow engine | Complex business processes, human workflows |
| **Temporal** | Durable execution | Long-running workflows, code-based orchestration |
| **Activiti/Flowable** | BPMN engine | Legacy systems, Java-based workflows |

**Framework Analysis:**

- **Camunda** - Top-ranked workflow engine (8.4/10 rating)
  - BPMN 2.0 standard for visual process modeling
  - Best for complex academic research approval workflows
  - Strong community and enterprise support
  - [Source: CSDN Analysis](https://blog.csdn.net/zhipengfang/article/details/136134700)

- **Temporal** - Emerging leader (8.6/10 rating)
  - Code-first workflow definition
  - Excellent for long-running processes
  - Strong emphasis on event-driven workflows
  - [Source: PeerSpot Comparison](https://www.peerspot.com/products/comparisons/camunda_vs_temporal)

- **Spring State Machine** - Traditional choice for Spring teams
  - State-driven workflow management
  - Integrates with Spring Boot ecosystem
  - Hierarchical state support
  - [Source: Baeldung Guide](https://www.baeldung.com/spring-state-machine)

**Micro-frameworks & Libraries:**
- XState (JavaScript/TypeScript) - Modern state machine library
- State.js - Lightweight state management
- Automata - Python finite state machines

### Database and Storage Technologies

**Relational Databases:**

- **PostgreSQL** - Recommended for workflow systems
  - Native JSONB support for flexible state storage
  - Row-level security for RBAC implementation
  - Excellent audit trail capabilities with triggers
  - [Industry Standard for enterprise applications]

- **MySQL/MariaDB** - Widely deployed in academic institutions
  - Proven reliability for mission-critical systems
  - Strong transactional support

**NoSQL Databases:**

- **MongoDB** - Document versioning pattern
  - Native document versioning capabilities
  - Flexible schema for evolving workflow definitions
  - [Source: MongoDB Blog](https://www.mongodb.com/company/blog/building-with-patterns-the-document-versioning-pattern)

**In-Memory Databases:**
- **Redis** - State caching and session management
- **Hazelcast** - Distributed state for horizontal scaling

**Audit Trail Storage:**
- Append-only log tables in PostgreSQL
- Time-series databases (TimescaleDB) for log analytics
- Immutable storage patterns for compliance

### Development Tools and Platforms

**IDE and Editors:**
- IntelliJ IDEA - Java/Kotlin development
- VS Code - TypeScript/Python with excellent extensions
- Eclipse - Traditional enterprise choice

**Version Control:**
- Git (GitLab/GitHub/Bitbucket) - Industry standard
- Git-based code review workflows
- Branching strategies for feature development

**Build Systems:**
- Maven/Gradle - Java ecosystem
- npm/yarn/pnpm - JavaScript ecosystem
- Poetry/Pipenv - Python packaging

**Testing Frameworks:**
- JUnit 5 + TestContainers - Java integration testing
- Jest + Supertest - Node.js API testing
- PyTest - Python testing

**API Documentation:**
- OpenAPI/Swagger - REST API specification
- Postman - API testing and documentation

### Cloud Infrastructure and Deployment

**Major Cloud Providers:**

| Provider | Workflow Services | Best For |
|----------|------------------|----------|
| **AWS** | Step Functions, SWF | Serverless workflows, Lambda integration |
| **Azure** | Logic Apps, Durable Functions | Enterprise Microsoft environments |
| **GCP** | Workflow Executions, Cloud Tasks | Data-intensive workflows |

**Container Technologies:**
- **Docker** - Application containerization
- **Kubernetes** - Orchestrated deployment with Operator pattern
- **Helm** - Kubernetes package management

**Serverless Platforms:**
- **AWS Lambda + Step Functions** - Event-driven workflow execution
- **Azure Durable Functions** - Long-running orchestrations
- **Google Cloud Workflows** - Multi-step workflow automation

### Technology Adoption Trends

**Migration Patterns:**
- Monolithic workflows → Microservice orchestration
- Custom workflow engines → Standards-based (BPMN/State Machine)
- On-premise deployment → Cloud-native with hybrid options

**Emerging Technologies:**
- AI-powered workflow optimization (2025-2026 trend)
- Low-code workflow builders with enterprise backend
- Event-driven architecture with workflow engines

**Legacy Technology:**
- Pure SQL-based state management being replaced
- Custom workflow engines migrating to open-source standards
- XML-based workflow definitions giving way to code-first approaches

**Community Trends:**
- Growing adoption of Temporal for durable execution
- Camunda maintaining leadership in BPMN space
- Spring ecosystem continues to dominate Java workflow development

**For Academic/Public-Sector Context:**
- Open-source solutions preferred (Camunda, Flowable, Temporal)
- Self-hosted deployment requirements drive technology choices
- Compliance and audit capabilities are primary decision factors
- Integration with existing identity providers (SAML/Shibboleth)

---

*Research Date: 2026-01-02 | Web Sources Verified*

---

## Phase 1 MVP Technology Decisions

**User Confirmed Architecture (2026-01-02):**

| Component | Phase 1 Decision | Phase 2 (Future) |
|-----------|------------------|------------------|
| **Backend** | Node.js/TypeScript | - |
| **Database** | PostgreSQL | + Row-Level Security (optional) |
| **Workflow Engine** | Persisted State Machine in Postgres | Camunda/Temporal (if needed) |
| **RBAC Enforcement** | Application layer (Role + State + Action + Context) | + Postgres RLS |
| **Document Management** | Immutable artifacts + Versioning + SHA-256 hash | - |
| **SLA Calculation** | Working days + holidays (calendar table) | - |
| **Authentication** | Local auth | SSO (Entra OIDC) as auth-provider plugin |

**Rationale:**
- **TypeScript + PostgreSQL** - Team familiarity, rapid development for MVP
- **Custom State Machine** - Full control, no external dependency complexity for Phase 1
- **Application-layer RBAC** - Flexible authorization matching academic workflow requirements
- **Immutable Artifacts** - Tamper-evident audit trail for compliance
- **SHA-256 Hashing** - Content-addressable storage for reconciliation/restore
- **Holiday Calendar** - Accurate SLA calculation for academic/business schedules
- **Plugin-based Auth** - Future SSO integration without core architecture changes

---

## Integration Patterns Analysis

### API Design Patterns

**RESTful APIs - Recommended for Phase 1:**

- **Resource-Based URLs** - `/api/proposals`, `/api/workflows/{id}/transitions`
- **HTTP Methods** - GET (read), POST (create), PUT/PATCH (update), DELETE (delete)
- **Status Codes** - 200 (success), 201 (created), 400 (bad request), 403 (forbidden), 404 (not found)
- **Versioning** - `/api/v1/` for future compatibility
- [Source: RisingStack Guide](https://blog.risingstack.com/10-best-practices-for-writing-node-js-rest-apis/)

**GraphQL (Optional for Dashboard):**
- Efficient for complex queries with nested data
- Single endpoint for multiple data needs
- Strong typing with TypeScript integration
- [Source: GraphQL Best Practices](https://graphql.org/learn/best-practices/)

**Node.js API Framework Options:**

| Framework | Type | Best For |
|-----------|------|----------|
| **Express.js** | Minimal | Simple APIs, maximum flexibility |
| **Fastify** | Performance-focused | High-throughput, schema validation |
| **NestJS** | Opinionated | Enterprise, dependency injection, decorators |

### Communication Protocols

**HTTP/HTTPS - Primary Protocol:**
- RESTful communication over HTTPS/TLS 1.3
- JSON request/response body format
- Content-Type: `application/json`
- [Industry standard for web APIs]

**WebSocket (Optional - Real-time Updates):**
- Real-time workflow state updates
- Notification delivery to users
- Libraries: Socket.IO, ws

**gRPC (Future - Microservice Communication):**
- High-performance inter-service communication
- Protocol Buffers for efficient serialization
- Consider for Phase 2 if microservices needed

### Data Formats and Standards

**JSON - Primary Data Format:**
- Standard for API requests/responses
- Native TypeScript/JavaScript support
- PostgreSQL JSONB for flexible schema storage

**Protocol Buffers (Optional):**
- For high-performance scenarios
- gRPC integration
- Consider Phase 2

**CSV/Excel (Bulk Import/Export):**
- Academic data import/export
- Holiday calendar management
- Report generation

### Database Integration Patterns

**ORM Options for TypeScript + PostgreSQL:**

| ORM | Strengths | Considerations |
|-----|-----------|----------------|
| **Prisma** | Type-safe, schema generation, migrations | Recommended for Phase 1 |
| **Drizzle ORM** | SQL-like, lightweight, fast | Good alternative |
| **TypeORM** | Decorator-based, Active Record pattern | Mature, but slower |
| **Kysely** | Query builder, type-safe | SQL-focused |

**Prisma ORM - Recommended Choice:**
- Zero-cost type safety with generated types [Source: Prisma Docs](https://www.prisma.io/docs/getting-started/prisma-orm/quickstart/postgresql)
- Schema-as-code with migration management
- Excellent PostgreSQL integration
- [Source: Modern Backend Series](https://www.prisma.io/blog/series/modern-backend-bdes2ps5kibb)

**Database Connection Patterns:**
- Connection pooling with pg_POOL
- Transaction management for state transitions
- Prepared statements for performance

### System Interoperability Approaches

**API Gateway Pattern (Phase 2):**
- Centralized authentication/authorization
- Rate limiting and request routing
- Consider: Express.js middleware or dedicated gateway

**Direct Integration (Phase 1):**
- Client → API Server → PostgreSQL
- Simple architecture for MVP
- Single monolithic API server

**Future Integration Points:**
- Academic systems (student info, faculty data)
- Document storage (S3-compatible)
- Notification services (email, SMS)

### Microservices Integration Patterns (Future Reference)

**API Gateway Pattern:**
- Single entry point for external clients
- Request routing to backend services
- Cross-cutting concerns (auth, logging)

**Service Discovery:**
- Consul or etcd for dynamic service registration
- Consider for Phase 2 microservices

**Circuit Breaker Pattern:**
- Fault tolerance for external service calls
- Libraries: opossum, circuit-breaker-js

**Saga Pattern:**
- Distributed transaction management across services
- Orchestration vs Choreography approaches

### Event-Driven Integration

**Event Sourcing Pattern (Consider for Audit Trail):**

```
State changes stored as immutable events:
- ProposalSubmitted
- FacultyApproved
- CouncilRejected
- RevisionRequested

Current state = derive from event stream
```

**Benefits for Academic Research System:**
- Complete audit trail naturally
- Temporal queries (state at any point in time)
- Replay and debugging capabilities
- [Source: EventSourcing.NodeJS](https://github.com/oskardudycz/EventSourcing.NodeJS)

**Implementation Options:**
- EventStoreDB for dedicated event store
- PostgreSQL with event table
- Emmett framework for TypeScript
- [Source: TypeScript Event Sourcing](https://event-driven.io/en/type_script_node_Js_event_sourcing/)

**Message Broker (Phase 2):**
- RabbitMQ for reliable messaging
- Redis Pub/Sub for simple notifications
- Consider for asynchronous workflows

### Integration Security Patterns

**RBAC Authorization Patterns:**

**Casbin - Authorization Library:**
- Policy-based access control
- RBAC with role inheritance
- Node.js middleware integration
- [Source: Casbin Docs](https://casbin.org/docs/middlewares/)

**Custom Authorization Middleware:**
```typescript
// Role + State + Action + Context check
canExecute(user, resource, action, context) {
  return checkRole(user.role, resource) &&
         checkState(user, resource.state, action) &&
         checkAction(user.permissions, action) &&
         checkContext(user, resource, context);
}
```
- Flexible for academic workflow requirements
- Application-layer enforcement (Phase 1)
- Database constraints for additional safety (Phase 2)

**OAuth 2.0 / OpenID Connect (Phase 2):**
- Microsoft Entra ID integration
- passport-azure-ad for Node.js
- [Source: Azure AD Integration](https://medium.com/htc-research-engineering-blog/azure-active-directory-step-by-step-integration-with-node-js-e363bf093e21)
- MSAL Node for modern authentication
- Plugin-based auth provider architecture

**API Key Management (Service Accounts):**
- UUID-based API keys for system integration
- Hash storage (never plain text)
- Key rotation support

### State Machine Persistence Patterns

**Persisted State Machine in PostgreSQL:**

```
Tables:
- workflows (id, current_state, created_at, updated_at)
- workflow_states (workflow_id, state, entered_at, entered_by)
- workflow_transitions (workflow_id, from_state, to_state, triggered_by, at)
- workflow_actions (workflow_id, action, payload, created_at)
```

**State Transition Validation:**
- Application layer validation before state change
- Database constraints for valid transitions
- Audit trail of all state changes
- [Source: State Machine Patterns](https://dev.to/pragativerma18/state-machines-in-practice-implementing-solutions-for-real-challenges-3l76)

### Document & Audit Integration Patterns

**Content-Addressable Storage:**

```
Document storage with SHA-256:
- artifact_id = sha256(content)
- immutable by design (cannot change hash)
- deduplication automatic
- tamper-evident (hash mismatch = corruption)
```

**Oxford Common File Layout (OCFL) Standard:**
- Content addressing with SHA-256/SHA-512
- Immutable storage patterns
- [Source: OCFL Specification](https://ocfl.io/1.1.0/spec/)

**PostgreSQL Trigger-Based Audit Logging:**

```
audit_logs table:
- id (PK)
- table_name
- record_id
- action (INSERT/UPDATE/DELETE)
- old_data (JSONB)
- new_data (JSONB)
- changed_by
- changed_at
- tx_id (for grouping changes)
```

**Benefits:**
- Automatic audit trail via triggers
- No application code needed for capture
- Immutable append-only log
- [Source: PostgreSQL Audit Trigger](https://wiki.postgresql.org/wiki/Audit_trigger)
- [Source: Supabase Audit Guide](https://supabase.com/blog/postgres-audit)

**Append-Only Log Pattern:**
- Never update or delete audit entries
- Immutable by design
- Compliance-ready for audits

---

*Research Date: 2026-01-02 | Integration Patterns Analysis Complete*

---

## Phase 1 Integration Decisions (Locked)

**User Confirmed Integration Requirements (2026-01-02):**

| # | Integration | Phase 1 Implementation |
|---|-------------|------------------------|
| **1** | **People Directory** | Excel import → Staging table → Upsert → Audit log |
| **2** | **User Registration** | No external registration; Admin/PKHCN provision only |
| **3** | **Audit Trail** | Dual-layer: `workflow_logs` (mandatory reason/comment for rejects/overrides) |
| **4** | **Project Dossier** | ZIP bundle + manifest.json + SHA-256 hash per file |
| **5** | **SLA Calculation** | Working days + holidays; PKHCN Excel import for calendar |
| **6** | **Service Accounts** | Scoped API keys (UUID, hashed, with permissions) |

**Database Schema Implications:**

```
people_directory_staging (for Excel import validation)
- id, full_name, email, department, position, employee_id
- validation_status, error_message
- imported_at, imported_by

workflow_logs (mandatory audit)
- id, workflow_id, from_state, to_state
- action, decision_by, decision_at
- reason (mandatory for rejects/overrides)
- comment (optional context)
- override_flag (for PKHCN override actions)

api_keys (service accounts)
- id, key_hash (UUID), name, scope
- permissions (JSON array), created_by
- expires_at, is_active, last_used_at

holidays (SLA calculation)
- date, name, is_working_day
- imported_at, imported_by
```

**Security Implications:**
- User provisioning = privileged operation (admin-only)
- API key scoping = principle of least privilege
- Mandatory audit reasons = accountability for decisions

---

## Architectural Patterns and Design

### System Architecture Patterns

**Phase 1 Recommendation: Modular Monolith with Layered Architecture**

For an Academic Research Management System in Phase 1, a **Modular Monolith** is the optimal choice:

| Pattern | Pros | Cons | When to Use |
|---------|------|------|-------------|
| **Modular Monolith** | Simple deployment, clear boundaries, easy debugging | Scaling requires whole-app replication (less granular than microservices) | ✅ Phase 1 MVP |
| **Microservices** | Independent scaling, technology diversity | Complex deployment, distributed system challenges | Phase 2+ |
| **Serverless** | Zero infrastructure management | Cold starts, vendor lock-in | Future consideration |

**Why Modular Monolith for Phase 1:**
- Faster development and deployment
- Single database with transactional consistency
- Simpler testing and debugging
- Can extract modules to microservices later
- [Source: Architecture Patterns 2025](https://medium.com/@the_atomic_architect/architecture-patterns-that-actually-scale-in-2025-the-only-three-you-need-89d1488c60a7)

**Module Boundaries for NCKH System:**
```
/src
  /modules
    /auth             # Authentication, user management
    /workflow         # State machine, transitions
    /proposal         # Proposal CRUD, validation
    /rbac             # Authorization, permissions
    /audit            # Audit logging, reports
    /document         # File storage, versioning
    /notification     # Email, in-app notifications
    /sla              # Holiday calendar, deadline calculation
    /people           # People directory, Excel import
```

**SLA Module Deliverables (Required for Phase 1):**

1. **holidays table + import job + audit log**
   ```sql
   holidays (
     date DATE PRIMARY KEY,
     name TEXT,
     is_working_day BOOLEAN DEFAULT FALSE,
     imported_at TIMESTAMPTZ,
     imported_by UUID
   )
   ```

2. **SLA Calculator API**
   ```
   GET /sla/due-date?start={date}&days={working_days}
   Response: { due_date: "2026-02-15", calculation: {...} }
   ```

3. **Scheduled Job (Daily Check)**
   - T-2: Alert upcoming deadline (2 working days before)
   - T0: Alert deadline today
   - T+2: Alert overdue (2 working days after)
   - Creates notification entries for each project with approaching/missed SLA

### Design Principles and Best Practices

**Layered Architecture (Controller-Service-Repository Pattern):**

```
┌─────────────────────────────────────┐
│         Routes / Controllers        │  ← HTTP handling, validation
├─────────────────────────────────────┤
│              Services               │  ← Business logic, orchestration
├─────────────────────────────────────┤
│           Repositories              │  ← Data access, SQL generation
├─────────────────────────────────────┤
│            Database                 │  ← PostgreSQL with Prisma
└─────────────────────────────────────┘
```

**Benefits:**
- Clear separation of concerns
- Testable layers in isolation
- Easy to reason about data flow
- [Source: Node.js Layered Architecture](https://github.com/Faeshal/nodejs-layered-architecture)

**Service-Repository-Controller (SRC) Pattern:**
- Modern evolution of MVC for Node.js APIs
- Controllers handle HTTP, validate input
- Services contain business logic, orchestrate repositories
- Repositories abstract database access
- [Source: SRC Pattern Guide](https://medium.com/@mohammedbasit362/breaking-free-from-mvc-hell-why-your-node-js-code-needs-the-service-repository-controller-pattern-c080725ab910)

**SOLID Principles Application:**
- **Single Responsibility**: Each service/repository has one reason to change
- **Open/Closed**: Plugin-based auth providers
- **Liskov Substitution**: Interchangeable RBAC engines
- **Interface Segregation**: Specific repository interfaces
- **Dependency Inversion**: Depend on abstractions (interfaces) not concretions

### Scalability and Performance Patterns

**Phase 1 Scalability Strategy:**

| Component | Scaling Approach | Pattern |
|-----------|------------------|---------|
| **API Server** | Vertical scale → Replicate instances behind load balancer | Docker replicas (container) / PM2 cluster (VM) |
| **PostgreSQL** | Connection pooling → Read replicas | pgbouncer |
| **File Storage** | Local filesystem → S3-compatible | Object storage |
| **Cache** | In-memory (Redis) | Cache-aside pattern |

**Connection Pooling:**
- Reuse database connections instead of opening/closing per request
- Use Prisma's built-in connection pool
- Configure pool size based on concurrency needs
- [Source: Database Scaling Techniques](https://blog.algomaster.io/p/top-15-database-scaling-techniques)

**Caching Strategy (Phase 2):**
- User permissions cache (TTL: 5 minutes)
- Workflow state cache (TTL: until state change)
- Holiday calendar cache (TTL: 24 hours)
- Static assets cache (CDN)

**Scaling Path:**
```
Phase 1: Single instance + connection pooling
    ↓
Phase 2: Multiple replicas (container) OR PM2 cluster (VM)
    ↓
Phase 3: Load balancer + replicas
    ↓
Phase 4: Database read replicas (CQRS-lite)
```

### Integration and Communication Patterns

**Synchronous Communication (Phase 1):**
- REST API calls between modules
- Direct function calls within monolith
- Transactional consistency guaranteed

**Asynchronous Communication (Phase 2):**
- Event-driven architecture for notifications
- Message queue for background jobs
- Consider: RabbitMQ, Redis Pub/Sub, or BullMQ

**Module Communication Pattern:**
```typescript
// Service-to-service communication via interfaces
interface IWorkflowService {
  transition(workflowId: string, action: string, context: TransitionContext): Promise<WorkflowState>;
}

class ProposalService {
  constructor(private workflowService: IWorkflowService) {}

  async submitProposal(proposalId: string) {
    // Delegate to workflow service
    await this.workflowService.transition(proposalId, 'SUBMIT', { userId: this.user.id });
  }
}
```

### Security Architecture Patterns

**Defense in Depth Strategy:**

```
Layer 1: API Gateway / Rate Limiting (Phase 2)
         ↓
Layer 2: Authentication (JWT, Session)
         ↓
Layer 3: Authorization (RBAC: Role + State + Action + Context)
         ↓
Layer 4: Input Validation (Zod schemas)
         ↓
Layer 5: Database Security (Prepared statements, RLS Phase 2)
         ↓
Layer 6: Audit Logging (Append-only, tamper-evident)
```

**RBAC Architecture:**
```typescript
// Authorization check at application layer
interface AuthorizationContext {
  role: string;
  resource: string;
  action: string;
  state: string;
  context: Record<string, any>;
}

interface AuthorizationPolicy {
  canExecute(ctx: AuthorizationContext): boolean;
}

// Policy engine with pluggable rules
class RBACEngine {
  private policies: AuthorizationPolicy[] = [];

  register(policy: AuthorizationPolicy) {
    this.policies.push(policy);
  }

  canExecute(ctx: AuthorizationContext): boolean {
    return this.policies.every(p => p.canExecute(ctx));
  }
}
```

**Audit Logging Architecture:**
```
Application Layer → Dual-layer audit:
├── workflow_logs (structured, queryable)
│   └── Mandatory reason for rejects/overrides
└── audit_logs (comprehensive, append-only)
    └── PostgreSQL trigger-based capture
```

**Security Best Practices:**
- Never log sensitive data (passwords, tokens)
- Hash API keys with bcrypt/argon2
- Use prepared statements (SQL injection prevention)
- Validate all input with schemas
- [Source: Enterprise API Security](https://www.informatica.com/resources/articles/enterprise-api-security-architecture.html)

### Data Architecture Patterns

**Database Schema Design Patterns:**

**Workflow State Pattern (Simplified for Phase 1):**

```
-- Core project/proposal table with workflow snapshot
projects (
  id UUID PRIMARY KEY,
  proposal_name TEXT NOT NULL,
  current_state TEXT NOT NULL,           -- DRAFT, SUBMITTED, UNDER_REVIEW, etc.
  holder_type TEXT NOT NULL,              -- FACULTY, COUNCIL, EXPERT, BGH, etc.
  holder_id UUID,                         -- Current responsible person/unit
  sla_due_at TIMESTAMPTZ,                 -- Calculated deadline
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
)

-- Source of truth for all workflow history
workflow_logs (
  id BIGSERIAL PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id),
  from_state TEXT,
  to_state TEXT NOT NULL,
  action TEXT NOT NULL,                   -- SUBMIT, APPROVE, REJECT, OVERRIDE, etc.
  decision_by UUID NOT NULL,
  decision_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reason TEXT,                            -- MANDATORY for REJECT/REQUEST_REVISION/OVERRIDE/CANCEL
  comment TEXT,                           -- Optional context
  override_flag BOOLEAN DEFAULT FALSE,    -- True for PKHCN override actions
  INDEX (project_id, decision_at)
)
```

**Key Design Decisions:**
- `projects` table holds current state snapshot (fast queries)
- `workflow_logs` is PRIMARY source of truth for history/reconciliation
- No separate `workflow_states`, `workflow_transitions`, `workflow_actions` tables in Phase 1
- All workflow transitions logged to `workflow_logs` with mandatory reason for critical actions

**Reference:**
- State machine database design patterns
- [Source: PostgreSQL State Machines](https://blog.lawrencejones.dev/state-machines/)

**Append-Only Audit Pattern:**
```
-- Immutable audit log
CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL, -- INSERT/UPDATE/DELETE
  old_data JSONB,
  new_data JSONB,
  changed_by UUID NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tx_id TEXT NOT NULL  -- For transaction grouping
);
```

**Content-Addressable Storage Pattern:**
```
-- Documents stored by hash
CREATE TABLE artifacts (
  artifact_id TEXT PRIMARY KEY,  -- SHA-256 hash
  filename TEXT NOT NULL,
  content_type TEXT,
  size_bytes BIGINT,
  storage_path TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL,
  uploaded_by UUID NOT NULL
);

-- Junction table for dossier manifest (better than TEXT[])
CREATE TABLE dossier_manifest_items (
  dossier_id UUID NOT NULL,
  artifact_id TEXT NOT NULL REFERENCES artifacts(artifact_id),
  order_index INT NOT NULL,
  label TEXT,
  PRIMARY KEY (dossier_id, artifact_id)
);

-- Manifest metadata
CREATE TABLE dossier_manifests (
  dossier_id UUID PRIMARY KEY,
  project_id UUID NOT NULL,
  version INT NOT NULL,
  manifest_hash TEXT NOT NULL,  -- SHA-256 of deterministically-generated manifest JSON
  created_at TIMESTAMPTZ NOT NULL
);
```

**Key Design Decisions:**
- Junction table `dossier_manifest_items` enables proper joins and FK integrity
- `artifact_id` FK ensures referential integrity
- `manifest_hash` calculated from deterministically-ordered manifest JSON

**Staging Table Pattern (Excel Import - matches actual data):**

```
-- People Directory Import (matches actual Excel columns)
people_directory_staging (
  id UUID PRIMARY KEY,
  full_name TEXT NOT NULL,
  dob DATE,                           -- Date of birth (from Excel)
  unit TEXT NOT NULL,                 -- Faculty/Department
  title TEXT,                         -- Job title/position
  degree TEXT,                        -- Academic degree
  major TEXT,                         -- Field of study
  notes TEXT,
  normalized_unit TEXT,               -- For matching/standardization
  validation_status TEXT,             -- 'pending', 'valid', 'error'
  error_messages JSONB,
  imported_at TIMESTAMPTZ NOT NULL,
  imported_by UUID NOT NULL
);

-- Upsert key: full_name + dob + unit (composite key)
-- Email/user account created manually or from separate import
```

### Deployment and Operations Architecture

**Docker Containerization (Phase 1):**

```dockerfile
# Multi-stage build for optimized image
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

**Docker Compose for Development:**
```yaml
services:
  api:
    build: .
    ports: ["3000:3000"]
    environment:
      - DATABASE_URL=postgresql://...
      - NODE_ENV=development
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:16-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=nckh_system

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
```

**Deployment Architecture:**

**Container Mode (Docker/Compose/K8s):**
```
┌─────────────────────────────────────┐
│           Nginx / Reverse Proxy     │  ← SSL termination, static files
├─────────────────────────────────────┤
│         Node.js Replicas            │  ← Scale via replicas (compose/k8s)
├─────────────────────────────────────┤
│         PostgreSQL + pgbouncer       │  ← Connection pooling
├─────────────────────────────────────┤
│              Redis (optional)       │  ← Caching, sessions
└─────────────────────────────────────┘
```

**VM Mode (on-prem without orchestrator):**
```
┌─────────────────────────────────────┐
│           Nginx / Reverse Proxy     │  ← SSL termination, static files
├─────────────────────────────────────┤
│         PM2 Cluster (Node.js)       │  ← Multi-process API server
├─────────────────────────────────────┤
│         PostgreSQL + pgbouncer       │  ← Connection pooling
├─────────────────────────────────────┤
│              Redis (optional)       │  ← Caching, sessions
└─────────────────────────────────────┘
```

**Note:** Choose ONE deployment mode. Don't mix PM2 + Docker.

**Deployment Checklist:**
- [ ] Docker multi-stage builds
- [ ] Environment-based configuration
- [ ] Database migrations (Prisma migrate)
- [ ] Health check endpoints
- [ ] Structured logging (JSON)
- [ ] Graceful shutdown handling
- [Source: Dockerizing Node.js](https://betterstack.com/community/guides/scaling-nodejs/dockerize-nodejs/)

### Architecture Decision Records (ADRs)

**ADR-001: Modular Monolith for Phase 1**
- **Status**: Accepted
- **Context**: Need to deliver MVP quickly with team familiar with Node.js/PostgreSQL
- **Decision**: Use modular monolith with clear module boundaries
- **Consequences**: Simpler deployment, can extract modules later

**ADR-002: Application-Layer RBAC**
- **Status**: Accepted
- **Context**: Academic workflows require Role + State + Action + Context checks
- **Decision**: Implement custom RBAC at application layer in Phase 1
- **Consequences**: Flexible authorization, Phase 2 can add Postgres RLS

**ADR-003: Dual-Layer Audit**
- **Status**: Accepted
- **Context**: Compliance requires comprehensive audit trail
- **Decision**: workflow_logs (structured) + audit_logs (trigger-based)
- **Consequences**: Queryable decisions + comprehensive change tracking

**Rules (Updated based on review):**
- **Rule A**: `workflow_logs.reason` MANDATORY for actions: REJECT | REQUEST_REVISION | OVERRIDE | CANCEL
- **Rule B**: DB trigger (`audit_logs`) ONLY for sensitive tables: roles, permissions, form_templates, sla_rules, users
- **workflow_logs is PRIMARY source of truth** - DB trigger is supplementary only

**ADR-004: Content-Addressable Document Storage**
- **Status**: Accepted
- **Context**: Need tamper-evident storage for compliance
- **Decision**: SHA-256 hash as artifact_id, immutable storage
- **Consequences**: Deduplication, reconciliation capability

**ADR-005: Excel Staging for Imports**
- **Status**: Accepted
- **Context**: Bulk data import with validation requirements
- **Decision**: Staging table → validation → upsert pattern
- **Consequences**: Data quality enforcement, audit trail of imports

**Schema matches actual Excel data (updated):**
- Upsert key: `full_name + dob + unit` (matches real data)
- Email/user account created manually or from separate import

---

*Research Date: 2026-01-02 | Architectural Patterns Analysis Complete*

---

## Architecture Review Updates (Post-Review Patches)

**Reviewed by:** Coc
**Date:** 2026-01-02

**Applied Patches:**

| # | Issue | Resolution |
|---|-------|------------|
| **1** | Monolith "limited scalability" misleading | Changed to "Scaling requires whole-app replication (less granular than microservices)" |
| **2** | PM2 + Docker conflict | Clarified: Choose ONE - Docker replicas (container) OR PM2 cluster (VM) |
| **3** | Too many workflow tables | Simplified to `projects` + `workflow_logs` only. `workflow_logs` is PRIMARY source of truth |
| **4** | Dual-layer audit unclear boundaries | Added Rule A (mandatory reason) + Rule B (trigger only on sensitive tables) |
| **5** | TEXT[] for artifacts weak design | Changed to junction table `dossier_manifest_items` with FK |
| **6** | People schema doesn't match Excel | Updated to `full_name + dob + unit` (matches actual data) |
| **7** | SLA module unclear | Added 3 required deliverables: holidays table, calculator API, scheduled job |

**Final Schema for Phase 1:**

```
Core Tables:
├── projects (current_state, holder_type, holder_id, sla_due_at)
├── workflow_logs (PRIMARY source of truth, mandatory reason)
├── artifacts (SHA-256 hash as PK)
├── dossier_manifest_items (junction table with FK)
├── dossier_manifests (metadata + hash)
├── people_directory_staging (matches Excel: full_name + dob + unit)
├── holidays (date, name, is_working_day)
├── users (admin-provisioned only)
├── api_keys (scoped, hashed)
└── audit_logs (trigger-based, sensitive tables only)

Sensitive Tables for DB Trigger (audit_logs):
├── roles
├── permissions
├── form_templates
├── sla_rules
└── users
```

---

## Implementation Approaches and Technology Adoption

### Technology Adoption Strategies

**Phase 1 Adoption Strategy: Iterative Implementation**

```
Iteration 1: Core Workflow (Weeks 1-4)
├── Authentication + User management
├── Basic RBAC (Role + State + Action)
├── Workflow state machine (projects + workflow_logs)
└── Simple proposal CRUD

Iteration 2: Document & Audit (Weeks 5-8)
├── Document upload with SHA-256 hashing
├── Dossier manifest with junction table
├── Dual-layer audit (workflow_logs + trigger)
└── Excel import for people directory

Iteration 3: SLA & Notifications (Weeks 9-12)
├── Holiday calendar import
├── SLA calculator API
├── Daily scheduled job (T-2, T0, T+2 alerts)
└── Email/in-app notifications
```

**Adoption Best Practices:**
- Start with minimal viable features per iteration
- Each iteration adds value incrementally
- User feedback after each iteration
- [Source: Incremental Adoption Patterns](https://www.prisma.io/dataguide/types/relational/migration-strategies)

### Development Workflows and Tooling

**Phase 1 Development Toolchain:**

| Tool | Purpose | Alternative |
|------|---------|-------------|
| **TypeScript** | Type safety | - |
| **ESLint** | Code quality | - |
| **Prettier** | Code formatting | - |
| **Husky** | Git hooks | - |
| **lint-staged** | Pre-commit lint | - |
| **Jest** | Testing framework | Vitest |
| **Prisma** | Database ORM | Drizzle |
| **dotenv + Zod** | Config validation | - |

**Code Quality Setup:**
```json
// package.json scripts
{
  "lint": "eslint . --ext .ts",
  "format": "prettier --write .",
  "typecheck": "tsc --noEmit",
  "test": "jest",
  "test:watch": "jest --watch",
  "test:coverage": "jest --coverage"
}
```

**Git Hooks (Husky + lint-staged):**
```json
// package.json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md}": ["prettier --write"]
  }
}
```

- [Source: Lint-staged Best Practices](https://blog.csdn.net/gitblog_00576/article/details/153156399)
- [Source: Node.js 2025 ESLint Setup](https://medium.com/@gabrieldrouin/node-js-2025-guide-how-to-setup-express-js-with-typescript-eslint-and-prettier-b342cd21c30d)

### Testing and Quality Assurance

**Testing Strategy for Phase 1:**

```
Testing Pyramid:
┌─────────────────────────────────┐
│   E2E Tests (10%) - Playwright   │  ← Critical user journeys
├─────────────────────────────────┤
│  Integration Tests (30%) - Jest   │  ← API + Database
├─────────────────────────────────┤
│   Unit Tests (60%) - Jest        │  ← Business logic
└─────────────────────────────────┘
```

**Jest Configuration:**
```typescript
// jest.config.js
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts']
};
```

**Test Categories:**

| Type | Focus | Example |
|------|-------|---------|
| **Unit** | Business logic in isolation | RBAC canExecute(), SLA calculator |
| **Integration** | API + Database interaction | POST /api/proposals with DB |
| **E2E** | Full user flows | Submit proposal → Faculty review → Approval |

**Testing Best Practices:**
- Use TestContainers for real PostgreSQL in tests
- Mock external services (email, file storage)
- Test coverage minimum 70% for business logic
- [Source: Node.js Testing Best Practices](https://github.com/goldbergyoni/nodejs-testing-best-practices)
- [Source: Jest TypeScript Guide](https://jestjs.io/docs/getting-started)

### Deployment and Operations Practices

**CI/CD Pipeline (GitHub Actions):**

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm test
      - run: npm run build
```

[Source: GitHub Actions Node.js CI](https://docs.github.com/actions/guides/building-and-testing-nodejs)

**Database Migration Strategy:**

| Approach | Description | When to Use |
|----------|-------------|-------------|
| **Prisma Migrate** | Schema-as-code, auto-generated SQL | Phase 1 |
| **Expand & Contract** | Zero-downtime migrations | Phase 2+ |
| **Manual SQL** | Complex data migrations | As needed |

**Migration Best Practices:**
- Version every schema change in Git
- Review schema changes through pull requests
- Never modify applied migrations
- Use `prisma migrate deploy` in production
- [Source: Prisma Migration Strategies](https://www.prisma.io/dataguide/types/relational/migration-strategies)

**Environment Configuration:**

```typescript
// config/env.ts - Type-safe environment variables
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  PORT: z.coerce.number().default(3000),
});

export const env = envSchema.parse(process.env);
```

- Use Zod for runtime validation
- Never commit `.env` to version control
- Load config once at application startup
- [Source: Type-safe Environment with Zod](https://sdorra.dev/posts/2023-08-22-type-safe-environment)

### Logging and Monitoring

**Structured Logging with Pino:**

```typescript
// src/lib/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
  serializers: {
    err: pino.stdSerializers.err,
  },
  // Redact sensitive fields
  redact: ['req.headers.authorization', 'req.headers.cookie'],
});
```

**Logging Best Practices:**
- Use structured logging (JSON format)
- Include correlation IDs for request tracing
- Redact sensitive data (passwords, tokens)
- Centralize logs for aggregation
- [Source: Pino Logging Guide](https://betterstack.com/community/guides/logging/how-to-install-setup-and-use-pino-to-log-node-js-applications/)

**Error Handling Strategy:**
```typescript
// Global error handler
app.use((err: Error, req, res, next) => {
  logger.error({ err, req }, 'Unhandled error');
  res.status(500).json({ error: 'Internal server error' });
});
```

### Database Backup and Recovery

**PostgreSQL Backup Strategy:**

| Backup Type | Frequency | Retention | Purpose |
|-------------|-----------|-----------|---------|
| **Full Base Backup** | Daily | 30 days | Point-in-time recovery |
| **WAL Archives** | Continuous | 90 days | Incremental recovery |
| **Logical Backup** | Weekly | 90 days | Data export/migration |

**Backup Commands:**
```bash
# Base backup (daily)
pg_dump -Fc -h localhost -U postgres nckh_system > backup_$(date +%Y%m%d).dump

# WAL archiving (continuous)
archive_command = 'cp %p /wal_archive/%f'
```

**Recovery Strategy:**
1. Stop PostgreSQL immediately on corruption detection
2. Restore from last known good backup
3. Replay WAL archives to desired point in time
4. Verify data integrity before bringing online
- [Source: PostgreSQL Disaster Recovery](https://www.mydbops.com/blog/master-postgresql-disaster-recovery-backup-restore)

### Team Organization and Skills

**Phase 1 Team Structure:**

| Role | Skills | Count |
|------|--------|-------|
| **Full-stack Developer** | Node.js, TypeScript, PostgreSQL | 1-2 |
| **DevOps Engineer** | Docker, CI/CD, Linux | 0.5 (part-time) |
| **Product Owner** | Academic domain knowledge | 1 |

**Required Skills for Node.js/TypeScript Development:**
- TypeScript (type system, generics)
- Node.js ecosystem (Express/Fastify, npm)
- PostgreSQL (SQL, indexes, transactions)
- Docker (containerization basics)
- Git (branching, PR workflow)

### Cost Optimization and Resource Management

**Phase 1 Resource Requirements:**

| Resource | Min | Recommended | Notes |
|----------|-----|-------------|-------|
| **API Server** | 2 vCPU, 4GB RAM | 4 vCPU, 8GB RAM | Container/VM |
| **PostgreSQL** | 2 vCPU, 4GB RAM | 4 vCPU, 8GB RAM | Separate instance |
| **Storage** | 50GB SSD | 100GB SSD | Include backup space |

**Cost Optimization Tips:**
- Use connection pooling (pgbouncer) to reduce DB connections
- Enable query logging only in development
- Archive old audit logs to cold storage
- Use database indexes strategically

### Risk Assessment and Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **Data loss** | Critical | Low | Daily backups + WAL archiving |
| **Security breach** | High | Medium | RBAC + audit logs + input validation |
| **Performance degradation** | Medium | Medium | Connection pooling + indexes + caching |
| **Workflow state inconsistency** | High | Low | Database transactions + audit trail |
| **Integration delays** | Medium | High | Modular architecture + clear interfaces |

---

## Technical Research Recommendations

### Implementation Roadmap

**Phase 1 - 12 Week Plan:**

| Weeks | Deliverable | Success Criteria |
|-------|-------------|------------------|
| 1-4 | Core workflow + RBAC | Users can submit proposals |
| 5-8 | Documents + Audit | File upload + full audit trail |
| 9-12 | SLA + Notifications | Deadline tracking working |

**Go-Live Checklist:**
- [ ] All user roles can perform permitted actions
- [ ] Workflow transitions are auditable
- [ ] Documents stored with SHA-256 integrity
- [ ] SLA calculations accurate with holidays
- [ ] Backup/restore tested and documented
- [ ] Security review completed

### Technology Stack Summary (Final)

| Layer | Technology |
|-------|------------|
| **Backend** | Node.js 20 LTS, TypeScript 5 |
| **API Framework** | Express.js / Fastify |
| **Database** | PostgreSQL 16 |
| **ORM** | Prisma 5 |
| **Auth** | JWT (Phase 1) → Entra OIDC (Phase 2) |
| **Testing** | Jest + TestContainers |
| **CI/CD** | GitHub Actions |
| **Logging** | Pino (structured JSON) |
| **Container** | Docker 25 + Docker Compose |

### Success Metrics and KPIs

**Technical KPIs:**
- API response time < 500ms (p95)
- Test coverage > 70%
- Zero data loss incidents
- 99.5% uptime (excluding maintenance windows)

**Quality KPIs:**
- Zero critical security vulnerabilities
- All workflow transitions auditable
- Document integrity verifiable (SHA-256)

**Delivery KPIs:**
- All 3 iterations completed in 12 weeks
- User acceptance criteria met for each iteration

---

*Technical Research Completed: 2026-01-02*

---

## Critical Business Requirements (Final Clarifications)

**Reviewed by:** Coc
**Date:** 2026-01-02

### 1. Internal Deployment Only

**Requirement:** Phase 1 is INTERNAL ONLY - no public access.

- Only users from the university/related units can access the system
- Network-level restrictions (VPN/firewall) may apply
- No anonymous or public-facing features

**Implication:**
- Authentication required for ALL access
- No "forgot password" public endpoint (internal email only)
- User discovery restricted to internal directory

---

### 2. Authentication Strategy: Local First, SSO Later

**Phase 1: Local Auth (Password-based)**
- Username/email + password
- Password hashing (bcrypt/argon2)
- Session-based or JWT tokens

**Phase 2: SSO (Microsoft Entra ID/OIDC or SAML)**
- **IMPORTANT:** SSO does NOT auto-create users
- SSO only works if email/ID already exists in system
- Users must be admin-provisioned BEFORE SSO login
- Plugin-based auth provider architecture

**Implementation:**
```typescript
// SSO check: user must exist first
async function ssoLogin(ssoEmail: string) {
  const user = await findUserByEmail(ssoEmail);
  if (!user) {
    throw new Error('SSO login not allowed: user not provisioned');
  }
  return createSession(user);
}
```

---

### 3. SLA Configuration Per Workflow Step

**Requirement:** SLA follows university regulations document.

**Each workflow step has its own SLA:**

| Step | SLA (working days) | Start Time |
|------|-------------------|------------|
| Khoa review | 3 days | When submitted to Khoa |
| Chỉnh sửa theo góp ý | 5 days | When revision requested |
| Hội đồng | 7 days | When escalated to Council |
| BGH approval | 5 days | When submitted to BGH |

**Implementation:**
```sql
-- SLA rules table
sla_rules (
  id UUID PRIMARY KEY,
  workflow_state TEXT NOT NULL,     -- e.g., 'FACULTY_REVIEW'
  holder_type TEXT NOT NULL,        -- e.g., 'FACULTY'
  working_days INT NOT NULL,        -- e.g., 3
  created_at TIMESTAMPTZ NOT NULL
);

-- SLA calculation starts from submitted_at or assigned_at
-- Escalation: T-2 alert, T0 due date, T+2 overdue
```

---

### 4. Reconciliation & Recovery Definition

**Đối chiếu (Reconciliation):**
```
Purpose: Verify dossier integrity

Checks:
- All required documents present
- Correct version per document
- File integrity via SHA-256 hash
- Detect missing or tampered files

Process:
1. Read dossier manifest (list of artifact_ids)
2. For each artifact_id:
   - Verify file exists in storage
   - Recalculate SHA-256 hash
   - Compare with stored artifact_id
3. Report discrepancies
```

**Khôi phục (Recovery):**
```
Purpose: Restore from backup and verify

Process:
1. Restore database from backup
2. Restore file storage from backup
3. RUN RECONCILIATION to verify DB + files sync
4. Create audit log entry for all recovery events

Critical: All recovery events MUST be audited
```

**Audit Requirement:**
```sql
-- Recovery events logged
recovery_logs (
  id BIGSERIAL PRIMARY KEY,
  recovery_type TEXT NOT NULL,     -- 'database', 'storage', 'both'
  backup_point TIMESTAMPTZ NOT NULL,
  initiated_by UUID NOT NULL,
  initiated_at TIMESTAMPTZ NOT NULL,
  reconciliation_result JSONB,       -- Reconciliation output
  status TEXT,                       -- 'SUCCESS', 'PARTIAL', 'FAILED'
  completed_at TIMESTAMPTZ
);
```

---

### 5. SLA Calculation: Working Days Only

**Requirement:** SLA calculated in WORKING DAYS only.

**Rules:**
- Exclude: Saturday, Sunday
- Exclude: Holidays from `holidays` table
- If deadline falls on holiday/weekend, move to next working day

**Implementation:**
```typescript
// SLA Calculator
function calculateDueDate(startDate: Date, workingDays: number): Date {
  let currentDate = new Date(startDate);
  let daysCounted = 0;

  while (daysCounted < workingDays) {
    currentDate.setDate(currentDate.getDate() + 1);

    // Skip weekends
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    // Skip holidays
    const isHoliday = await checkHoliday(currentDate);
    if (isHoliday) continue;

    daysCounted++;
  }

  return currentDate;
}

// Holidays managed by Phòng KHCN via Excel import
async function checkHoliday(date: Date): Promise<boolean> {
  const holiday = await db.holidays.findUnique({
    where: { date: toDateString(date) }
  });
  return !!holiday;
}
```

---

### 🚫 CRITICAL: No Self-Registration

**Phase 1 User Provisioning Rule:**

```
❌ FORBIDDEN: External registration
❌ FORBIDDEN: Sign-up form
❌ FORBIDDEN: Auto-create user from SSO

✅ ALLOWED: Admin creates user
✅ ALLOWED: Phòng KHCN imports from Excel
✅ ALLOWED: User account created manually
```

**All user accounts must be provisioned by Admin or Phòng KHCN only.**

---
