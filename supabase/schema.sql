-- ============================================================
-- F1Base - Supabase SQL Schema
-- Run this in Supabase SQL Editor
-- ============================================================

create extension if not exists "uuid-ossp";

-- TABLES

create table if not exists user_roles (
  user_id uuid references auth.users(id) on delete cascade primary key,
  role text not null default 'user' check (role in ('admin', 'user'))
);

create table if not exists drivers (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  code char(3),
  nationality text,
  dob date,
  image_url text,
  flag_url text,
  hero_image_url text,
  is_active boolean default false,
  created_at timestamptz default now()
);

create table if not exists teams (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  ergast_id text unique,
  nationality text,
  base text,
  logo_url text,
  car_image text,
  flag_url text,
  is_active boolean default false,
  created_at timestamptz default now()
);

create table if not exists circuits (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  location text,
  country text,
  layout_image text,
  created_at timestamptz default now()
);

create table if not exists seasons (
  id uuid primary key default uuid_generate_v4(),
  year integer not null unique
);

create table if not exists races (
  id uuid primary key default uuid_generate_v4(),
  season_id uuid references seasons(id) on delete cascade,
  circuit_id uuid references circuits(id) on delete set null,
  name text not null,
  date date,
  round integer,
  openf1_session_key integer,
  created_at timestamptz default now(),
  unique (season_id, round)
);

create table if not exists results (
  id uuid primary key default uuid_generate_v4(),
  race_id uuid references races(id) on delete cascade,
  driver_id uuid references drivers(id) on delete cascade,
  team_id uuid references teams(id) on delete set null,
  position integer,
  grid integer,
  laps integer,
  time text,
  points numeric(5,2) default 0,
  status text default 'Finished',
  unique (race_id, driver_id)
);

create table if not exists qualifying_results (
  id uuid primary key default uuid_generate_v4(),
  race_id uuid references races(id) on delete cascade,
  driver_id uuid references drivers(id) on delete cascade,
  team_id uuid references teams(id) on delete set null,
  position integer,
  q1 text,
  q2 text,
  q3 text,
  unique (race_id, driver_id)
);

create table if not exists driver_standings (
  id uuid primary key default uuid_generate_v4(),
  season_id uuid references seasons(id) on delete cascade,
  driver_id uuid references drivers(id) on delete cascade,
  team_id uuid references teams(id) on delete set null,
  points numeric(6,2) default 0,
  position integer,
  wins integer default 0,
  unique (season_id, driver_id)
);

create table if not exists constructor_standings (
  id uuid primary key default uuid_generate_v4(),
  season_id uuid references seasons(id) on delete cascade,
  team_id uuid references teams(id) on delete cascade,
  points numeric(6,2) default 0,
  position integer,
  wins integer default 0,
  unique (season_id, team_id)
);

create table if not exists sprint_results (
  id uuid primary key default uuid_generate_v4(),
  race_id uuid references races(id) on delete cascade,
  driver_id uuid references drivers(id) on delete cascade,
  team_id uuid references teams(id) on delete set null,
  position integer,
  grid integer,
  laps integer,
  time text,
  points numeric(5,2) default 0,
  status text default 'Finished',
  unique (race_id, driver_id)
);

create table if not exists race_highlights (
  id uuid primary key default uuid_generate_v4(),
  race_id uuid references races(id) on delete cascade,
  title text,
  youtube_url text not null,
  created_at timestamptz default now()
);

create index if not exists idx_highlights_race on race_highlights(race_id);

alter table race_highlights enable row level security;
create policy "public_read_highlights" on race_highlights for select using (true);
create policy "admin_write_highlights" on race_highlights for all using (is_admin());

create table if not exists laps (
  id uuid primary key default uuid_generate_v4(),
  race_id uuid references races(id) on delete cascade,
  driver_id uuid references drivers(id) on delete cascade,
  lap_number integer not null,
  position integer,
  lap_time text
);

create table if not exists pit_stops (
  id uuid primary key default uuid_generate_v4(),
  race_id uuid references races(id) on delete cascade,
  driver_id uuid references drivers(id) on delete cascade,
  lap integer,
  duration text
);

create table if not exists race_events (
  id uuid primary key default uuid_generate_v4(),
  race_id uuid references races(id) on delete cascade,
  lap integer,
  type text check (type in ('safety_car','yellow_flag','crash','overtake','vsc','red_flag')),
  description text
);

-- INDEXES

create index if not exists idx_results_race on results(race_id);
create index if not exists idx_results_driver on results(driver_id);
create index if not exists idx_laps_race_driver on laps(race_id, driver_id);
create index if not exists idx_pit_stops_race on pit_stops(race_id);
create index if not exists idx_race_events_race on race_events(race_id);
create index if not exists idx_races_season on races(season_id);
create index if not exists idx_races_date on races(date);

-- ROW LEVEL SECURITY

alter table user_roles enable row level security;
alter table drivers enable row level security;
alter table teams enable row level security;
alter table circuits enable row level security;
alter table seasons enable row level security;
alter table races enable row level security;
alter table results enable row level security;
alter table laps enable row level security;
alter table pit_stops enable row level security;
alter table race_events enable row level security;

create or replace function is_admin()
returns boolean as $$
  select exists (
    select 1 from user_roles where user_id = auth.uid() and role = 'admin'
  );
$$ language sql security definer;

-- Public read
create policy "public_read_drivers" on drivers for select using (true);
create policy "public_read_teams" on teams for select using (true);
create policy "public_read_circuits" on circuits for select using (true);
create policy "public_read_seasons" on seasons for select using (true);
create policy "public_read_races" on races for select using (true);
create policy "public_read_results" on results for select using (true);
create policy "public_read_laps" on laps for select using (true);
create policy "public_read_pit_stops" on pit_stops for select using (true);
create policy "public_read_race_events" on race_events for select using (true);

alter table qualifying_results enable row level security;
alter table driver_standings enable row level security;
alter table constructor_standings enable row level security;

create policy "public_read_qualifying" on qualifying_results for select using (true);
create policy "public_read_driver_standings" on driver_standings for select using (true);
create policy "public_read_constructor_standings" on constructor_standings for select using (true);

alter table sprint_results enable row level security;
create policy "public_read_sprint_results" on sprint_results for select using (true);
create policy "admin_write_sprint_results" on sprint_results for all using (is_admin());

-- Admin write
create policy "admin_write_drivers" on drivers for all using (is_admin());
create policy "admin_write_teams" on teams for all using (is_admin());
create policy "admin_write_circuits" on circuits for all using (is_admin());
create policy "admin_write_seasons" on seasons for all using (is_admin());
create policy "admin_write_races" on races for all using (is_admin());
create policy "admin_write_results" on results for all using (is_admin());
create policy "admin_write_qualifying" on qualifying_results for all using (is_admin());
create policy "admin_write_driver_standings" on driver_standings for all using (is_admin());
create policy "admin_write_constructor_standings" on constructor_standings for all using (is_admin());
create policy "admin_write_laps" on laps for all using (is_admin());
create policy "admin_write_pit_stops" on pit_stops for all using (is_admin());
create policy "admin_write_race_events" on race_events for all using (is_admin());

create policy "read_own_role" on user_roles for select using (user_id = auth.uid());
create policy "admin_manage_roles" on user_roles for all using (is_admin());

-- App settings (global UI config)
create table if not exists app_settings (
  key text primary key,
  value text
);
alter table app_settings enable row level security;
create policy "public_read_settings" on app_settings for select using (true);
create policy "admin_write_settings" on app_settings for all using (is_admin());

-- To make a user admin, run:
-- INSERT INTO user_roles (user_id, role) VALUES ('<user-uuid>', 'admin');
