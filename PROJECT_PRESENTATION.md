# Education Management SaaS

## Product Summary

Education Management SaaS is a multi-tenant platform for schools, colleges, and training institutes to manage users, students, batches, fees, attendance, reminders, reports, and operational governance from a centralized system.

The platform supports:

- `SUPER_ADMIN` for platform-wide control
- organization-scoped `ADMIN`
- restricted `STAFF`
- role-based and permission-based access
- secure JWT authentication with refresh tokens
- tenant isolation across organizations

## Business Problem

Educational institutions often operate with fragmented spreadsheets, disconnected communication tools, and weak access control. This creates issues in:

- student lifecycle tracking
- fee collection follow-up
- batch and attendance administration
- reminder and communication workflows
- reporting accuracy
- multi-branch or multi-organization oversight

This platform addresses those issues through a structured SaaS backend and tenant-aware operations console.

## Core Value Proposition

- One platform can onboard multiple schools or colleges.
- Each organization operates in its own isolated tenant scope.
- Super admin gets platform-wide visibility across all organizations.
- Admin and staff only see their own organization data.
- Operational modules are permission-driven and scalable.
- Reporting and chart APIs provide management-ready analytics.

## Technology Stack

- `NestJS`
- `TypeScript`
- `Prisma ORM`
- `PostgreSQL`
- `Swagger / OpenAPI`
- `JWT Access + Refresh Tokens`
- `Role-based and Permission-based Authorization`
- `React / Next.js frontend`

## Architecture Highlights

### Backend Design

- modular NestJS architecture
- repository pattern for data access abstraction
- services depend on interfaces instead of concrete implementations
- controllers remain thin and only handle request/response flow
- DTOs used for all request validation
- Prisma isolated behind repositories
- global exception handling
- structured audit logging
- environment-based configuration

### Security Design

- bcrypt password hashing
- JWT access tokens
- hashed refresh tokens stored in database
- role and permission guards
- super-admin-only governance controls for roles and permissions
- inactive user login blocked
- inactive organization login blocked

### Multi-Tenancy

- `Organization` model is the tenant boundary
- tenant-owned tables include `organizationId`
- super admin can onboard and review all organizations
- admins and staff are automatically scoped to their own organization
- super admin dashboards show organization attribution and aggregated counts

## Major Modules

- `Auth`
- `Organizations`
- `Users`
- `Roles`
- `Permissions`
- `Students`
- `Batches`
- `Fees`
- `Attendance`
- `Reminders`
- `Reports`
- `Activity Logs`
- `Health`

## Key Functional Capabilities

### Platform Governance

- onboard organizations
- activate or deactivate organizations
- manage tenant admins
- assign roles and permissions
- review platform-wide user, student, and operational counts

### Student Operations

- create and update students
- assign students to batches
- import students via CSV
- download sample CSV format
- validate import records and avoid duplicate student creation

### Fee Operations

- manage fee plans
- generate and update fee records
- track paid, partial, pending, overdue, and waived status
- power chart-ready fee analytics

### Attendance Operations

- record attendance per student and batch
- track present, absent, late, and leave status
- expose trend and status analytics

### Reminder Operations

- send manual reminders
- configure templates and automation rules
- email provider integration
- WhatsApp provider integration
- reminder status and channel analytics

### Reporting

- total students
- active students
- fee collection summary
- unpaid fee summary
- attendance summary
- student, fee, attendance, reminder, user, and batch chart endpoints

## Roles and Access Model

### SUPER_ADMIN

- manages all organizations
- manages users across the platform
- can create and update roles
- can review permissions catalogue
- sees organization columns and platform-wide summaries

### ADMIN

- operates within own organization only
- manages students, batches, fees, attendance, reminders, and reports based on permissions

### STAFF

- restricted access based on assigned permissions

## Important Governance Rules

- only `SUPER_ADMIN` can modify roles
- only `SUPER_ADMIN` can review permissions catalogue
- inactive users cannot log in
- users from inactive organizations cannot log in

## Analytics and Dashboard Readiness

The platform includes dedicated analytics APIs for graphical representation across:

- student enrollment trends
- student status distribution
- batch distribution
- fee collection trends
- fee status breakdown
- batch fee collection
- attendance status and daily trends
- reminder channel and status trends
- user role distribution
- active vs inactive users

## Audit and Traceability

The system records audit events for:

- authentication activity
- organization onboarding and updates
- user changes
- role changes
- reminders and operational workflows

This supports accountability and platform oversight.

## Demo Flow for Presentation

### 1. Platform Login

- log in as super admin
- show global access and platform console

### 2. Organization Onboarding

- open organizations page
- create a new school or college
- show tenant summary cards and per-organization counts

### 3. Tenant User Management

- create an admin user under a selected organization
- show role assignment and tenant mapping

### 4. Tenant Operations

- create students and assign batches
- create fee plans and fee records
- mark attendance
- send reminders

### 5. Analytics

- open dashboard and reports
- show charts for fees, attendance, reminders, and student growth

### 6. Governance Controls

- show that role and permission catalogue actions are restricted to super admin
- show blocked login behavior for inactive user or inactive organization

## Suggested Presentation Talking Points

- This is not a single-school app; it is a true multi-tenant SaaS foundation.
- Tenant isolation is enforced in backend repository and service layers.
- Platform governance and operational access are separated cleanly.
- Reporting is chart-ready, not dependent on heavy frontend aggregation.
- The architecture is ready for iterative product expansion.

## Future Roadmap Suggestions

- organization switching for super admin operational impersonation
- branch or campus-level sub-tenancy
- payment gateway integration
- notification retry queues
- background job workers for reminders and reports
- soft delete and archival strategy for more entities
- stronger test coverage for services and authorization policies

## Default Demo Credentials

- Email: `superadmin@edu.local`
- Password: `ChangeMe123!`
