# Backend Deployment Guide

This backend is prepared for deployment to Render with PostgreSQL.

## Current Frontend Deployment

The frontend is already live on Vercel:

- `https://education-management-frontend.vercel.app`

Use this domain for backend CORS:

```env
CORS_ORIGIN=https://education-management-frontend.vercel.app
```

## Recommended Target

- backend hosting: Render Web Service
- database: Render PostgreSQL

## Render Blueprint

This repository now includes:

- [`render.yaml`](/home/usman/Desktop/project/education-management-backend/render.yaml)

That file defines:

- one Node.js web service
- one Render PostgreSQL database
- database connection wiring
- generated JWT secrets
- build, migration, and start commands

## How To Deploy On Render

### 1. Open Render

Go to:

- `https://render.com/`

### 2. Create a New Blueprint Service

In Render:

1. click `New`
2. choose `Blueprint`
3. connect GitHub if needed
4. select repo:
   `UsmanTariq02/education-management-backend`
5. Render should detect `render.yaml`

### 3. Review The Resources

Render should create:

- web service: `education-management-backend`
- postgres database: `education-management-postgres`

### 4. Set Secret Environment Variables

The following values are marked `sync: false` in the Blueprint and should be set manually in Render if you need those integrations:

- `SMTP_HOST`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM_EMAIL`
- `WHATSAPP_CALLMEBOT_API_KEY`

These values are already defined in the Blueprint:

- `PORT`
- `NODE_ENV`
- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `JWT_EXPIRES_IN`
- `JWT_REFRESH_EXPIRES_IN`
- `SWAGGER_TITLE`
- `SWAGGER_DESCRIPTION`
- `SWAGGER_VERSION`
- `CORS_ORIGIN`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_FROM_NAME`

### 5. Deploy

Render will run:

Build:

```bash
npm install && npm run prisma:generate && npm run build
```

Pre-deploy migration:

```bash
npm run prisma:migrate:deploy
```

Start:

```bash
npm run start:prod
```

### 6. Seed The Database Once

After the first successful deploy, open the Render Shell for the backend service and run:

```bash
npm run prisma:seed
```

## Production URLs

After deployment, your backend URL will look like:

- `https://education-management-backend.onrender.com`

Useful endpoints:

- health: `https://your-backend.onrender.com/v1/health`
- swagger: `https://your-backend.onrender.com/docs`

## Important Notes

- the backend serves API routes under `/v1`
- the frontend must use the backend URL with `/v1`
- after Render gives you the final backend URL, update the Vercel frontend env:

```env
NEXT_PUBLIC_API_BASE_URL=https://your-backend.onrender.com/v1
```

Then redeploy the frontend in Vercel.

## Render-Specific Notes

- cold starts may occur on lower plans
- database migrations are handled by `preDeployCommand`
- seeding is still a manual one-time step unless you later automate it separately

## If You Want Full Auto-Provisioning

The cleanest path now is:

1. create the Blueprint on Render from `render.yaml`
2. wait for deploy completion
3. run `npm run prisma:seed` in Render Shell
4. copy the Render backend URL
5. update Vercel `NEXT_PUBLIC_API_BASE_URL`
6. redeploy frontend
