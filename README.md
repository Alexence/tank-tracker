# Tank Tracker — TypeScript + React + Supabase

Clean mobile-first aquarium management app.

## Included
- Add / edit / delete tanks
- Add / edit / delete water parameter logs
- Add / edit / delete water changes
- Tank search
- Latest parameter dashboard
- Responsive mobile + desktop UI
- GitHub Actions deployment to GitHub Pages

## Existing Supabase schema
This app matches the three tables supplied for the project: `tanks`, `tank_parameters`, and `water_changes`.

## GitHub Pages setup without a local console
1. Create a new GitHub repository and upload this project.
2. GitHub Settings → Secrets and variables → Actions.
3. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
4. GitHub Settings → Pages → Source: **GitHub Actions**.
5. The included workflow builds and deploys automatically whenever you update `main`.

Use the browser-safe publishable/anon key, never the Supabase service_role/secret key.

## Important database note
Your current schema does not include `user_id`, so this version treats the database as a single-user/private app. Before adding login or sharing the app with other people, add ownership fields and Row Level Security.
