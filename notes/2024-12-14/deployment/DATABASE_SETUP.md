# Database Setup Guide

This guide will help you set up the database for Reading Buddy.

## Overview

Reading Buddy uses **self-hosted PostgreSQL** for all data storage. The database schema includes:

- **20 tables** covering users, books, classes, quizzes, checkpoints, badges, login broadcasts, and weekly challenges
- **Row-level security** for secure multi-role access
- **20+ indexes** for optimal performance (including gamification and challenge indexes)
- **Triggers and functions** for automation (including auto-update timestamps)
- **6 default badges** for gamification
- **Full gamification system** with XP, levels, streaks, reading stats, and weekly challenges

## Prerequisites

- Docker and Docker Compose installed
- A running PostgreSQL container (see `docker-compose.selfhosted.yml`)

## Setup Instructions

### Step 1: Start PostgreSQL Container

If using the self-hosted Docker Compose setup:

```bash
docker-compose -f docker-compose.selfhosted.yml up -d postgres
```

This will start:
- PostgreSQL on port 5432 (mapped to host as needed)
- Database: `reading_buddy`
- User: `reading_buddy`

### Step 2: Run the Database Setup Script

1. Locate the database setup script in `sql/self-hosted/` or `sql/migrations/`
2. Apply the migrations to your PostgreSQL database:

```bash
# From project root
docker exec -i reading-buddy-postgres psql -U reading_buddy -d reading_buddy < sql/self-hosted/schema.sql
```

Or run individual migrations:

```bash
# Apply all migrations
for file in sql/migrations/*.sql; do
  docker exec -i reading-buddy-postgres psql -U reading_buddy -d reading_buddy < "$file"
done
```

### Step 3: Verify the Setup

1. Connect to the database:
```bash
docker exec -it reading-buddy-postgres psql -U reading_buddy -d reading_buddy
```

2. List tables:
```sql
\dt
```

You should see all tables:
- `profiles`
- `books`
- `book_access`
- `classes`
- `class_students`
- `class_books`
- `book_render_jobs`
- `student_books`
- `quizzes`
- `quiz_attempts`
- `achievements`
- `student_achievements`
- `quiz_checkpoints`
- `student_checkpoint_progress`
- `badges`
- `student_badges`
- `login_broadcasts`
- `weekly_challenge_completions`
- And more...

3. Check badges:
```sql
SELECT * FROM badges;
```

You should see 6 default badges.

### Step 4: Configure Environment Variables

Edit your `.env` file with database credentials:

```env
# Database (Self-hosted PostgreSQL)
DB_HOST=postgres
DB_PORT=5432
DB_NAME=reading_buddy
DB_USER=reading_buddy
DB_PASSWORD=your-secure-password

# Or use DATABASE_URL
DATABASE_URL=postgresql://reading_buddy:password@postgres:5432/reading_buddy
```

## Database Schema Overview

### Core Tables

| Table | Description |
|-------|-------------|
| `profiles` | User profiles with roles (STUDENT, TEACHER, LIBRARIAN, ADMIN) |
| `books` | Book metadata and file URLs |
| `book_access` | Access level controls per book |
| `classes` | Teacher classrooms |
| `class_students` | Student enrollment in classes |
| `class_books` | Book assignments to classes |

### Reading & Progress

| Table | Description |
|-------|-------------|
| `student_books` | Student reading progress (current page, completion) |
| `book_render_jobs` | PDF to image rendering jobs |

### Quizzes & Checkpoints

| Table | Description |
|-------|-------------|
| `quizzes` | Quiz definitions (classroom and checkpoint types) |
| `quiz_attempts` | Student quiz submissions and scores |
| `quiz_checkpoints` | Checkpoint definitions in books |
| `student_checkpoint_progress` | Student checkpoint completion tracking |

### Gamification

| Table | Description |
|-------|-------------|
| `badges` | Badge definitions |
| `student_badges` | Badges earned by students |
| `achievements` | Legacy achievement definitions |
| `student_achievements` | Legacy student achievements |
| `xp_transactions` | XP earning history and audit log |
| `weekly_challenge_completions` | Tracks completed weekly challenges and XP awards |

## Authentication

Reading Buddy uses NextAuth for authentication with PostgreSQL as the session store. See `SELF_HOSTED_NEXTAUTH_PLAN.md` for details.

## Row Level Security

The database can use RLS policies for secure access control. Key policies:

- **Students:** Can view their own progress, take quizzes, earn badges
- **Teachers:** Can view student progress, manage their classrooms
- **Librarians:** Can manage books, create quizzes, set up checkpoints
- **Admins:** Full access to all data and user management

## Creating Your First Admin User

After setup, you'll need at least one admin user:

1. **Sign up** through the app's signup page
2. Connect to the database:
```bash
docker exec -it reading-buddy-postgres psql -U reading_buddy -d reading_buddy
```
3. Update the user role:
```sql
UPDATE profiles SET role = 'ADMIN' WHERE email = 'your-email@example.com';
```

## Troubleshooting

### Connection refused

Make sure the PostgreSQL container is running:
```bash
docker ps | grep postgres
```

Check port mapping:
```bash
docker port reading-buddy-postgres
```

### Permission denied

Verify credentials in `.env` match the container's environment:
```bash
docker exec reading-buddy-postgres printenv | grep POSTGRES
```

### Table does not exist

Make sure you've run all migration scripts:
```bash
ls sql/migrations/
```

## Backup & Restore

### Backup

```bash
docker exec reading-buddy-postgres pg_dump -U reading_buddy reading_buddy > backup.sql
```

### Restore

```bash
docker exec -i reading-buddy-postgres psql -U reading_buddy reading_buddy < backup.sql
```

## Next Steps

After database setup:

1. ✅ Configure MinIO storage (see [DOCKER.md](DOCKER.md))
2. ✅ Set up AI provider (Gemini or local RAG)
3. ✅ Run the application locally or deploy with Docker
4. ✅ Create your first admin user
5. ✅ Start uploading books!

## Migration from Supabase

If you're migrating from Supabase to self-hosted PostgreSQL:

1. Export your Supabase data:
```bash
pg_dump "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres" > supabase-backup.sql
```

2. Import to local PostgreSQL:
```bash
docker exec -i reading-buddy-postgres psql -U reading_buddy reading_buddy < supabase-backup.sql
```

See `MIGRATION_INSTRUCTIONS.md` for more details.

---

**Version:** 2.0.0 (Self-hosted)
**Last Updated:** February 10, 2026
