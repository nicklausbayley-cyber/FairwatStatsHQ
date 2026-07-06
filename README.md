# Fairway Stats HQ

Fairway Stats HQ is a multi-team golf performance dashboard for high school programs. It starts with team-scoped data, Supabase authentication, protected App Router pages, and a clean dashboard shell for coaches and players.

## Stack

- Next.js App Router with TypeScript
- Supabase Auth and Postgres with row level security
- Tailwind CSS
- Recharts
- Lucide icons

## Local Setup

1. Install dependencies:

```bash
pnpm install
```

2. Copy environment values:

```bash
cp .env.example .env.local
```

3. Add your Supabase project URL and publishable key to `.env.local`.

4. Run the database migration in `supabase/migrations/202607060001_initial_schema.sql`.

5. Start the app:

```bash
pnpm dev
```

## Multi-Team Data Model

Every product table that stores team data includes `team_id`. Supabase RLS policies restrict reads and writes to the signed-in user's assigned team, resolved through `public.profiles.team_id`. Admin and coach roles can manage team records; players can read their team context and submit rounds.

Initial team and profile creation should be handled by a trusted server-side process or the Supabase dashboard so the first admin profile exists before team members sign in.
