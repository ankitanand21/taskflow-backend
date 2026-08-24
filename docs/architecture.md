# TaskFlow Architecture

TaskFlow uses a layered Node.js/TypeScript architecture with Express, Prisma/PostgreSQL, Redis/BullMQ and a separate worker.

## Components
- API: HTTP authentication, validation, authorization and business operations.
- PostgreSQL: source of truth for users, memberships, projects, tasks, assignments, comments and refresh tokens.
- Redis/BullMQ: asynchronous notification queue.
- Worker: processes assignment email jobs outside the API process.

## Multi-tenancy
The authenticated user's organization membership is loaded server-side. Every project/task query is constrained by the authenticated organization. Client-provided organization IDs are ignored.

## Consistency strategy
The assignment is written to PostgreSQL before the queue job is exposed to the caller. The API then enqueues the BullMQ job and records its ID. If enqueueing or job-record creation fails, the API removes the queued job when possible and compensates by deleting the assignment before returning an error. This avoids reporting a successful assignment when notification enqueueing did not complete. A production-scale version could use a transactional outbox for stronger database/queue durability.

## Database deletion strategy
Organization deletion cascades memberships. Project deletion is restricted at the database level; the API implements soft deletion using `deletedAt`. Task deletion cascades assignments/comments and the API soft-deletes tasks.

## Index strategy
Indexes cover organization/project lookup, project creation listing, task status/priority filters, due-date filtering, assignment user lookup, comments by task/time and refresh-token lookup.
