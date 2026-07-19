# Fairway Stats HQ Deployment

## Production URLs

- Production app URL: https://app.fairwaystatshq.com
- Root marketing domain planned for later: https://fairwaystatshq.com

## Hosting And Services

- Hosting: Vercel
- Database/Auth/Storage: Supabase

## Environment Variables

Set these in Vercel project settings:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

`SUPABASE_SERVICE_ROLE_KEY` must only be used server-side. Do not expose it to client components, browser bundles, or public logs.

## Supabase Auth URL Settings

In Supabase Auth settings, configure:

- Site URL: https://app.fairwaystatshq.com

Redirect URLs:

```text
https://app.fairwaystatshq.com/**
https://fairwaystatshq.com/**
http://localhost:3000/**
```

## Domain Structure

- `app.fairwaystatshq.com` = app/dashboard
- `fairwaystatshq.com` = future marketing landing page

## Basic Deployment Flow

1. Push changes to `main` on GitHub.
2. Vercel deploys automatically from `main`.
3. Add or update environment variables in Vercel settings if needed.
4. Confirm Supabase Auth URL settings include the production app URL and redirect URLs.

## Future Team Onboarding Notes

For each new team:

1. Create a team record.
2. Create a Supabase Auth coach/admin user.
3. Insert a `profiles` row tied to the auth user and `team_id`.
4. Add roster, events, and courses.
