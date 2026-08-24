# TaskFlow Backend

A production-oriented multi-tenant task management backend built with Node.js, TypeScript, Express, PostgreSQL, Prisma, Redis, BullMQ and Docker Compose.

## Features
- JWT access tokens (15 min) and database-backed refresh tokens (7 days)
- bcrypt password hashing (cost 12)
- Organization RBAC: `org_admin`, `member`
- Strict organization-level tenant isolation
- Project/task CRUD
- Task filters and offset pagination
- Task assignment/unassignment
- Async assignment email notifications with BullMQ
- 3 attempts with exponential backoff (1s, 2s, 4s)
- Job status endpoint
- Comments
- Zod validation and consistent errors
- Swagger UI
- Prisma migrations and seed data
- Docker Compose API + worker + PostgreSQL + Redis

## Run with Docker
1. Copy `.env.example` to `.env`.
2. Run `docker compose up --build`.
3. API: http://localhost:3000
4. Swagger: http://localhost:3000/docs
5. Health: http://localhost:3000/health

## Local development
Install Node.js 22+, PostgreSQL 16+ and Redis 7+.

```bash
npm install
cp .env.example .env
npx prisma generate
npx prisma migrate dev
npm run prisma:seed
npm run dev
```

In another terminal:
```bash
npm run worker
```

## Seed credentials
All five seeded users use password `Password123!`.
- user1@taskflow.dev (Acme admin)
- user2@taskflow.dev (Acme member)
- user3@taskflow.dev (Acme member)
- user4@taskflow.dev (Globex admin)
- user5@taskflow.dev (Globex member)

Change these credentials for any non-demo deployment.

## API
Authentication:
- POST `/auth/register`
- POST `/auth/login`
- POST `/auth/refresh`
- POST `/auth/logout`

Members (org admin):
- GET/POST `/members`
- PATCH/DELETE `/members/:userId`

Projects:
- GET/POST `/projects`
- GET/PATCH/DELETE `/projects/:id`
- GET `/projects/:id/dashboard`

Tasks:
- GET/POST `/projects/:projectId/tasks`
- GET/PATCH/DELETE `/tasks/:id`

Assignments:
- POST `/assignments/tasks/:taskId/assign`
- DELETE `/assignments/tasks/:taskId/assign/:userId`

Comments:
- GET/POST `/comments/tasks/:taskId/comments`

Jobs:
- GET `/jobs/:id`

## Testing
```bash
npm test
```

The test suite includes authentication, assignment validation, pagination helpers, CRUD/error paths and cross-tenant access scenarios. Configure a dedicated test database before running integration tests.

## Security notes
- Never commit `.env` or real secrets.
- Access tokens expire after 15 minutes.
- Refresh tokens are hashed in PostgreSQL and rotated on refresh.
- Authentication endpoints are rate-limited to 10 requests/minute/IP.
- Organization IDs are derived from authenticated membership rather than trusted from request bodies.

## Background job consistency strategy
Task assignment is written first. The API then enqueues the BullMQ notification and records the job ID. If enqueueing or job-record creation fails, the API attempts to remove the queued job and compensates by deleting the assignment before returning `503 NOTIFICATION_ENQUEUE_FAILED`. This is a compensating transaction strategy; Redis and PostgreSQL do not share a distributed transaction.

## Foreign-key decisions
- `org_members -> users/organizations`: CASCADE because membership is owned by both parent records.
- `projects -> organizations`: RESTRICT so an organization cannot be removed while projects exist.
- `tasks -> projects`: CASCADE because tasks are owned by a project.
- `task_assignments -> tasks/users`: CASCADE because assignments have no independent lifecycle.
- `comments -> tasks/users`: CASCADE because comments belong to their task/author records.
