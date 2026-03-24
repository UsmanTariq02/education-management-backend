# Education Management Backend

Production-grade NestJS backend for an Education Management SaaS product using Prisma ORM, PostgreSQL, Swagger, JWT authentication, and role-permission authorization.

## Stack

- NestJS
- TypeScript
- Prisma ORM
- PostgreSQL
- Swagger / OpenAPI
- JWT access + refresh tokens
- Role-based and permission-based authorization

## Setup

1. Install dependencies:
   `npm install`
2. Copy environment file:
   `cp .env.example .env`
3. Generate Prisma client:
   `npm run prisma:generate`
4. Run development migration:
   `npm run prisma:migrate:dev -- --name init`
5. Seed database:
   `npm run prisma:seed`
6. Start development server:
   `npm run start:dev`

## Default Super Admin

- Email: `superadmin@edu.local`
- Password: `ChangeMe123!`

## Notes

- Database name is expected to be `education_management`.
- PostgreSQL connection assumes user `postgres` with no password on localhost.
- Refresh tokens are stored hashed.
- Controllers are thin; domain logic sits in services; Prisma access is encapsulated by repositories.
- Reminder delivery supports:
  - Email via SMTP using `SMTP_*` environment variables
  - WhatsApp via CallMeBot using `WHATSAPP_CALLMEBOT_API_KEY`
- `MANUAL` reminders are recorded immediately. Unsupported or unconfigured channels are recorded with `FAILED` status so operational staff can retry after provider setup.
