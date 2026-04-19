# Backend Setup

Copy `backend/.env.example` to `backend/.env` and fill in your local secrets before starting the API.

## Database migrations

Create a new migration after model changes:

```bash
alembic revision --autogenerate -m "describe change"
```

Apply all pending migrations:

```bash
alembic upgrade head
```

If you already have an existing database that matches the current schema and want Alembic to start tracking it without recreating tables, stamp it first:

```bash
alembic stamp head
```
