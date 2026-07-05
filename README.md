# GameTribe

Badminton tournament manager with cross-device sync using Supabase.

## Tech

- React + Vite
- Supabase (`public.tournaments` table)
- Netlify deployment

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Configure env vars in `.env.local`:

```bash
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
# optional fallback name:
# VITE_SUPABASE_ANON_KEY=your-anon-key
```

3. Start dev server:

```bash
npm run dev
```

## Supabase Setup

Run the schema in Supabase SQL Editor:

- [supabase/gametribe_tournaments.sql](supabase/gametribe_tournaments.sql)

This creates relational tables:

- `public.tournaments`
- `public.tournament_teams`
- `public.tournament_matches`
- `public.tournament_team_requests`
- `public.tournament_group_assignments`

Plus RLS policies, indexes, and updated_at triggers for production usage.

## Netlify Deployment

1. Push repo to GitHub.
2. In Netlify: Add new site from Git.
3. Build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. Add environment variables in Netlify Site Settings:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY` (or `VITE_SUPABASE_ANON_KEY`)
5. Deploy.

`netlify.toml` is already included with the correct build and publish config.

## Notes

- Local cache is still used for instant load (`localStorage`), but Supabase is the source of truth.
- If Supabase env vars are missing, the app runs in local-only mode.

## Troubleshooting

If you see:

`Could not find the table 'public.tournaments' in the schema cache`

1. Open Supabase SQL Editor.
2. Run [supabase/gametribe_tournaments.sql](supabase/gametribe_tournaments.sql).
3. Retry the app.

If schema cache still lags, run:

```sql
select pg_notify('pgrst', 'reload schema');
```
