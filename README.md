# Education Management Backend

Production-grade NestJS backend for a multi-tenant Education Management SaaS platform. This service is designed for organizations such as schools, colleges, academies, and training institutes that need tenant-isolated operations, role-driven access control, reminder automation, analytics, and structured administration.

## Overview

This backend powers:

- multi-organization onboarding
- super admin platform governance
- tenant-scoped admin and staff operations
- JWT authentication with refresh tokens
- role-based and permission-based authorization
- student lifecycle management
- batch and enrollment management
- fees and payment tracking
- attendance recording
- reminder templates, logs, provider settings, and automation
- inquiry capture from the public marketing site
- reports and operational summaries
- audit logging

The codebase follows:

- NestJS modular architecture
- repository pattern
- service-abstraction separation
- DTO-driven request validation
- Prisma ORM for PostgreSQL
- Swagger/OpenAPI documentation

## Tech Stack

- NestJS
- TypeScript
- Prisma ORM
- PostgreSQL
- Swagger / OpenAPI
- JWT access tokens
- JWT refresh tokens
- bcrypt password hashing
- class-validator / class-transformer

## Architecture Summary

The backend is structured to keep controllers thin and business logic centralized in services.

Core layers:

- `controller`
  Handles HTTP request and response flow only.
- `service`
  Contains business logic and orchestration.
- `repository`
  Encapsulates Prisma access behind interfaces.
- `dto`
  Defines validated request contracts.
- `interfaces`
  Defines repository and service-facing abstractions.
- `common`
  Holds guards, decorators, filters, interceptors, utils, and shared services.

Main architectural characteristics:

- services depend on repository abstractions, not direct Prisma usage
- authorization is centralized through guards and decorators
- audit events are written through a shared audit logging service
- tenant scoping is enforced in services and repositories
- platform-level and tenant-level access are separated

## Multi-Tenancy Model

The platform supports onboarding many organizations under one SaaS installation.

Tenant behavior:

- `SUPER_ADMIN`
  Can view all organizations, manage onboarding, inspect platform-wide data, and manage platform governance modules.
- `ADMIN`
  Operates only inside its own organization and can manage tenant-owned settings, users, students, fees, attendance, reminders, and reports based on allowed rules.
- `STAFF`
  Operates only inside its own organization with restricted access based on assigned permissions.

Tenant isolation applies to:

- users
- students
- batches
- fee plans
- fee records
- attendance
- reminder logs
- reminder templates and rules
- reports
- activity logs

## Authentication And Authorization

Authentication:

- login with email and password
- passwords stored as bcrypt hashes
- JWT access token + refresh token flow
- refresh tokens persisted in the database as hashed values

Authorization:

- role decorators for platform-governed endpoints
- permission decorators for operational modules
- tenant scoping for non-super-admin users

Important access rules:

- inactive users cannot log in
- users from inactive organizations cannot log in
- only super admin can manage roles and permissions
- organization settings are managed by tenant admins, not by super admin through the tenant settings endpoint
- admins can create `ADMIN` and `STAFF`
- staff can create only `STAFF`

## Domain Modules

Implemented modules:

- `auth`
- `users`
- `roles`
- `permissions`
- `organizations`
- `students`
- `batches`
- `fees`
- `attendance`
- `reminders`
- `reports`
- `activity-logs`
- `inquiries`
- `health`

## Folder Structure

```text
src/
  main.ts
  app.module.ts
  config/
  common/
  prisma/
  modules/
    activity-logs/
    attendance/
    auth/
    batches/
    fees/
    health/
    inquiries/
    organizations/
    permissions/
    reminders/
    reports/
    roles/
    students/
    users/
prisma/
  schema.prisma
  migrations/
  seed.ts
```

## Database Model Summary

Core relational entities:

- `Organization`
- `User`
- `Role`
- `Permission`
- `UserRole`
- `RolePermission`
- `Student`
- `Batch`
- `StudentBatch`
- `FeePlan`
- `FeeRecord`
- `Attendance`
- `ReminderLog`
- `ReminderTemplate`
- `ReminderRule`
- `ReminderSchedule`
- `ReminderProviderSetting`
- `AuditLog`
- `RefreshTokenSession`
- `ContactInquiry`

The Prisma schema includes:

- timestamps on main models
- explicit relations
- unique constraints
- composite unique keys where needed
- indexes for operational lookup patterns

## Reminder System

The reminder module supports both manual and automated communication.

Current capabilities:

- manual reminder log creation
- email sending through SMTP
- WhatsApp sending through CallMeBot
- dynamic reminder templates with placeholders
- organization-level provider settings
- default template and automation rule provisioning for newly onboarded organizations
- reset-to-default template support for existing organizations

Supported placeholder examples:

- `{{studentName}}`
- `{{guardianName}}`
- `{{organizationName}}`
- `{{billingCycle}}`
- `{{dueDate}}`
- `{{totalFee}}`
- `{{paidFee}}`
- `{{pendingFee}}`

## Reports And Analytics

The reports module includes analytics endpoints for:

- total students
- active students
- enrollment trends
- student status breakdown
- user role distribution
- user status summary
- batch status summary
- fee collection summaries and trends
- unpaid fee views
- attendance summaries and trends
- reminder status and channel breakdowns

## Public Inquiry Capture

The backend exposes a public contact inquiry endpoint used by the marketing site. Super admin can review inquiries from the dashboard and update inquiry status operationally.

## Environment Variables

Copy [`.env.example`](/home/usman/Desktop/project/education-management-backend/.env.example) to `.env` and configure:

```env
PORT=3000
DATABASE_URL="postgresql://postgres@localhost:5432/education_management?schema=public"
JWT_SECRET="change-me-access-secret"
JWT_REFRESH_SECRET="change-me-refresh-secret"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
SWAGGER_TITLE="Education Management API"
SWAGGER_DESCRIPTION="Production-grade backend for education management SaaS"
SWAGGER_VERSION="1.0.0"
CORS_ORIGIN="*"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=""
SMTP_PASS=""
SMTP_FROM_EMAIL="no-reply@edu.local"
SMTP_FROM_NAME="EduFlow"
WHATSAPP_CALLMEBOT_API_KEY=""
```

Notes:

- local development assumes PostgreSQL user `postgres` with no password
- production should use strong JWT secrets
- production should use a production SMTP/App Password configuration

## Local Development Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create environment file

```bash
cp .env.example .env
```

### 3. Generate Prisma client

```bash
npm run prisma:generate
```

### 4. Apply migrations

```bash
npx prisma migrate dev
```

### 5. Seed initial system data

```bash
npm run prisma:seed
```

### 6. Run development server

```bash
npm run start:dev
```

## Default Seeded Accounts

Super admin:

- email: `superadmin@edu.local`
- password: `ChangeMe123!`

Default organization admin:

- email: `admin@default-academy.edu.local`
- password: `ChangeMe123!`

## Useful Commands

Install:

```bash
npm install
```

Generate Prisma client:

```bash
npm run prisma:generate
```

Run migrations:

```bash
npx prisma migrate dev
```

Apply existing migrations in production:

```bash
npm run prisma:migrate:deploy
```

Seed:

```bash
npm run prisma:seed
```

Run locally:

```bash
npm run start:dev
```

Build:

```bash
npm run build
```

Run production build:

```bash
npm run start:prod
```

Tests:

```bash
npm run test
npm run test:e2e
```

## Swagger

Swagger UI is available at:

- `http://localhost:3000/docs`

Because API versioning is URI-based, endpoints are served under:

- `http://localhost:3000/v1/...`

## Deployment Notes

Recommended production deployment:

- backend on Railway
- PostgreSQL on Railway
- frontend on Vercel

Recommended Railway flow:

Build command:

```bash
npm install && npm run prisma:generate && npm run build
```

Start command:

```bash
npm run prisma:migrate:deploy && npm run start:prod
```

After first deploy:

```bash
npm run prisma:seed
```

Set `CORS_ORIGIN` to your Vercel frontend domain in production.

## Operational Notes

- log files are runtime-only and should not be committed
- reminder provider settings are auto-created when needed for a tenant
- existing organizations can refresh reminder templates using the reset-defaults action
- reminder automation depends on organization provider settings and active rules
- some test/spec files may still need a cleanup pass if you want a completely silent typecheck across all tests

## Presentation And Demo Files

Additional presentation support files included in this repo:

- [`PROJECT_PRESENTATION.md`](/home/usman/Desktop/project/education-management-backend/PROJECT_PRESENTATION.md)
- [`PPT_OUTLINE.md`](/home/usman/Desktop/project/education-management-backend/PPT_OUTLINE.md)

## License

This project is currently marked `UNLICENSED`.
