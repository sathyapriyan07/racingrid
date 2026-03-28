# F1Base 🏎️

An IMDb-style Formula 1 database with Race Archive and Replay system.

## Tech Stack

- **Frontend**: React (Vite) + TailwindCSS + Zustand + React Router
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Charts**: Recharts
- **Edge Functions**: Deno (Supabase Functions)

---

## Setup

### 1. Supabase Project

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run `supabase/schema.sql`
3. Copy your project URL and anon key

### 2. Environment Variables

```bash
cp .env.example .env
```

Fill in `.env`:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Install & Run

```bash
npm install
npm run dev
```

### 4. Create Admin User

1. Sign up via `/login` (Supabase Auth)
2. In Supabase SQL Editor, run:
```sql
INSERT INTO user_roles (user_id, role)
VALUES ('<your-user-uuid>', 'admin');
```
Find your UUID in **Authentication → Users**.

---

## Admin Panel (`/admin`)

### Import Data

Go to `/admin/import` to:
- Upload **JSON or CSV** files
- Paste raw API responses (Ergast, OpenF1, etc.)
- Select data type (Drivers, Teams, Circuits, Races, Results, Laps, Pit Stops, Events)
- Preview normalized data before saving
- Bulk upsert into Supabase

### Sample Data

Use files in `sample-data/` to test imports:
- `drivers.json` — 10 current F1 drivers
- `teams.json` — 10 current F1 teams
- `circuits.json` — 24 F1 circuits
- `results.json` — Sample race results

### Import Order

Follow this order to avoid FK constraint errors:
1. **Seasons** (add via Sync Tools or import `[{"year": 2024}]`)
2. **Circuits**
3. **Teams**
4. **Drivers**
5. **Races** (requires season + circuits)
6. **Results** (requires race + drivers + teams)
7. **Laps** (requires race + drivers)
8. **Pit Stops** (requires race + drivers)
9. **Race Events** (requires race)

### Sync Tools (`/admin/sync`)

Buttons to fetch from Ergast API server-side. Requires deploying the Edge Function:

```bash
npm install -g supabase
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy sync-ergast
```

---

## Pages

| Route | Description |
|-------|-------------|
| `/` | Homepage — latest races, drivers, seasons |
| `/drivers` | All drivers list |
| `/driver/:id` | Driver profile, career stats, charts |
| `/teams` | All teams list |
| `/team/:id` | Team profile, season stats |
| `/circuits` | All circuits |
| `/circuit/:id` | Circuit info, hosted races |
| `/races` | Races list with season filter |
| `/race/:id` | **Race page** — results, lap replay, pit stops, events |
| `/compare` | Head-to-head driver comparison |
| `/search?q=` | Global search |
| `/admin` | Admin dashboard |
| `/admin/import` | Data import tool |
| `/admin/sync` | API sync tools |

---

## Race Replay

The `/race/:id` page includes:
- **Results Table** — final positions, times, points
- **Lap Chart** — position changes per lap (Recharts line chart)
- **Replay Slider** — drag to any lap, positions update live
- **Pit Stop Timeline** — visual timeline of all stops
- **Events Feed** — safety cars, crashes, flags

---

## Database Schema

See `supabase/schema.sql` for full schema with:
- All 10 tables
- Indexes for performance
- Row Level Security (public read, admin write)
- `is_admin()` helper function
