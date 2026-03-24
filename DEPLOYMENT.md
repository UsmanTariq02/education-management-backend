# Backend Deployment Guide

This backend is intended to be deployed to Railway with PostgreSQL.

## Target Platform

- application hosting: Railway
- database: Railway PostgreSQL

## Prerequisites

- GitHub repo connected to Railway
- Railway PostgreSQL service created
- environment variables configured

## Environment Variables

Set these in Railway:

```env
PORT=3000
DATABASE_URL=postgresql://...
JWT_SECRET=replace-with-a-strong-secret
JWT_REFRESH_SECRET=replace-with-a-strong-refresh-secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
SWAGGER_TITLE=Education Management API
SWAGGER_DESCRIPTION=Production-grade backend for education management SaaS
SWAGGER_VERSION=1.0.0
CORS_ORIGIN=https://your-frontend-domain.vercel.app
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@example.com
SMTP_PASS=your-app-password
SMTP_FROM_EMAIL=no-reply@yourdomain.com
SMTP_FROM_NAME=EduFlow
WHATSAPP_CALLMEBOT_API_KEY=your-key
```

## Railway Service Settings

Recommended build command:

```bash
npm install && npm run prisma:generate && npm run build
```

Recommended start command:

```bash
npm run prisma:migrate:deploy && npm run start:prod
```

## First-Time Setup

After the first successful deploy, open the Railway shell and run:

```bash
npm run prisma:seed
```

## Health Checks

Useful production endpoints:

- API health: `/v1/health`
- Swagger docs: `/docs`

Example:

- `https://your-backend.up.railway.app/v1/health`
- `https://your-backend.up.railway.app/docs`

## Notes

- the backend serves versioned routes under `/v1`
- set `CORS_ORIGIN` to your exact Vercel frontend domain in production
- use a production-ready PostgreSQL URL from Railway, not the local default from `.env.example`
