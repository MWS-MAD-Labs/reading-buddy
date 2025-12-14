# Database Setup Guide

This guide will help you set up the Supabase database for Reading Buddy v1.0.0.

## Overview

Reading Buddy uses Supabase (PostgreSQL) for all data storage, authentication, and row-level security. The database schema includes:

- **20 tables** covering users, books, classes, quizzes, checkpoints, badges, login broadcasts, and weekly challenges
- **Complete RLS policies** for secure multi-role access
- **20+ indexes** for optimal performance (including gamification and challenge indexes)
- **Triggers and functions** for automation (including auto-update timestamps)
- **6 default badges** for gamification
- **Full gamification system** with XP, levels, streaks, reading stats, and weekly challenges

## Prerequisites

- A Supabase account (free tier is sufficient for testing)
- Access to the Supabase SQL Editor

## Setup Instructions

### Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign in or create an account
3. Click **"New Project"**
4. Fill in the project details:
   - **Name:** `reading-buddy` (or your preferred name)
   - **Database Password:** Choose a strong password (save this!)
   - **Region:** Select the region closest to your users
   - **Pricing Plan:** Free tier is fine for development
5. Click **"Create new project"**
6. Wait for the project to finish initializing (2-3 minutes)

### Step 2: Run the Database Setup Script

1. In your Supabase dashboard, navigate to **SQL Editor** (left sidebar)
2. Click **"New Query"**
3. Open the file `database-setup.sql` from this repository
4. Copy the **entire contents** of the file
5. Paste it into the Supabase SQL Editor
6. Click **"Run"** (or press `Ctrl+Enter` / `Cmd+Enter`)
7. Wait for the script to complete (should take 5-10 seconds)

You should see a success message similar to:

```
=================================================
Reading Buddy Database Setup Complete!
Version: 1.0.0
=================================================
Created:
  - 2 ENUMs (user_role, book_access_level)
  - 18 Tables (with all v1.0.0 features)
- 15+ Indexes for performance
- 3 Functions (user creation, email lookup, timestamp updates)
- 3 Triggers
- Complete RLS policies
- 6 Default badges
=================================================
```

### Step 3: Verify the Setup

1. Go to **Table Editor** in the left sidebar
2. You should see all 20 tables:
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
   - `login_broadcasts` (admin-controlled announcement messages shown on the login page)
   - `weekly_challenge_completions` (tracks completed weekly challenges and XP awards)

3. Click on the **`badges`** table
4. You should see 6 default badges already inserted:
   - Checkpoint Champion
   - Quiz Master
   - Perfect Score
   - Book Finisher
   - Reading Streak
   - First Book

### Step 4: Get Your API Keys

1. Go to **Settings** → **API** in the left sidebar
2. Copy the following values (you'll need them for your `.env` file):
   - **Project URL** → This is your `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → This is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** (click "Reveal" to show) → This is your `SUPABASE_SERVICE_ROLE_KEY`

⚠️ **Important:** Keep your `service_role` key secret! Never commit it to git or expose it to the client.

### Step 5: Configure Environment Variables

1. In your project root, copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your Supabase credentials:
   ```env
   # Supabase (Public)
   NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key-here"
   
   # Supabase (Private)
   SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here"
   ```

3. Add your other credentials (MinIO, Gemini API) as documented in `.env.example`

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

#### Profiles Table - Gamification Columns

The `profiles` table includes the following gamification fields:

- **`xp`** - Total experience points earned
- **`level`** - Current reader level (calculated from XP)
- **`reading_streak`** - Current consecutive days reading
- **`longest_streak`** - Longest consecutive days reading ever
- **`last_read_date`** - Last date user read any content
- **`total_books_completed`** - Lifetime count of completed books
- **`total_pages_read`** - Lifetime count of pages read
- **`total_quizzes_completed`** - Lifetime count of quizzes completed
- **`total_perfect_quizzes`** - Lifetime count of perfect quiz scores
- **`books_completed`** - Books completed (duplicate tracking field)
- **`pages_read`** - Pages read (duplicate tracking field)

#### Weekly Challenges System

The weekly challenges system motivates students with rotating weekly goals:

- **6 Challenge Types**: Page reading, book completion, quiz completion, reading streaks, and perfect quiz scores
- **Automatic Rotation**: Challenges rotate every week based on the week number
- **XP Rewards**: 200-300 XP bonus for completing weekly challenges
- **No Duplication**: Once a student completes a challenge for a given week, they cannot earn the reward again
- **Auto-Award**: XP is automatically awarded when the challenge is completed and the student views their dashboard

Challenge types:
1. **Page Turner** - Read 100 pages (200 XP)
2. **Avid Reader** - Read 150 pages (300 XP)
3. **Book Worm** - Complete 2 books (250 XP)
4. **Quiz Master** - Complete 5 quizzes (200 XP)
5. **Week Warrior** - Read every day for 7 days (300 XP)
6. **Perfect Scholar** - Get 3 perfect quiz scores (250 XP)

## Authentication Setup

### Enable Google OAuth (Optional)

If you want to allow users to sign in with Google:

1. Go to **Authentication** → **Providers** in Supabase
2. Find **Google** in the list
3. Toggle it **ON**
4. Follow the instructions to create OAuth credentials in Google Cloud Console
5. Add your Google Client ID and Client Secret to Supabase

### Email Authentication

Email/password authentication is enabled by default. Users can sign up and log in with email.

## Row Level Security (RLS)

The database setup script automatically configures RLS policies for all tables. Here's a summary:

### Role-Based Access

- **Students:** Can view their own progress, take quizzes, earn badges
- **Teachers:** Can view student progress, manage their classrooms
- **Librarians:** Can manage books, create quizzes, set up checkpoints
- **Admins:** Full access to all data and user management

### Key Policies

- Users can only view/edit their own profile
- Students can only view/update their own reading progress
- Books are viewable by all authenticated users
- Only librarians and admins can create/edit books
- Teachers can view progress of students in their classes

## Creating Your First Admin User

After setup, you'll need at least one admin user:

1. **Sign up** through the app's signup page
2. Go to Supabase **Table Editor** → **profiles**
3. Find your user profile
4. Edit the `role` field from `STUDENT` to `ADMIN`
5. Click **Save**

Now you can access the admin panel and create other users with different roles.

## Troubleshooting

### "Function does not exist" errors

If you see errors about missing functions, make sure you ran the **entire** `database-setup.sql` script. Try running it again.

### "Permission denied" errors

Check that RLS policies are enabled. Go to **Table Editor**, click on a table, then **"Policies"** to verify RLS is enabled and policies exist.

### No data appearing

Make sure you're using the correct API keys in your `.env` file. The `anon` key is for public client access, while the `service_role` key is for server-side admin operations.

### Google OAuth users showing no name in admin dashboard

**Issue:** Users who sign up with Google OAuth don't have their name populated in the admin dashboard.

**Cause:** The `handle_new_user()` trigger function in older versions didn't capture the name from OAuth metadata.

**Solution:**

1. **For new installations:** The `database-setup.sql` script includes the fixed function. No action needed.

2. **For existing installations:** Run the fix script to backfill names for existing OAuth users:
   - Go to Supabase **SQL Editor**
   - Run the `fix-oauth-names.sql` script
   - This will update all profiles with missing names using their OAuth data
   
3. **Manual update:** Alternatively, update individual profiles:
   ```sql
   UPDATE profiles
   SET full_name = 'User Name'
   WHERE id = 'user-uuid-here';
   ```

**Future signups:** After running the database setup or fix script, all new Google OAuth signups will automatically have their name populated.

### Cannot update user role to staff (TEACHER, LIBRARIAN, ADMIN)

**Issue:** Getting error `null value in column "access_level" violates not-null constraint` when changing a user from STUDENT to staff role.

**Error message:**
```
code: '23502'
message: 'null value in column "access_level" of relation "profiles" violates not-null constraint'
```

**Cause:** The `access_level` column in your database has a NOT NULL constraint, but staff roles don't need access levels (only students do).

**Solution:**

1. **For new installations:** The `database-setup.sql` script includes `access_level` as nullable. No action needed.

2. **For existing installations:** Run the fix script:
   - Go to Supabase **SQL Editor**
   - Run the `fix-access-level-column.sql` script
   - This will:
     - Add the column if missing
     - Remove the NOT NULL constraint
     - Set NULL for all staff roles
   
3. **Verify the fix:**
   ```sql
   SELECT is_nullable 
   FROM information_schema.columns 
   WHERE table_name = 'profiles' AND column_name = 'access_level';
   -- Should return: YES
   ```

**Expected behavior after fix:**
- Students can have access_level (KINDERGARTEN, LOWER_ELEMENTARY, etc.)
- Staff roles (TEACHER, LIBRARIAN, ADMIN) will have access_level = NULL
- No more constraint errors when updating roles

### Student dashboard shows "No books in progress" even when reading

**Issue:** Students have started reading books, but the dashboard still shows "No books in progress yet. Once you start reading, your books will show up here."

**Error in logs (may not be visible to user):**
```
Failed to fetch student_books
Policy violation or RLS blocking access
```

**Cause:** The `student_books` table has RLS enabled but is missing the policies that allow students to read and write their own progress.

**Solution:**

1. **For new installations:** The `database-setup.sql` script now includes the policies. No action needed.

2. **For existing installations:** Run the fix script:
   - Go to Supabase **SQL Editor**
   - Run the `fix-student-books-rls.sql` script
   - This will add the missing policies:
     - Students can view their own progress
     - Students can insert/update their own progress
     - Teachers can view all student progress
   
3. **Verify the fix:**
   ```sql
   SELECT policyname, cmd 
   FROM pg_policies 
   WHERE tablename = 'student_books';
   -- Should return 4 policies
   ```

**Expected behavior after fix:**
- Students can see books they're currently reading on dashboard
- Reading progress saves correctly when turning pages
- Teachers can view student progress in their dashboards
- "Books in progress" section shows actual books being read

## Advanced Configuration

### Custom Badges

You can add custom badges by inserting into the `badges` table:

```sql
INSERT INTO badges (name, description, icon_url, badge_type, criteria)
VALUES (
  'Super Reader',
  'Read 10 books in a month',
  '/badges/super-reader.svg',
  'custom',
  '{"type": "books_completed", "count": 10, "timeframe": "month"}'::JSONB
);
```

### Backup Recommendations

1. Enable **Point-in-Time Recovery** in Supabase (paid plans)
2. Use `pg_dump` for manual backups:
   ```bash
   pg_dump "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" > backup.sql
   ```
3. Consider setting up automated backups via Supabase's backup features

## Next Steps

After database setup:

1. ✅ Configure MinIO storage (see [DOCKER.md](DOCKER.md))
2. ✅ Set up Google Gemini API key
3. ✅ Run the application locally or deploy with Docker
4. ✅ Create your first admin user
5. ✅ Start uploading books!

## Support

For issues with database setup:

- Check the [Supabase Documentation](https://supabase.com/docs)
- Review the [Project Roadmap](Project-Roadmap.md) for architecture details
- Open an issue on [GitHub](https://github.com/faisalnh/reading-companion/issues)

---

**Version:** 1.0.0  
**Last Updated:** November 19, 2025
