-- ============================================================
-- Nostos — database schema (Supabase / Postgres)
-- Run once in the Supabase SQL Editor. Safe to re-run: it drops
-- and recreates the app tables (project starts empty).
-- ============================================================

drop table if exists public.messages cascade;
drop table if exists public.matches cascade;
drop table if exists public.swipes cascade;
drop table if exists public.reports cascade;
drop table if exists public.blocks cascade;
drop table if exists public.waitlist cascade;
drop table if exists public.profiles cascade;

-- ---------- profiles ----------
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete cascade, -- null for sample profiles
  display_name text not null,
  age int check (age between 18 and 99),
  job text,
  city text not null,
  area text,
  budget int,
  langs text[] default '{}',
  line text,
  sleep smallint, clean smallint, guests smallint, smoke smallint,
  pets smallint, food smallint, work smallint,
  breakers text[] default '{}',
  verified boolean not null default false,
  verification_status text not null default 'unsubmitted'
    check (verification_status in ('unsubmitted','pending','approved','rejected')),
  is_sample boolean not null default false,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- swipes ----------
create table public.swipes (
  id bigint generated always as identity primary key,
  swiper uuid not null references public.profiles(id) on delete cascade,
  target uuid not null references public.profiles(id) on delete cascade,
  direction text not null check (direction in ('like','pass')),
  created_at timestamptz not null default now(),
  unique (swiper, target)
);

-- ---------- matches (mutual likes) ----------
create table public.matches (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles(id) on delete cascade,
  user_b uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_a, user_b),
  check (user_a < user_b)
);

-- ---------- messages ----------
create table public.messages (
  id bigint generated always as identity primary key,
  match_id uuid not null references public.matches(id) on delete cascade,
  sender uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) <= 2000),
  created_at timestamptz not null default now()
);
create index messages_match_idx on public.messages (match_id, created_at);

-- ---------- waitlist / reports / blocks ----------
create table public.waitlist (
  id bigint generated always as identity primary key,
  city text not null,
  email text not null,
  created_at timestamptz not null default now()
);
create table public.reports (
  id bigint generated always as identity primary key,
  reporter uuid not null references public.profiles(id) on delete cascade,
  reported uuid not null references public.profiles(id) on delete cascade,
  reason text,
  created_at timestamptz not null default now()
);
create table public.blocks (
  blocker uuid not null references public.profiles(id) on delete cascade,
  blocked uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked)
);

-- ---------- auto-match trigger: a reciprocal like creates the match ----------
create or replace function public.handle_reciprocal_like()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.direction = 'like' and exists (
    select 1 from public.swipes s
    where s.swiper = new.target and s.target = new.swiper and s.direction = 'like'
  ) then
    insert into public.matches (user_a, user_b)
    values (least(new.swiper, new.target), greatest(new.swiper, new.target))
    on conflict do nothing;
  end if;
  return new;
end $$;
create trigger trg_reciprocal_like
  after insert on public.swipes
  for each row execute function public.handle_reciprocal_like();

-- ---------- admin helper (avoids RLS recursion) ----------
create or replace function public.is_admin()
returns boolean language sql security definer set search_path = public as $$
  select exists (select 1 from public.profiles
                 where user_id = auth.uid() and is_admin);
$$;

-- ---------- row level security ----------
alter table public.profiles enable row level security;
alter table public.swipes   enable row level security;
alter table public.matches  enable row level security;
alter table public.messages enable row level security;
alter table public.waitlist enable row level security;
alter table public.reports  enable row level security;
alter table public.blocks   enable row level security;

create policy "profiles readable by signed-in users"
  on public.profiles for select to authenticated using (true);
create policy "insert own profile"
  on public.profiles for insert to authenticated with check (user_id = auth.uid());
create policy "update own profile or admin"
  on public.profiles for update to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

create policy "own swipes"
  on public.swipes for all to authenticated
  using (swiper in (select id from public.profiles where user_id = auth.uid()))
  with check (swiper in (select id from public.profiles where user_id = auth.uid()));

create policy "parties see their matches"
  on public.matches for select to authenticated
  using (user_a in (select id from public.profiles where user_id = auth.uid())
      or user_b in (select id from public.profiles where user_id = auth.uid()));

create policy "parties read messages"
  on public.messages for select to authenticated
  using (match_id in (select id from public.matches
                      where user_a in (select id from public.profiles where user_id = auth.uid())
                         or user_b in (select id from public.profiles where user_id = auth.uid())));
create policy "parties send messages"
  on public.messages for insert to authenticated
  with check (sender in (select id from public.profiles where user_id = auth.uid())
    and match_id in (select id from public.matches
                      where user_a in (select id from public.profiles where user_id = auth.uid())
                         or user_b in (select id from public.profiles where user_id = auth.uid())));

create policy "anyone can join waitlist"
  on public.waitlist for insert to anon, authenticated with check (true);

create policy "insert own reports"
  on public.reports for insert to authenticated
  with check (reporter in (select id from public.profiles where user_id = auth.uid()));

-- Blocks: either party may READ a block row (so one block hides BOTH
-- sides' decks and matches in the app); only the blocker may write/delete.
-- LIVE-DB NOTE (Nov 2026): if this project is already running, do NOT
-- re-run this whole file (it drops every table). Apply only this delta:
--   drop policy "own blocks" on public.blocks;
--   then run the three create policy statements below.
create policy "parties read blocks"
  on public.blocks for select to authenticated
  using (blocker in (select id from public.profiles where user_id = auth.uid())
      or blocked in (select id from public.profiles where user_id = auth.uid()));
create policy "insert own blocks"
  on public.blocks for insert to authenticated
  with check (blocker in (select id from public.profiles where user_id = auth.uid()));
create policy "delete own blocks"
  on public.blocks for delete to authenticated
  using (blocker in (select id from public.profiles where user_id = auth.uid()));

-- ---------- ID document storage (private bucket) ----------
insert into storage.buckets (id, name, public)
values ('id-docs', 'id-docs', false)
on conflict (id) do nothing;

create policy "upload own ID doc"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'id-docs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "read own ID doc"
  on storage.objects for select to authenticated
  using (bucket_id = 'id-docs' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

-- ---------- realtime chat ----------
alter publication supabase_realtime add table public.messages;

-- ---------- sample profiles (clearly flagged; shown until real users arrive) ----------
insert into public.profiles
  (display_name, age, job, city, area, budget, langs, line, sleep, clean, guests, smoke, pets, food, work, verified, verification_status, is_sample) values
  ('Ananya',26,'Product designer','bengaluru','Koramangala',18000,'{English,Hindi,Kannada}','Calm 2BHK near 80 Feet Road. I cook, I clean, and I water plants that are not mine.',1,0,1,0,1,0,0,true,'approved',true),
  ('Rohan',28,'Backend engineer','bengaluru','HSR Layout',16000,'{English,Hindi}','Night owl, gamer, biryani enthusiast. Weekends get loud; weekdays do not exist before noon.',3,2,2,1,1,3,1,true,'approved',true),
  ('Priya',25,'CA trainee','bengaluru','Koramangala',15000,'{English,Hindi,Tamil}','Up at 5:30 to study. Quiet house, early nights, everything in its place by Sunday.',0,1,0,0,2,0,2,true,'approved',true),
  ('Maya',27,'Grad student, Columbia','newyork','Astoria',1450,'{English,Spanish}','Thesis hermit on weekdays, brunch enthusiast on Sundays. Looking for a calm, kind home base.',1,0,1,0,1,4,3,true,'approved',true),
  ('Jordan',29,'ER nurse','newyork','Jersey City',1600,'{English}','Hospital shifts mean I sleep early and value quiet like rent money. Rent is always on the 1st.',0,0,0,0,2,3,2,true,'approved',true),
  ('Sofia',26,'Chef','newyork','Bushwick',1350,'{English,Spanish,Italian}','Kitchen hours, so my midnight is your noon. Trade-off: you will eat extremely well.',3,1,2,1,1,3,2,true,'approved',true),
  ('Tom',28,'School teacher','london','Hackney',1050,'{English}','Marking books at the kitchen table, pub quiz on Thursdays. Easy-going, pays on time, owns a hoover and uses it.',1,1,1,0,1,4,2,true,'approved',true),
  ('Zara',25,'PhD researcher','london','Stratford',950,'{English,Urdu,Hindi}','Lab by day, novels by night. I keep a spotless kitchen and a very full bookshelf.',2,0,0,0,2,0,0,true,'approved',true),
  ('Lena',26,'Architect','berlin','Neukölln',780,'{German,English}','Studio flat hunting with one more person. Plants, bicycles, and a firm no-shoes rule at the door.',1,0,1,0,1,1,1,true,'approved',true),
  ('Felix',30,'Software developer','berlin','Friedrichshain',900,'{German,English}','Club-adjacent lifestyle, home by 4 AM, asleep till noon. Has a cat named Kernel who judges everyone equally.',3,2,2,2,0,3,0,false,'unsubmitted',true);
